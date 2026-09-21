"""Recorta as folhas de sprite do druida (Bases/*.png) em quadros PNG para a batalha.

Uso:
    python scripts/extract_druid_bases.py                 # regera os quadros
    python scripts/extract_druid_bases.py --preview DIR   # + tiras/GIFs de conferência em DIR

Requer: pip install pillow numpy scipy

Reaproveita a segmentação por "núcleo + propagação geodésica" e o render do guerreiro
(scripts/extract_warrior_bases.py): cada quadro sai num canvas único de 400x410 com o centro dos pés
em x=170 e a sola das botas em y=380 (HERO_SPRITE_CANVAS.druida em src/battleSprites.ts precisa bater),
então trocar de animação nunca muda o tamanho nem a posição do druida. O canvas é mais alto que o do
guerreiro porque o cajado erguido e o halo do orbe chegam a ~365 px acima do chão.

Diferenças em relação ao guerreiro:
  * As folhas do druida já vêm com alpha de verdade (nada de xadrez falso), mas com o corpo em
    alpha ~252 (não 255) e um "pó" de alpha 1..7 espalhado pelo fundo. `clean_alpha` normaliza os dois.
  * Botas marrons (o guerreiro tem botas vermelhas), então os marcos de pés usam outra cor.
  * Cada folha foi gerada numa escala diferente. `scale` de cada folha é medido a partir da altura
    do corpo (núcleo sólido) nos quadros em pé de cada uma, para o druida ter o mesmo tamanho em
    todas as animações.
  * Defesa.png NÃO é usada: veio com o corpo quase todo transparente (RGB zerado sob o alpha 0, não
    dá para recuperar). Ver docs/BATTLE_SPRITE_PROMPTS.md, seção do druida.
"""
import argparse
import io
import os
import sys
import time

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import extract_warrior_bases as W  # noqa: E402  (reaproveita segmentação, render e prévia)

DRUID_DIR = os.path.join(W.PROJECT_ROOT, 'public', 'assets', 'battle', 'sprites', 'heroes', 'druida')
BASES_DIR = os.path.join(DRUID_DIR, 'Bases')

# Altura do corpo (cabeça -> botas), em px finais, dos quadros em pé. O guerreiro agachado ocupa ~235 px
# do canvas dele na carta; o druida em pé usa um pouco menos, para parecerem do mesmo porte.
BODY_HEIGHT = 216
# Canvas (px finais): extensão a partir do centro dos pés / do chão. Medido com todos os quadros: à
# esquerda até 127, à direita até 338 (só o crescente do Crítico; a carta corta a partir de ~130) e acima
# até 363 (halo do orbe do Crítico 04).
LEFT, RIGHT, UP, DOWN = 170, 230, 380, 30
W.CANVAS_W, W.CANVAS_H = LEFT + RIGHT, UP + DOWN
W.ANCHOR_X, W.GROUND_Y = LEFT, UP
FEET_BAND = 40  # px da folha acima da sola que definem a largura dos pés (botas + barra do manto)

# layout = quadros por linha; min_core = área mínima do núcleo para contar como corpo (crescentes
# sólidos, orbes e detritos ficam abaixo disso e são distribuídos ao quadro certo por propagação);
# stand = quadros em pé usados para medir a escala da folha.
SHEETS = {
    'Descanso': dict(state='idle', layout=[6], min_core=40000, stand=[0, 5]),
    'Ataque': dict(state='attack', layout=[4, 4], min_core=30000, stand=[0, 7]),
    'Ataque_Critico': dict(state='heavy', layout=[9], min_core=20000, stand=[0, 8]),
    'Ultimate': dict(state='ultimate', layout=[3, 3, 3, 3], min_core=12000, stand=[0, 11]),
}

# Sobreposições da folha que a propagação por vizinhança não consegue separar. A ponta do cajado do
# quadro 2 do Crítico (agachado) invade o manto do quadro 3 e a propagação a entrega ao quadro 3 (um
# orbe "solto" aparece no ombro dele). `poly` é um polígono (em px da folha) ao redor da ponta: o que
# está dentro passa de `src` para `dst`, e o buraco deixado no manto de `src` é preenchido com o mesmo
# ponto do quadro `donor` (mesma pose, manto limpo), alinhado pelos pés.
FIXES = {
    'Ataque_Critico': [
        dict(src=3, dst=2, donor=4,
             poly=[(643, 492), (670, 505), (688, 521), (706, 520), (724, 524), (735, 530), (736, 542),
                   (732, 552), (720, 558), (708, 562), (696, 558), (686, 550), (680, 536), (668, 530), (643, 526)]),
    ],
}


def clean_alpha(rgba):
    """Corpo alpha 252 -> 255; pó de alpha < 8 -> 0. O brilho translúcido de verdade é preservado."""
    a = rgba[..., 3]
    a = np.where(a < 8, 0, np.where(a >= 245, 255, a)).astype(np.uint8)
    out = rgba.copy()
    out[..., 3] = a
    out[a == 0] = 0
    return out


def save_png(im, path, quantize=False):
    """Igual a W.save_png, mas grava os bytes com nova tentativa: no Windows o open() de PNGs recém-criados
    às vezes falha com Errno 22 enquanto o antivírus/IDE/servidor de dev varre o arquivo anterior."""
    if quantize:
        im = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    buf = io.BytesIO()
    im.save(buf, format='PNG', optimize=True)
    for attempt in range(10):
        try:
            with open(path, 'wb') as fh:
                fh.write(buf.getvalue())
            return
        except OSError:
            if attempt == 9:
                raise
            time.sleep(0.3)


def analyse(rgba, L, order, layout):
    """Marcos por quadro: bbox, solado das botas e centro dos pés."""
    alpha = rgba[..., 3]
    frames = []
    solid = alpha >= 250
    er = ndi.binary_erosion(solid, structure=np.ones((3, 3), bool), iterations=7)
    for i, k in enumerate(order):
        m = L == k
        ys, xs = np.where(m)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max(), ys.max()
        core = np.where(m & er)
        # corpo grosso (sem o cajado, fino): botas + barra do manto. O ponto mais baixo é o chão.
        body = ndi.binary_opening(m & solid, structure=W._disk(8))
        by, bx = np.where(body)
        bottom = int(by.max())
        band = body & (np.arange(body.shape[0])[:, None] >= bottom - FEET_BAND)
        fx = np.where(band)[1]
        frames.append(dict(idx=i, label=int(k), bbox=(int(x0), int(y0), int(x1), int(y1)),
                           bottom=bottom, core_h=int(core[0].max() - core[0].min()),
                           core_top=int(core[0].min()),
                           feet=(int(fx.min()), int(fx.max())) if len(fx) else None,
                           top_cut=False))
    pos = 0
    W_ = alpha.shape[1]
    for cnt in layout:
        row = frames[pos:pos + cnt]
        ground = float(np.median([f['bottom'] for f in row]))
        rels = []
        for c, f in enumerate(row):
            cell = (c + 0.5) * W_ / cnt
            ok = f['feet'] is not None and f['feet'][1] - f['feet'][0] >= 60
            f['ground'] = ground
            f['cx_ok'] = ok
            f['cell'] = cell
            f['cx'] = (f['feet'][0] + f['feet'][1]) / 2 if ok else None
            rels.append(f['cx'] - cell if ok else None)
        valid = [(c, v) for c, v in enumerate(rels) if v is not None]
        for c, f in enumerate(row):
            if f['cx'] is None:  # botas escondidas: interpola a posição relativa à célula entre vizinhos válidos
                left = [x for x in valid if x[0] < c]
                right = [x for x in valid if x[0] > c]
                if left and right:
                    (c0, v0), (c1, v1) = left[-1], right[0]
                    rel = v0 + (v1 - v0) * (c - c0) / (c1 - c0)
                else:
                    rel = (left or right)[-1 if left else 0][1]
                f['cx'] = f['cell'] + rel
        pos += cnt
    return frames


def sheet_scale(frames, stand):
    """Fator que leva a altura do corpo em pé desta folha a BODY_HEIGHT finais (dividido por OUT_K
    porque render_frame multiplica por OUT_K)."""
    h = float(np.mean([frames[i]['core_h'] for i in stand]))
    return BODY_HEIGHT / h / W.OUT_K, h


def bbox_of(L, label):
    ys, xs = np.where(L == label)
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def apply_fixes(rgba, L, order, frames, fixes):
    """Devolve {idx do quadro: (rgba, L, bbox)} só para os quadros que precisam de fonte própria."""
    from PIL import ImageDraw
    src_of = {}
    for fx in fixes:
        poly = Image.new('L', (rgba.shape[1], rgba.shape[0]), 0)
        ImageDraw.Draw(poly).polygon(fx['poly'], fill=255)
        inside = np.array(poly) > 0
        src, dst, donor = fx['src'], fx['dst'], fx['donor']
        tip = inside & (L == order[src]) & (rgba[..., 3] >= 8)
        # dst: recebe a ponta (sem tocar no resto da folha)
        L_dst = src_of.get(dst, (rgba, L, None))[1].copy()
        L_dst[tip] = order[dst]
        src_of[dst] = (rgba, L_dst, bbox_of(L_dst, order[dst]))
        # src: buraco preenchido com o quadro doador, alinhado pelos pés
        dx = int(round(frames[donor]['cx'] - frames[src]['cx']))
        dy = int(round(frames[donor]['ground'] - frames[src]['ground']))
        patched = src_of.get(src, (rgba, L, None))[0].copy()
        hole = ndi.binary_dilation(tip, structure=np.ones((3, 3), bool), iterations=1) & (L == order[src])
        ys, xs = np.where(hole)
        fixed = 0
        for y, x in zip(ys, xs):
            sy, sx = y + dy, x + dx
            if 0 <= sy < rgba.shape[0] and 0 <= sx < rgba.shape[1] and L[sy, sx] == order[donor] and rgba[sy, sx, 3] >= 250:
                patched[y, x] = rgba[sy, sx]
                fixed += 1
        Lsrc = src_of.get(src, (rgba, L, None))[1]
        src_of[src] = (patched, Lsrc, bbox_of(Lsrc, order[src]))
        print(f'  correção: {tip.sum()} px da ponta do quadro {src} -> {dst}; buraco {hole.sum()} px, {fixed} preenchidos com o quadro {donor}')
    return src_of


def process(names=None):
    summary = {}
    for name, cfg in SHEETS.items():
        print(f'Processando {name}.png -> {cfg["state"]} ...')
        rgba = clean_alpha(np.array(Image.open(os.path.join(BASES_DIR, name + '.png')).convert('RGBA')))
        L, order = W.segment(rgba[..., 3], cfg['layout'], min_core=cfg['min_core'])
        frames = analyse(rgba, L, order, cfg['layout'])
        own = apply_fixes(rgba, L, order, frames, FIXES.get(name, []))
        scale, h = sheet_scale(frames, cfg['stand'])
        print(f'  corpo em pé = {h:.0f}px na folha -> escala {scale:.3f}')
        for f in frames:
            print(f'   {f["idx"]:02d} cx={f["cx"]:.0f} ground={f["ground"]:.0f} feet={f["feet"]} ok={f["cx_ok"]}')
        out = []
        for f in frames:
            fr_rgba, fr_L, fr_bbox = own.get(f['idx'], (rgba, L, None))
            if fr_bbox:
                f['bbox'] = fr_bbox
            im = W.render_frame(fr_rgba, fr_L, f, scale)
            save_png(im, os.path.join(DRUID_DIR, f'{cfg["state"]}_{f["idx"]:02d}.png'), cfg['state'] == 'idle')
            out.append(im)
        summary[cfg['state']] = out
    return summary


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--preview', metavar='DIR', help='grava tiras/GIFs de conferência nesta pasta')
    args = ap.parse_args()
    summary = process()
    print('Canvas:', W.CANVAS_W, W.CANVAS_H, 'anchorX', W.ANCHOR_X, 'groundY', W.GROUND_Y)
    if args.preview:
        W.write_preview(summary, args.preview)
    print('Processamento completo com sucesso!')


if __name__ == '__main__':
    main()
