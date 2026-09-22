"""Recorta as folhas de sprite da Caçadora/Ladino (Bases/*.png) em quadros PNG para a batalha.

Uso:
    python scripts/extract_rogue_bases.py                  # regera os quadros
    python scripts/extract_rogue_bases.py --measure         # só mede a extensão necessária do canvas
    python scripts/extract_rogue_bases.py --preview DIR     # + tiras/GIFs de conferência em DIR

Requer: pip install pillow numpy scipy

Reaproveita a segmentação por "núcleo + propagação geodésica" e o render do guerreiro
(scripts/extract_warrior_bases.py), igual ao druida (scripts/extract_druid_bases.py). Diferenças
em relação às folhas do druida:
  * Os arquivos vieram em tamanhos "normalizados" diferentes do combinado no prompt (ex.: Ataque.png
    é 1774x887 com células de 443x443, não os 2048x1024/512x512 do Prompt_Ataque.txt) -- os layouts
    abaixo (colunas por linha) foram medidos direto nos arquivos entregues, não copiados do prompt.
  * Duas folhas têm vazamento real entre células (a IA não respeitou 100% "nenhuma parte pode invadir
    a célula vizinha"): Critico.png (adagas/rastros cruzando limites de coluna em várias linhas) e
    Ultimate.png (auras/afterimages cruzando limites de linha quase toda transição) -- é exatamente
    o problema que a segmentação por núcleo+propagação já resolve, sem precisar de recorte por grade.
  * O nome do arquivo de crítico é `Critico.png` (o prompt e o Prompt_Ataque_Critico.txt chamam de
    `Ataque_Critico.png`, mas o arquivo entregue tem o nome curto).
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

ROGUE_DIR = os.path.join(W.PROJECT_ROOT, 'public', 'assets', 'battle', 'sprites', 'heroes', 'cacadora')
BASES_DIR = os.path.join(ROGUE_DIR, 'Bases')

# Canvas e escala calibrados por medição direta dos quadros renderizados (--measure), não copiados
# de outro herói: a Caçadora é mais compacta que o guerreiro (sem arma de alcance) e mais baixa que
# o druida (sem cajado erguido nem halo de orbe). BODY_HEIGHT ~= mesma ordem de guerreiro/druida (198)
# para os três parecerem do mesmo porte lado a lado.
# LEFT/RIGHT/UP/DOWN medidos com `--measure` (extensão real de todos os quadros de todas as
# folhas, além de mais ~10px de folga): esquerda 175, direita 230, acima 233, abaixo 13.
BODY_HEIGHT = 200
LEFT, RIGHT, UP, DOWN = 185, 240, 245, 20
W.CANVAS_W, W.CANVAS_H = LEFT + RIGHT, UP + DOWN
W.ANCHOR_X, W.GROUND_Y = LEFT, UP
FEET_BAND = 40  # px da folha acima da sola que definem a largura dos pés (botas + barra do manto)

# layout = quadros por linha (medido nos arquivos entregues, ver docstring); min_core = área mínima
# do núcleo erodido pra contar como corpo -- ajustado por tentativa até "achou N, esperado N" bater;
# stand = quadros em pé usados pra medir a escala da folha (primeiro e último quadro de cada
# animação, que a descrição de cada Prompt_*.txt sempre volta pra guarda neutra).
SHEETS = {
    'Descanso': dict(state='idle', layout=[3, 3], min_core=28000, stand=[0, 5]),
    'Ataque': dict(state='attack', layout=[4, 4], min_core=20000, stand=[0, 7]),
    'Critico': dict(state='heavy', layout=[5, 5], min_core=12000, stand=[0, 9]),
    'Defesa': dict(state='defend', layout=[3, 3], min_core=28000, stand=[0, 5], own_ground=True),
    'Ultimate': dict(state='ultimate', layout=[3, 3, 3, 3], min_core=9000, stand=[0, 11]),
}

# Sobreposições da folha que a propagação por vizinhança não consegue separar (achadas rodando
# --measure/--preview e olhando a prévia). Mesma mecânica das FIXES do druida: um polígono (em px
# da folha) ao redor da parte que "vazou" pra um quadro vizinho -- o que está dentro passa de `src`
# para `dst`, e o buraco em `src` é preenchido com o quadro `donor` (mesma pose), alinhado pelos pés.
FIXES = {}


def clean_alpha(rgba):
    """Corpo em alpha 245+ -> 255; poeira de alpha < 8 -> 0 (mesmo tratamento do druida)."""
    a = rgba[..., 3]
    a = np.where(a < 8, 0, np.where(a >= 245, 255, a)).astype(np.uint8)
    out = rgba.copy()
    out[..., 3] = a
    out[a == 0] = 0
    return out


def save_png(im, path, quantize=False):
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


def analyse(rgba, L, order, layout, own_ground=False):
    alpha = rgba[..., 3]
    frames = []
    solid = alpha >= 250
    er = ndi.binary_erosion(solid, structure=np.ones((3, 3), bool), iterations=7)
    for i, k in enumerate(order):
        m = L == k
        ys, xs = np.where(m)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max(), ys.max()
        core = np.where(m & er)
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
            ok = f['feet'] is not None and f['feet'][1] - f['feet'][0] >= 40
            f['ground'] = f['bottom'] if own_ground else ground
            f['cx_ok'] = ok
            f['cell'] = cell
            f['cx'] = (f['feet'][0] + f['feet'][1]) / 2 if ok else None
            rels.append(f['cx'] - cell if ok else None)
        valid = [(c, v) for c, v in enumerate(rels) if v is not None]
        for c, f in enumerate(row):
            if f['cx'] is None:
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
    h = float(np.mean([frames[i]['core_h'] for i in stand]))
    return BODY_HEIGHT / h / W.OUT_K, h


def bbox_of(L, label):
    ys, xs = np.where(L == label)
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def apply_fixes(rgba, L, order, frames, fixes):
    from PIL import ImageDraw
    src_of = {}
    for fx in fixes:
        poly = Image.new('L', (rgba.shape[1], rgba.shape[0]), 0)
        ImageDraw.Draw(poly).polygon(fx['poly'], fill=255)
        inside = np.array(poly) > 0
        src, dst, donor = fx['src'], fx['dst'], fx['donor']
        tip = inside & (L == order[src]) & (rgba[..., 3] >= 8)
        L_dst = src_of.get(dst, (rgba, L, None))[1].copy()
        L_dst[tip] = order[dst]
        src_of[dst] = (rgba, L_dst, bbox_of(L_dst, order[dst]))
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


def process(measure=False):
    summary = {}
    extents = dict(left=0, right=0, up=0, down=0)  # px de saída além de ANCHOR_X/GROUND_Y, se measure
    for name, cfg in SHEETS.items():
        print(f'Processando {name}.png -> {cfg["state"]} ...')
        rgba = clean_alpha(np.array(Image.open(os.path.join(BASES_DIR, name + '.png')).convert('RGBA')))
        L, order = W.segment(rgba[..., 3], cfg['layout'], min_core=cfg['min_core'])
        frames = analyse(rgba, L, order, cfg['layout'], cfg.get('own_ground', False))
        own = apply_fixes(rgba, L, order, frames, FIXES.get(name, []))
        scale, h = sheet_scale(frames, cfg['stand'])
        print(f'  corpo em pé = {h:.0f}px na folha -> escala {scale:.3f}')
        out = []
        for f in frames:
            fr_rgba, fr_L, fr_bbox = own.get(f['idx'], (rgba, L, None))
            if fr_bbox:
                f['bbox'] = fr_bbox
            x0, y0, x1, y1 = f['bbox']
            k = scale * W.OUT_K
            if measure:
                extents['left'] = max(extents['left'], (f['cx'] - x0) * k)
                extents['right'] = max(extents['right'], (x1 - f['cx']) * k)
                extents['up'] = max(extents['up'], (f['ground'] - y0) * k)
                extents['down'] = max(extents['down'], (y1 - f['ground']) * k)
                continue
            im = W.render_frame(fr_rgba, fr_L, f, scale)
            save_png(im, os.path.join(ROGUE_DIR, f'{cfg["state"]}_{f["idx"]:02d}.png'), cfg['state'] == 'idle')
            out.append(im)
        if not measure:
            summary[cfg['state']] = out
    if measure:
        print('\nExtensão necessária (px de saída, além de ANCHOR_X/GROUND_Y), com folga de 6px:')
        for k, v in extents.items():
            print(f'  {k}: {v:.1f} -> sugerido {int(np.ceil(v)) + 6}')
    return summary


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--preview', metavar='DIR', help='grava tiras/GIFs de conferência nesta pasta')
    ap.add_argument('--measure', action='store_true', help='só mede a extensão necessária do canvas, não grava nada')
    args = ap.parse_args()
    summary = process(measure=args.measure)
    if args.measure:
        return
    print('Canvas:', W.CANVAS_W, W.CANVAS_H, 'anchorX', W.ANCHOR_X, 'groundY', W.GROUND_Y)
    if args.preview:
        W.write_preview(summary, args.preview)
    print('Processamento completo com sucesso!')


if __name__ == '__main__':
    main()
