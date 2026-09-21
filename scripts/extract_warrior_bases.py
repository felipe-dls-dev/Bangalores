"""Recorta as folhas de sprite do guerreiro (Bases/*.png) em quadros PNG para a batalha.

Uso:
    python scripts/extract_warrior_bases.py                 # regera os quadros
    python scripts/extract_warrior_bases.py --preview DIR   # + tiras de conferência em DIR

Requer: pip install pillow numpy scipy

O que o script faz (e o que a versão antiga com faixas de pixel fixas não fazia):
  1. Fundo: Ataque/Descanso vêm com xadrez "falso" assado no RGB; ele é removido pela grade de
     12px, sem apagar partes claras do personagem (lâmina). O rastro azul do golpe vira alpha real.
     Crítico/Defesa/Ultimate já têm alpha e são usados como estão.
  2. Segmentação: cada quadro é achado pelo "núcleo" sólido do corpo, e o resto (espada, capa,
     efeitos, detritos) é distribuído por propagação geodésica. Nada de recorte por retângulo,
     então espada e efeitos que passam do "quadradinho" da folha não são cortados nem vazam para
     o quadro vizinho.
  3. Escala: as folhas foram geradas em tamanhos diferentes (Crítico/Ultimate têm 4 linhas em vez
     de 3, o guerreiro sairia ~30% menor). O campo scale de SHEETS normaliza tudo para o mesmo tamanho.
  4. Registro: todos os quadros de todos os estados ficam com o MESMO canvas, o chão na MESMA
     linha e o centro dos pés no MESMO x. O chão vem da mediana da linha da folha, então saltos
     do Ultimate continuam saltando.
  5. Peso: idle/attack/defend saem em PNG de 256 cores; `hit` não tem arquivos próprios (usa defend).
  6. Estados sem folha nova (esquiva, poção, habilidade, posturas, vitória, derrota) usam os
     quadros antigos de bkp/, reenquadrados no canvas novo para não mudarem de tamanho.
"""
import argparse
import collections
import json
import os
import shutil
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WARRIOR_DIR = os.path.join(PROJECT_ROOT, 'public', 'assets', 'battle', 'sprites', 'heroes', 'guerreiro')
BASES_DIR = os.path.join(WARRIOR_DIR, 'Bases')
BKP_DIR = os.path.join(WARRIOR_DIR, 'bkp')

# --- Folhas --------------------------------------------------------------------------------
# layout = quadros por linha. scale = fator para igualar o tamanho do personagem ao do Descanso
# (medido por casamento de silhueta entre folhas; ver docstring).
SHEETS = {
    'Descanso': dict(state='idle', layout=[4, 4, 4], scale=1.00),
    'Ataque': dict(state='attack', layout=[4, 4, 4], scale=1.09),
    'Defesa': dict(state='defend', layout=[4, 4, 4], scale=1.10),  # também serve o estado `hit`
    'Critico': dict(state='heavy', layout=[5, 4, 4, 4], scale=1.30),
    'Ultimate': dict(state='ultimate', layout=[5, 4, 4, 4], scale=1.31),
}

# --- Canvas de saída (em pixels da folha Descanso; OUT_K converte para pixels finais) --------
OUT_K = 0.70
LEFT, RIGHT, UP, DOWN = 280, 360, 430, 45
SOLE = 6                           # sola da bota abaixo do último pixel vermelho, em px da folha
TOP_FADE = 90                      # px da folha do degradê no topo de feixes cortados pela folha
# Quadros cujo efeito de luz foi cortado em linha reta pela borda da célula da folha original
# (conferido olhando o topo de cada quadro). Ganham degradê no topo em vez de corte seco.
TOP_CUT_FRAMES = {'heavy': [7], 'ultimate': [12, 16]}
CANVAS_W = round((LEFT + RIGHT) * OUT_K)
CANVAS_H = round((UP + DOWN) * OUT_K)
ANCHOR_X = round(LEFT * OUT_K)     # x do centro dos pés
GROUND_Y = round(UP * OUT_K)       # y da sola das botas
EDGE_FADE = 14                     # px de degradê nas bordas para efeitos não terminarem em corte seco
# Nada de relevante fica abaixo do chão: brilhos/detritos a mais que isso são topos de feixe do
# quadro da linha de baixo da folha que vazaram para este. Degradê de GROUND_FADE_START a END
# (em px da folha Descanso) abaixo da linha do chão.
GROUND_FADE_START, GROUND_FADE_END = 8, 22

# Quadros antigos (96x128, pés em y=125, centro x=44) e o quanto ampliá-los (inteiro = pixel art nítida)
LEGACY_W, LEGACY_H, LEGACY_GROUND, LEGACY_ANCHOR, LEGACY_ZOOM = 96, 128, 125, 44, 2
LEGACY_PREFIXES = ['dodge_', 'potion_', 'skill_', 'stance_defensive_', 'stance_offensive_', 'victory_', 'defeat_']

# Estados de corpo limpo (sem brilhos translúcidos grandes): PNG de 256 cores, ~4x menor e sem
# diferença visível. Heavy/Ultimate ficam RGBA completo porque a quantização posteriza os brilhos.
QUANTIZE_STATES = {'idle', 'attack', 'defend'}

SQ = 12  # lado do quadrado do xadrez falso


# =============================================================================================
# 1. Fundo
# =============================================================================================
def _checker_flood(rgb):
    a = rgb.astype(np.float32)
    h, w, _ = a.shape
    v = a.mean(2)
    sat = a.max(2) - a.min(2)
    cand = (sat <= 14) & (v >= 190)
    seeds = np.zeros((h, w), bool)
    m = 2
    for gy in range(0, h - SQ + 1, SQ):
        for gx in range(0, w - SQ + 1, SQ):
            sl = (slice(gy + m, gy + SQ - m), slice(gx + m, gx + SQ - m))
            blk = v[sl]
            if blk.std() < 3.5 and sat[sl].max() <= 10 and blk.mean() >= 196:
                seeds[gy:gy + SQ, gx:gx + SQ] = True
    seeds &= cand
    lab, n = ndi.label(cand, structure=np.ones((3, 3)))
    ok = set(np.unique(lab[seeds])) - {0}
    ok |= set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    keep = np.zeros(n + 1, bool)
    for l in ok:
        keep[l] = True
    return keep[lab]


def _tone_model(v, known):
    """Tom esperado do xadrez em cada quadrado (mediana dos pixels-fundo já conhecidos)."""
    h, w = v.shape
    gh, gw = h // SQ, w // SQ
    tone = np.full((gh, gw), np.nan, np.float32)
    m = 2
    for gy in range(gh):
        for gx in range(gw):
            sl = (slice(gy * SQ + m, gy * SQ + SQ - m), slice(gx * SQ + m, gx * SQ + SQ - m))
            k = known[sl]
            if k.sum() >= 30:
                tone[gy, gx] = np.median(v[sl][k])
    par = np.add.outer(np.arange(gh), np.arange(gw)) % 2
    full = tone.copy()
    for p in (0, 1):
        kn = (~np.isnan(tone)) & (par == p)
        if not kn.any():
            continue
        idx = ndi.distance_transform_edt(~kn, return_distances=False, return_indices=True)
        filled = tone[idx[0], idx[1]]
        sel = (par == p) & np.isnan(tone)
        full[sel] = filled[sel]
    E = np.full(v.shape, 253.0, np.float32)
    big = np.kron(full, np.ones((SQ, SQ), np.float32))
    E[:big.shape[0], :big.shape[1]] = big
    return E


def clean_checker_sheet(rgb):
    """RGB com xadrez falso -> RGBA com alpha recuperado."""
    a = rgb.astype(np.float32)
    v = a.mean(2)
    sat = a.max(2) - a.min(2)
    bminusr = a[..., 2] - a[..., 0]
    cand = (sat <= 14) & (v >= 190)

    bg = _checker_flood(rgb)
    E = _tone_model(v, bg)
    chk = (np.abs(v - E) <= 9) & (sat <= 10)
    opened = ndi.binary_opening(chk, structure=np.ones((5, 5), bool))
    opened = ndi.binary_dilation(opened, structure=np.ones((3, 3), bool), iterations=2)
    bg2 = bg | (opened & cand)

    # rastro azul do golpe: alpha pela "azulação" (o xadrez é neutro)
    wisp = (~bg2) & (bminusr >= 12) & (v >= 140)
    alpha = np.where(bg2, 0.0, 255.0).astype(np.float32)
    out = a.copy()
    alpha[wisp] = 255.0 * np.clip(bminusr / 55.0, 0, 1)[wisp]
    out[wisp] = np.array([200, 225, 255], np.float32)

    # restos neutros claros dentro da zona do rastro (que não sejam contorno de armadura/lâmina)
    wz = ndi.binary_dilation(wisp, structure=np.ones((3, 3), bool), iterations=7)
    near_dark = ndi.binary_dilation(v < 110, structure=np.ones((3, 3), bool), iterations=3)
    alpha[(~bg2) & (~wisp) & wz & cand & (~near_dark)] = 0.0

    # buracos fechados grossos com cor de xadrez (lâmina é fina e alongada, então fica)
    def strip(min_area, max_area, min_dt, max_compact):
        remaining = cand & (alpha > 0) & (~wisp)
        lab, n = ndi.label(remaining, structure=np.ones((3, 3)))
        if not n:
            return
        dt = ndi.distance_transform_edt(remaining)
        mx = ndi.maximum(dt, lab, index=np.arange(1, n + 1))
        ar = ndi.sum(remaining, lab, index=np.arange(1, n + 1))
        for i in range(1, n + 1):
            compact = ar[i - 1] / (mx[i - 1] ** 2) if mx[i - 1] > 0 else 1e9
            if min_area <= ar[i - 1] < max_area and mx[i - 1] >= min_dt and compact < max_compact:
                alpha[lab == i] = 0.0

    strip(100, 1e12, 8, 1e9)   # buraco grande
    strip(20, 150, 2.5, 12)    # blocos claros compactos e pequenos

    # furinhos do xadrez nos rasgos da capa: claros, pequenos e cercados SÓ por tecido escuro. Brilho
    # de lâmina também é claro e pequeno, mas sempre encosta em aço de tom médio (fica no anel).
    light = (alpha > 0) & (v >= 200) & (sat <= 30) & (~wisp)
    lab, n = ndi.label(light, structure=np.ones((3, 3)))
    objs = ndi.find_objects(lab)
    ar = ndi.sum(light, lab, index=np.arange(1, n + 1))
    for i in range(n):
        if not 5 <= ar[i] <= 400:
            continue
        sl = tuple(slice(max(0, s.start - 5), s.stop + 5) for s in objs[i])
        comp = lab[sl] == i + 1
        ring = ndi.binary_dilation(comp, structure=np.ones((3, 3), bool), iterations=4) & ~comp & (alpha[sl] > 0)
        if ring.sum() >= 10 and np.percentile(v[sl][ring], 90) < 110:
            alpha[sl][comp] = 0.0

    # franja clara/cinza que sobrou ao redor de buracos FECHADOS (transparência cercada pelo personagem,
    # que não encosta na borda da folha): é xadrez misturado com o contorno.
    tlab, tn = ndi.label(alpha == 0)
    edge_labels = set(np.unique(np.concatenate([tlab[0], tlab[-1], tlab[:, 0], tlab[:, -1]])))
    outer = np.isin(tlab, list(edge_labels))
    holes = (alpha == 0) & ~outer
    for _ in range(2):
        ring = ndi.binary_dilation(holes, structure=np.ones((3, 3), bool)) & (alpha > 0)
        fringe = ring & (v >= 120) & (sat <= 40) & (~wisp)
        alpha[fringe] = 0.0
        holes |= fringe

    # descasca a franja clara do contorno (xadrez misturado com a borda)
    for _ in range(3):
        solid = alpha > 0
        edge = solid & ~ndi.binary_erosion(solid, structure=np.ones((3, 3), bool), border_value=1)
        alpha[edge & (sat <= 34) & (v >= 135) & (~wisp) & (alpha >= 250)] = 0.0

    return np.dstack([np.clip(out, 0, 255), alpha]).astype(np.uint8)


def load_sheet(name):
    im = Image.open(os.path.join(BASES_DIR, name + '.png'))
    if im.mode == 'RGB':
        return clean_checker_sheet(np.array(im))
    a = np.array(im.convert('RGBA'))
    a[a[..., 3] == 0] = 0
    return a


# =============================================================================================
# 2. Segmentação em quadros
# =============================================================================================
def _disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return (x * x + y * y) <= r * r


def segment(alpha, layout, thr=8):
    """Devolve (mapa de rótulos por pixel, rótulos na ordem de leitura)."""
    solid = alpha >= 250
    er = ndi.binary_erosion(solid, structure=np.ones((3, 3), bool), iterations=7)
    lab, n = ndi.label(er)
    ar = ndi.sum(er, lab, index=np.arange(1, n + 1))
    keep = np.zeros(n + 1, bool)
    keep[1:] = ar >= 4000
    cores, n = ndi.label(keep[lab])
    total = sum(layout)
    if n != total:
        sys.exit(f'Segmentação achou {n} personagens, esperado {total}.')

    cents = ndi.center_of_mass(cores > 0, cores, index=np.arange(1, n + 1))
    by_y = sorted(range(n), key=lambda i: cents[i][0])
    order, pos = [], 0
    for cnt in layout:
        order += sorted(by_y[pos:pos + cnt], key=lambda i: cents[i][1])
        pos += cnt
    order = [i + 1 for i in order]

    # Propagação geodésica a partir dos núcleos, só por dentro da máscara. Em estágios, do opaco
    # para o translúcido: um brilho fraco que encosta em dois quadros não pode "roubar" para o
    # vizinho um feixe/detrito que pertence, pela parte forte, ao quadro de baixo.
    mask = alpha >= thr
    L = cores.astype(np.int32)
    k = np.ones((3, 3), bool)
    for stage in (200, 100, 40, thr):
        free = (alpha >= stage) & (L == 0)
        while True:
            grown = ndi.maximum_filter(L, footprint=k)
            new = free & (grown > 0)
            if not new.any():
                break
            L[new] = grown[new]
            free &= ~new
    # restos soltos (pedras, faíscas) -> núcleo mais próximo
    rest = mask & (L == 0)
    if rest.any():
        d, (iy, ix) = ndi.distance_transform_edt(L == 0, return_indices=True)
        take = rest & (d <= 140)
        L[take] = L[iy, ix][take]
    return L, order


def analyse(alpha, rgba, L, order, layout):
    """Landmarks por quadro: bbox, chão (mediana da linha) e centro dos pés."""
    r, g, b = [rgba[..., i].astype(int) for i in range(3)]
    boot_color = (alpha >= 250) & (r >= 70) & (r < 175) & (r - g >= 45) & (r - b >= 40)
    frames = []
    for i, k in enumerate(order):
        m = L == k
        ys, xs = np.where(m)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max(), ys.max()
        sub = m[y0:y1 + 1, x0:x1 + 1] & (alpha[y0:y1 + 1, x0:x1 + 1] >= 250)
        body = ndi.binary_opening(sub, structure=_disk(8))
        by = np.where(body)[0]
        bottom = int(by.max() + y0)
        band = np.zeros_like(m)
        band[max(0, bottom - 34):bottom + 3] = True
        bm = ndi.binary_opening(m & boot_color & band, structure=np.ones((3, 3), bool))
        bx = np.where(bm)[1]
        # bota mais baixa do quadro inteiro (não só da faixa do chão): pega perna estendida/pendurada
        low = ndi.binary_opening(m & boot_color, structure=np.ones((3, 3), bool))
        ly = np.where(low)[0]
        frames.append(dict(idx=i, label=int(k), bbox=(int(x0), int(y0), int(x1), int(y1)), bottom=bottom,
                           feet=(int(bx.min()), int(bx.max())) if len(bx) else None,
                           sole=int(ly.max()) + SOLE if len(ly) else bottom))
    # chão por linha = mediana (preserva saltos), âncora x com fallback para botas escondidas
    pos = 0
    W = alpha.shape[1]
    for cnt in layout:
        row = frames[pos:pos + cnt]
        ground = float(np.median([f['bottom'] for f in row]))
        rels = []
        for c, f in enumerate(row):
            cell = (c + 0.5) * W / cnt
            ok = f['feet'] is not None and f['feet'][1] - f['feet'][0] >= 90
            # Quadro aéreo (botas acima da linha) continua no ar; bota abaixo da linha sobe até o chão.
            f['ground'] = max(ground, float(f['sole'])) if f['sole'] > ground + 6 else ground
            f['cx_ok'] = ok
            f['cell'] = cell
            f['cx'] = (f['feet'][0] + f['feet'][1]) / 2 if ok else None
            rels.append(f['cx'] - cell if ok else None)
        valid = [(c, v) for c, v in enumerate(rels) if v is not None]
        for c, f in enumerate(row):
            if f['cx'] is None:  # interpola a posição relativa à célula entre vizinhos válidos
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


# =============================================================================================
# 3. Render
# =============================================================================================
def resize_premult(im, size):
    return im.convert('RGBa').resize(size, Image.Resampling.LANCZOS).convert('RGBA')


def place(canvas, im, px, py):
    """alpha_composite com recorte: aceita posição negativa e imagem maior que o canvas."""
    sx, sy = max(0, -px), max(0, -py)
    ex, ey = min(im.width, canvas.width - px), min(im.height, canvas.height - py)
    if ex > sx and ey > sy:
        canvas.alpha_composite(im.crop((sx, sy, ex, ey)), (px + sx, py + sy))


def render_frame(rgba, L, f, sheet_scale):
    x0, y0, x1, y1 = f['bbox']
    pad = 2
    x0p, y0p = max(0, x0 - pad), max(0, y0 - pad)
    x1p, y1p = min(rgba.shape[1] - 1, x1 + pad), min(rgba.shape[0] - 1, y1 + pad)
    crop = rgba[y0p:y1p + 1, x0p:x1p + 1].copy()
    crop[L[y0p:y1p + 1, x0p:x1p + 1] != f['label']] = 0  # só o que pertence a ESTE quadro
    k = sheet_scale * OUT_K
    im = Image.fromarray(crop, 'RGBA')
    size = (max(1, round(im.width * k)), max(1, round(im.height * k)))
    im = resize_premult(im, size)
    if f['top_cut']:
        # a folha cortou este feixe de luz na borda da célula: some com ele em degradê em vez de corte reto
        arr = np.array(im)
        n = max(1, round(TOP_FADE * k))
        ramp = np.ones(arr.shape[0], np.float32)
        ramp[:n] = np.linspace(0, 1, n, dtype=np.float32) ** 1.5
        a = arr[..., 3].astype(np.float32)
        arr[..., 3] = np.where(a < 250, a * ramp[:, None], a).astype(np.uint8)
        im = Image.fromarray(arr, 'RGBA')
    # posição: centro dos pés em ANCHOR_X, chão em GROUND_Y
    px = round(ANCHOR_X - (f['cx'] - x0p) * k)
    py = round(GROUND_Y - (f['ground'] - y0p) * k)
    canvas = Image.new('RGBA', (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    place(canvas, im, px, py)
    arr = np.array(canvas)
    # degradê nas bordas (só em pixels translúcidos: efeitos/brilho)
    a = arr[..., 3].astype(np.float32)
    ramp = np.ones_like(a)
    xs = np.arange(CANVAS_W, dtype=np.float32)
    ys = np.arange(CANVAS_H, dtype=np.float32)
    rx = np.clip(np.minimum(xs, CANVAS_W - 1 - xs) / EDGE_FADE, 0, 1)
    ry = np.clip(ys / EDGE_FADE, 0, 1)
    ramp = np.minimum(ramp, rx[None, :])
    ramp = np.minimum(ramp, ry[:, None])
    faded = np.where(a < 250, a * ramp, a)
    # limite abaixo do chão (vale também para pixels sólidos)
    below = ys - GROUND_Y
    bramp = np.clip(1 - (below - GROUND_FADE_START * OUT_K) / ((GROUND_FADE_END - GROUND_FADE_START) * OUT_K), 0, 1)
    faded = faded * bramp[:, None]
    arr[..., 3] = np.clip(faded, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, 'RGBA')


def save_png(im, path, quantize=False):
    if quantize:
        im = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    im.save(path, optimize=True)


def process_sheets():
    summary = {}
    for name, cfg in SHEETS.items():
        print(f'Processando {name}.png -> {cfg["state"]} ...')
        rgba = load_sheet(name)
        alpha = rgba[..., 3]
        L, order = segment(alpha, cfg['layout'])
        frames = analyse(alpha, rgba, L, order, cfg['layout'])
        out = []
        for f in frames:
            f['top_cut'] = f['idx'] in TOP_CUT_FRAMES.get(cfg['state'], ())
            im = render_frame(rgba, L, f, cfg['scale'])
            save_png(im, os.path.join(WARRIOR_DIR, f'{cfg["state"]}_{f["idx"]:02d}.png'), cfg['state'] in QUANTIZE_STATES)
            out.append(im)
        summary[cfg['state']] = out
        print(f'  {len(out)} quadros')
    return summary


def reframe_legacy():
    """Quadros antigos (96x128) -> mesmo canvas/âncora/chão dos novos, sem mudar de tamanho."""
    if not os.path.isdir(BKP_DIR):
        print('bkp/ não encontrado; estados legados não reenquadrados.')
        return {}
    done = collections.defaultdict(list)
    for fname in sorted(os.listdir(BKP_DIR)):
        if not fname.endswith('.png') or not any(fname.startswith(p) for p in LEGACY_PREFIXES):
            continue
        src = Image.open(os.path.join(BKP_DIR, fname)).convert('RGBA')
        z = LEGACY_ZOOM
        big = src.resize((src.width * z, src.height * z), Image.Resampling.NEAREST)
        canvas = Image.new('RGBA', (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
        canvas.alpha_composite(big, (ANCHOR_X - LEGACY_ANCHOR * z, GROUND_Y - LEGACY_GROUND * z))
        save_png(canvas, os.path.join(WARRIOR_DIR, fname))
        done[fname.rsplit('_', 1)[0]].append(canvas)
    print('Estados legados reenquadrados:', {k: len(v) for k, v in done.items()})
    return done


def remove_hit_duplicates():
    """No guerreiro, levar dano usa a folha da Defesa: getBattleSpriteFramePath() aponta hit -> defend,
    então não mantemos hit_*.png (eram cópias idênticas que o jogo baixava duas vezes)."""
    removed = 0
    for fname in os.listdir(WARRIOR_DIR):
        if fname.startswith('hit_') and fname.endswith('.png'):
            os.remove(os.path.join(WARRIOR_DIR, fname))
            removed += 1
    print(f'hit_*.png removidos: {removed} (hit usa defend_*.png)')


# =============================================================================================
# 4. Prévia (conferência visual)
# =============================================================================================
def write_preview(summary, preview_dir):
    os.makedirs(preview_dir, exist_ok=True)
    bg = (24, 20, 30, 255)
    for state, frames in summary.items():
        cols = 6
        rows = (len(frames) + cols - 1) // cols
        sheet = Image.new('RGBA', (cols * CANVAS_W, rows * CANVAS_H), bg)
        d = ImageDraw.Draw(sheet)
        for i, fr in enumerate(frames):
            ox, oy = (i % cols) * CANVAS_W, (i // cols) * CANVAS_H
            sheet.alpha_composite(fr, (ox, oy))
            d.line([(ox, oy + GROUND_Y), (ox + CANVAS_W, oy + GROUND_Y)], fill=(70, 200, 90, 255))
            d.line([(ox + ANCHOR_X, oy), (ox + ANCHOR_X, oy + CANVAS_H)], fill=(70, 120, 220, 255))
            d.rectangle([ox, oy, ox + CANVAS_W - 1, oy + CANVAS_H - 1], outline=(90, 90, 110, 255))
            d.text((ox + 4, oy + 4), f'{state} {i:02d}', fill=(255, 255, 255, 255))
        sheet.convert('RGB').save(os.path.join(preview_dir, f'strip_{state}.png'))
        frames[0].save(os.path.join(preview_dir, f'anim_{state}.gif'), save_all=True, append_images=frames[1:],
                       duration=110, loop=0, disposal=2, transparency=0)
    print('Prévia gravada em', preview_dir)


def write_meta():
    meta = dict(canvasWidth=CANVAS_W, canvasHeight=CANVAS_H, anchorX=ANCHOR_X, groundY=GROUND_Y,
                bodyHeight=round(283 * OUT_K))
    print('Canvas:', json.dumps(meta))
    return meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--preview', metavar='DIR', help='grava tiras/GIFs de conferência nesta pasta')
    args = ap.parse_args()
    summary = process_sheets()
    legacy = reframe_legacy()
    remove_hit_duplicates()
    write_meta()
    if args.preview:
        summary_all = dict(summary)
        for k, v in legacy.items():
            summary_all[k] = v
        write_preview(summary_all, args.preview)
    print('Processamento completo com sucesso!')


if __name__ == '__main__':
    main()
