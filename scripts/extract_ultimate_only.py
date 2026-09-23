"""Recorta UMA folha de golpe supremo (Bases/*.png) em quadros PNG, para heróis que só
receberam essa folha do Codex nesta leva (caçador, conjurador, monge -- sem Prompt_*.txt nem
Plano_Sprites.md, mapeamento por nome de arquivo, ver docs/BATTLE_SPRITE_PROMPTS.md).

Uso:
    python scripts/extract_ultimate_only.py cacador Mestre_Marca_do_Predador
    python scripts/extract_ultimate_only.py conjurador Mestre_Fera_Espectral
    python scripts/extract_ultimate_only.py monge Mestre_Golpe_Flamenjante
    (+ --measure / --preview DIR, iguais aos outros scripts extract_*_bases.py)

Diferente dos heróis com folha própria completa (guardião) ou canvas dedicado (arcanista,
sacerdotisa), estes três só ganharam a folha do golpe supremo -- as outras 12 poses continuam
nos sprites legados pequenos (96x128, "contain" no CSS). Registrar HERO_SPRITE_CANVAS pra só um
estado obrigaria a reenquadrar as outras 12 poses também (sem arte nova pra isso), então os
quadros saem no mesmo canvas próprio do golpe supremo, mas SEM entrada em HERO_SPRITE_CANVAS: o
jogo cai no fallback `object-fit:contain` já usado pelos outros estados desses heróis (o
personagem fica um pouco menor no golpe supremo por causa da folga da folha para os efeitos, mas
sem quebrar o encaixe -- trade-off aceito por ser só um estado raro, não o combate inteiro).

Requer: pip install pillow numpy scipy
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

# Canvas por herói, calibrado por medição direta (--measure) de cada folha (porte e efeitos
# diferentes por classe). BODY_HEIGHT igual aos outros heróis (~200) pro golpe supremo não
# desentoar de tamanho quando aparecer ao lado das outras poses (contain).
HERO_CONFIG = {
    'cacador': dict(body_height=200, left=127, right=182, up=240, down=10, min_core=16000),
    'conjurador': dict(body_height=200, left=157, right=204, up=253, down=88, min_core=8000),
    'monge': dict(body_height=200, left=117, right=149, up=221, down=14, min_core=16000),
}


def clean_alpha(rgba):
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


def analyse(rgba, L, order, layout, feet_band=40):
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
        band = body & (np.arange(body.shape[0])[:, None] >= bottom - feet_band)
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
            f['ground'] = ground
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


def sheet_scale(frames, stand, body_height):
    h = float(np.mean([frames[i]['core_h'] for i in stand]))
    return body_height / h / W.OUT_K, h


def process(hero, sheet_name, measure=False):
    cfg = HERO_CONFIG[hero]
    hero_dir = os.path.join(W.PROJECT_ROOT, 'public', 'assets', 'battle', 'sprites', 'heroes', hero)
    bases_dir = os.path.join(hero_dir, 'Bases')
    W.CANVAS_W, W.CANVAS_H = cfg['left'] + cfg['right'], cfg['up'] + cfg['down']
    W.ANCHOR_X, W.GROUND_Y = cfg['left'], cfg['up']
    layout = [4, 4, 4]

    print(f'Processando {sheet_name}.png -> ultimate ({hero}) ...')
    rgba = clean_alpha(np.array(Image.open(os.path.join(bases_dir, sheet_name + '.png')).convert('RGBA')))
    L, order = W.segment(rgba[..., 3], layout, min_core=cfg['min_core'])
    frames = analyse(rgba, L, order, layout)
    scale, h = sheet_scale(frames, [0, 11], cfg['body_height'])
    print(f'  corpo em pé = {h:.0f}px na folha -> escala {scale:.3f}')
    if measure:
        for f in frames:
            print(f'   {f["idx"]:02d} cx={f["cx"]:.0f} ground={f["ground"]:.0f} feet={f["feet"]} ok={f["cx_ok"]}')

    extents = dict(left=0, right=0, up=0, down=0)
    out = []
    for f in frames:
        x0, y0, x1, y1 = f['bbox']
        k = scale * W.OUT_K
        if measure:
            extents['left'] = max(extents['left'], (f['cx'] - x0) * k)
            extents['right'] = max(extents['right'], (x1 - f['cx']) * k)
            extents['up'] = max(extents['up'], (f['ground'] - y0) * k)
            extents['down'] = max(extents['down'], (y1 - f['ground']) * k)
            continue
        im = W.render_frame(rgba, L, f, scale)
        save_png(im, os.path.join(hero_dir, f'ultimate_{f["idx"]:02d}.png'))
        out.append(im)

    if measure:
        print('\nExtensão necessária (px de saída, além de ANCHOR_X/GROUND_Y), com folga de 6px:')
        for k, v in extents.items():
            print(f'  {k}: {v:.1f} -> sugerido {int(np.ceil(v)) + 6}')
        return {}
    print('Canvas:', W.CANVAS_W, W.CANVAS_H, 'anchorX', W.ANCHOR_X, 'groundY', W.GROUND_Y)
    return {'ultimate': out}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('hero', choices=list(HERO_CONFIG))
    ap.add_argument('sheet', help='nome do arquivo em Bases/ sem .png, ex.: Mestre_Marca_do_Predador')
    ap.add_argument('--preview', metavar='DIR', help='grava tiras/GIFs de conferência nesta pasta')
    ap.add_argument('--measure', action='store_true', help='só mede a extensão necessária do canvas')
    args = ap.parse_args()
    summary = process(args.hero, args.sheet, measure=args.measure)
    if args.measure:
        return
    if args.preview:
        W.write_preview(summary, args.preview)
    print('Processamento completo com sucesso!')


if __name__ == '__main__':
    main()
