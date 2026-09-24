"""Recorta as folhas de 8 quadros (grade 4x2) do Codex em quadros PNG para a batalha.

Uso:
    python scripts/extract_eight_frame_sheets.py                        # todos os heróis
    python scripts/extract_eight_frame_sheets.py arcanista monge        # só esses heróis
    python scripts/extract_eight_frame_sheets.py arcanista:attack       # só um estado
    python scripts/extract_eight_frame_sheets.py --measure              # mede o canvas necessário
    python scripts/extract_eight_frame_sheets.py --preview DIR          # + tiras/GIFs de conferência

Requer: pip install pillow numpy scipy

Este lote do Codex trouxe, para cada herói, uma folha de 8 quadros por estado (Idle, Stance_*,
Attack, Heavy, Skill, Ultimate, Defend, Hit, Dodge, Potion, Victory, Defeat), sempre em grade 4x2
com alpha real. A versão anterior recortava cada célula da grade por retângulo e encaixava o
"bounding box" de cada quadro num canvas 512x512. Isso deixava três defeitos:
  * fatias dos quadros vizinhos (botas, feixes) vazavam para dentro do quadro, porque a IA não
    respeitou a grade;
  * a escala mudava de quadro para quadro (um feixe largo encolhia o personagem inteiro);
  * o personagem "andava" de um quadro para o outro, pois o alinhamento era pelo centro do bbox.

O que este script faz (mesmo molde de extract_warrior_bases.py / extract_druid_bases.py):
  1. Alpha: o corpo vem com alpha 250-254 (nunca 255) e há "poeira" de alpha 1-7 espalhada; vira
     alpha 0 abaixo de 8 e 255 a partir de 245. O RGB dos pixels transparentes é zerado.
  2. Segmentação: cada célula da grade tem UM núcleo (o maior bloco sólido erodido que cai dentro
     dela); o resto (capa, cajado, feixes, faíscas) é distribuído por propagação geodésica a partir
     dos núcleos, do opaco ao translúcido. Nada é recortado por retângulo, então o que passa da
     célula fica com o dono certo e o que é do vizinho sai.
  3. Escala: cada folha foi gerada com um zoom diferente. O tamanho é igualado ao da folha Idle
     casando a silhueta do corpo (IoU por correlação de máscaras, varrendo a escala). Todo o herói
     é então escalado para que a silhueta do Idle tenha `target` px no canvas final.
  4. Registro: todos os quadros de todos os estados do herói saem no MESMO canvas, com o chão na
     MESMA linha e o centro dos pés no MESMO x. O chão vem da mediana da linha da folha (saltos e
     agachamentos continuam no ar/no chão), o centro dos pés da mediana horizontal do quarto
     inferior do corpo.
  5. Bordas: efeito de luz cortado em linha reta pela borda da FOLHA (feixe que sai do quadro) some
     em degradê; o mesmo vale para as bordas do canvas.

O resultado precisa bater com HERO_SPRITE_CANVAS em src/battleSprites.ts (um teste confere os PNGs).
"""
import argparse
import concurrent.futures
import gzip
import hashlib
import io
import os
import pickle
import sys
import time

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from scipy.signal import fftconvolve

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HEROES_DIR = os.path.join(PROJECT_ROOT, 'public', 'assets', 'battle', 'sprites', 'heroes')

# estado -> nome da folha (sem extensão). Vale `<nome>_Eight_Frame.png` se existir, senão `<nome>.png`.
SHEET_NAMES = {
    'idle': 'Idle',
    'stance_offensive': 'Stance_Offensive',
    'stance_defensive': 'Stance_Defensive',
    'attack': 'Attack',
    'heavy': 'Heavy',
    'skill': 'Skill',
    'ultimate': 'Ultimate',
    'defend': 'Defend',
    'hit': 'Hit',
    'dodge': 'Dodge',
    'potion': 'Potion',
    'victory': 'Victory',
    'defeat': 'Defeat',
}
COLS, ROWS = 4, 2
FRAMES = COLS * ROWS

# --- Canvas por herói (px finais). LEFT/UP = posição do centro dos pés / da sola no canvas. -------
# target = altura (px finais) da silhueta do corpo no Idle, cajado/arma incluídos. Guerreiro e
# druida mantêm o canvas e a escala já integrados (HERO_SPRITE_CANVAS); os demais foram medidos
# com --measure.
HEROES = {
    'guerreiro': dict(target=240, left=196, right=252, up=350, down=31),
    'druida': dict(target=235, left=170, right=230, up=380, down=30),
    'arcanista': dict(target=232, left=205, right=235, up=350, down=25),
    'sacerdotisa': dict(target=232, left=205, right=235, up=350, down=25),
    'cacador': dict(target=232, left=205, right=235, up=350, down=25),
    'monge': dict(target=232, left=205, right=235, up=350, down=25),
    'conjurador': dict(target=232, left=205, right=235, up=350, down=25),
}

# Correções de escala por (herói, estado), multiplicam a escala estimada. Só onde o spread entre as
# estimativas era alto E a conferência visual (quadro 0 lado a lado com o Idle, altura cabeça->chão)
# mostrou o personagem maior que no repouso: a IoU/miolo se enganam quando o quadro inicial já tem
# braço ou cajado erguido.
OVERRIDES = {
    ('sacerdotisa', 'ultimate'): dict(scale=0.92),
    ('guerreiro', 'potion'): dict(scale=0.93),
    ('guerreiro', 'victory'): dict(scale=0.95),
    ('guerreiro', 'stance_offensive'): dict(scale=0.96),
}

EDGE_FADE = 14        # px de degradê nas bordas do canvas (só em pixels translúcidos)
SHEET_EDGE_FADE = 70  # px (da folha) de degradê onde um efeito foi cortado pela borda da folha
GROUND_FADE = (6, 20)  # px finais abaixo do chão onde o conteúdo some (início, fim)
QUANTIZE_STATES = set()  # estados salvos em 256 cores (decidido por medição; ver --sizes)


# =============================================================================================
# 1. Folha -> RGBA limpo
# =============================================================================================
def sheet_path(hero, state):
    base = os.path.join(HEROES_DIR, hero, 'Bases', SHEET_NAMES[state])
    for cand in (base + '_Eight_Frame.png', base + '.png'):
        if os.path.exists(cand):
            return cand
    return None


def load_sheet(path):
    a = np.array(Image.open(path).convert('RGBA'))
    al = a[..., 3]
    al = np.where(al < 8, 0, np.where(al >= 245, 255, al)).astype(np.uint8)
    a[..., 3] = al
    a[al == 0] = 0
    return a


# =============================================================================================
# 2. Segmentação
# =============================================================================================
def segment(alpha, name=''):
    """Devolve (mapa de rótulos por pixel [1..8], área do núcleo por célula)."""
    H, W = alpha.shape
    solid = ndi.binary_closing(alpha >= 250, structure=np.ones((3, 3), bool), iterations=2)
    er = ndi.binary_erosion(solid, structure=np.ones((3, 3), bool), iterations=7)
    lab, n = ndi.label(er)
    cw, ch = W / COLS, H / ROWS
    seeds = np.zeros(alpha.shape, np.int32)
    areas = []
    for cell in range(FRAMES):
        r, c = divmod(cell, COLS)
        y0, y1, x0, x1 = round(r * ch), round((r + 1) * ch), round(c * cw), round((c + 1) * cw)
        # o núcleo é o bloco com mais pixels DENTRO da célula (um efeito sólido que encosta no corpo
        # do vizinho pode fundir os dois blocos; cada célula fica só com a sua parte)
        counts = np.bincount(lab[y0:y1, x0:x1].ravel(), minlength=n + 1)
        counts[0] = 0
        best = int(counts.argmax())
        if counts[best] < 800:
            sys.exit(f'{name}: nenhum corpo na célula {cell}')
        cellmask = np.zeros(alpha.shape, bool)
        cellmask[y0:y1, x0:x1] = True
        seeds[(lab == best) & cellmask] = cell + 1
        areas.append(int(counts[best]))

    # propagação geodésica, do opaco ao translúcido (um brilho fraco que encosta em dois quadros
    # não pode "roubar" para o vizinho um feixe que pertence, pela parte forte, ao outro)
    mask = alpha >= 8
    L = seeds.copy()
    k = np.ones((3, 3), bool)
    for stage in (200, 100, 40, 8):
        free = (alpha >= stage) & (L == 0)
        while True:
            grown = ndi.maximum_filter(L, footprint=k)
            new = free & (grown > 0)
            if not new.any():
                break
            L[new] = grown[new]
            free &= ~new
    rest = mask & (L == 0)
    if rest.any():  # faíscas soltas -> núcleo mais próximo
        d, (iy, ix) = ndi.distance_transform_edt(L == 0, return_indices=True)
        take = rest & (d <= 140)
        L[take] = L[iy, ix][take]
    return L, areas


def _disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return (x * x + y * y) <= r * r


def analyse(alpha, L):
    """Landmarks por quadro (px da folha): bbox do rótulo, máscara do corpo, chão e centro dos pés."""
    frames = []
    for cell in range(FRAMES):
        m = L == cell + 1
        ys, xs = np.where(m)
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
        sub = m[y0:y1 + 1, x0:x1 + 1] & (alpha[y0:y1 + 1, x0:x1 + 1] >= 250)
        body = ndi.binary_opening(sub, structure=_disk(8))
        if not body.any():
            body = sub
        by, bx = np.where(body)
        top, bottom = int(by.min()) + y0, int(by.max()) + y0
        # centro dos pés: mediana horizontal do quarto inferior do corpo
        low = by >= bottom - y0 - max(20, 0.25 * (bottom - top))
        cx = float(np.median(bx[low])) + x0
        # silhueta sólida de referência (altura total, cajado/arma inclusos)
        sy, sx = np.where(sub)
        frames.append(dict(cell=cell, bbox=(x0, y0, x1, y1), bottom=bottom, top=top, cx=cx,
                           sil_h=int(sy.max() - sy.min() + 1), sil=sub))
    # chão por linha = mediana dos "bottom" (mantém saltos), com a sola mais baixa vencendo
    for r in range(ROWS):
        row = frames[r * COLS:(r + 1) * COLS]
        ground = float(np.median([f['bottom'] for f in row]))
        for f in row:
            f['ground'] = max(ground, float(f['bottom'])) if f['bottom'] > ground + 6 else ground
    return frames


# =============================================================================================
# 3. Escala: iguala o tamanho de cada folha ao da folha Idle
# =============================================================================================
# As folhas foram geradas uma a uma, então o zoom do personagem muda de folha para folha (a poção
# da Sacerdotisa sai ~50% maior que o Idle) e a IA redesenha proporções a cada pose. Nenhuma
# medida sozinha é confiável (a silhueta casa com o tronco de outra pose; a altura da cabeça infla
# com braço levantado), então a escala é a MEDIANA de quatro estimativas independentes, todas com o
# chão alinhado:
#   iou   - IoU da silhueta sólida (cajado/arma inclusos) contra os 8 quadros do Idle
#   blob  - o mesmo, só com o "miolo" do corpo (abertura morfológica: some cajado, braço fino, feixe)
#   hb0   - altura cabeça->chão do miolo no quadro 0 (pose de repouso) contra a do Idle
# O spread entre elas aparece no log (com hb7, só informativo: o último quadro costuma terminar em
# outra pose); folha com spread alto merece um olhar (OVERRIDES).
def _small(mask, q=4):
    """máscara -> versão reduzida (média em blocos de q px > 0.5)."""
    h, w = mask.shape
    h2, w2 = (h // q) * q, (w // q) * q
    return (mask[:h2, :w2].astype(np.float32).reshape(h2 // q, q, w2 // q, q).mean(axis=(1, 3)) > 0.5).astype(np.float32)


def _rescale(mask, s):
    h, w = mask.shape
    im = Image.fromarray((mask * 255).astype(np.uint8))
    im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.Resampling.BILINEAR)
    return (np.array(im) > 127).astype(np.float32)


def _iou_feet_aligned(ref, cand, dys=(-3, 0, 3)):
    """Melhor IoU deslocando só na horizontal, com as solas (base das máscaras) alinhadas.

    Alinhar o chão é um dado, não um palpite: sem isso uma silhueta maior "casa" com o tronco de
    outra pose e a escala sai errada."""
    best = 0.0
    n = 1 << int(np.ceil(np.log2(ref.shape[1] + cand.shape[1])))
    for dy in dys:
        h = min(ref.shape[0], cand.shape[0]) - abs(dy)
        if h <= 2:
            continue
        r = ref[max(0, ref.shape[0] - h - max(0, dy)):ref.shape[0] - max(0, dy)] if dy >= 0 else ref[ref.shape[0] - h:]
        c = cand[cand.shape[0] - h:] if dy >= 0 else cand[cand.shape[0] - h - (-dy):cand.shape[0] - (-dy)]
        if r.shape[0] != h or c.shape[0] != h:
            continue
        R = np.fft.rfft(r, n, axis=1)
        C = np.fft.rfft(c, n, axis=1)
        inter = np.fft.irfft((R * np.conj(C)).sum(axis=0), n).max()
        best = max(best, float(inter / (r.sum() + c.sum() - inter + 1e-6)))
    return best


BLOB_OPEN = 16


def body_blob(sil):
    """Miolo do corpo: maior bloco que sobrevive a uma abertura, sem o que ficou acima da cabeça."""
    op = ndi.binary_opening(sil, structure=_disk(BLOB_OPEN))
    lab, n = ndi.label(op)
    if n == 0:
        return sil
    area = ndi.sum(op, lab, index=np.arange(1, n + 1))
    m = lab == int(np.argmax(area)) + 1
    top = int(np.where(m.any(axis=1))[0].min())
    return m[top:, :]


def scale_masks(frames):
    """Máscaras reduzidas (silhueta e miolo) e altura do miolo de cada quadro, guardadas por folha."""
    blobs = [body_blob(f['sil']) for f in frames]
    return dict(sil=[_small(f['sil']) for f in frames], blob=[_small(b) for b in blobs],
                hb=[b.shape[0] for b in blobs])


def _curve_scale(refs, cands, coarse=np.arange(0.60, 1.60, 0.03)):
    curve = np.zeros((len(cands), len(coarse)))
    for i, c0 in enumerate(cands):
        for j, s in enumerate(coarse):
            c = _rescale(c0, s)
            curve[i, j] = max(_iou_feet_aligned(r, c) for r in refs)
    top = np.argsort(curve.max(axis=1))[-2:]
    j = int(curve[top].mean(axis=0).argmax())
    fine = np.round(np.arange(coarse[j] - 0.03, coarse[j] + 0.0301, 0.01), 3)
    score = [np.mean([max(_iou_feet_aligned(r, _rescale(cands[i], s)) for r in refs) for i in top]) for s in fine]
    k = int(np.argmax(score))
    return float(fine[k]), float(score[k])


def estimate_scale(ref, cur):
    """(s, spread, iou, [iou, blob, hb0, hb7]): s multiplica os quadros da folha para igualá-los ao Idle."""
    s_iou, iou = _curve_scale(ref['sil'], cur['sil'])
    s_blob, _ = _curve_scale(ref['blob'], cur['blob'])
    ref_hb = float(np.median(sorted(ref['hb'])[-3:]))
    ests = [s_iou, s_blob, ref_hb / cur['hb'][0]]
    hb7 = ref_hb / cur['hb'][7]
    return float(np.median(ests)), float(max(ests) - min(ests)), iou, ests + [hb7]


# =============================================================================================
# 4. Render
# =============================================================================================
def resize_premult(im, size):
    return im.convert('RGBa').resize(size, Image.Resampling.LANCZOS).convert('RGBA')


def place(canvas, im, px, py):
    sx, sy = max(0, -px), max(0, -py)
    ex, ey = min(im.width, canvas.width - px), min(im.height, canvas.height - py)
    if ex > sx and ey > sy:
        canvas.alpha_composite(im.crop((sx, sy, ex, ey)), (px + sx, py + sy))


def _edge_cut_sides(rgba, L, label, x0, y0, x1, y1):
    """Bordas da FOLHA em que este quadro tem efeito translúcido cortado em linha reta."""
    H, W = L.shape
    a = rgba[..., 3]
    own = L == label
    sides = []
    tests = {
        'top': own[:2, :] & (a[:2, :] >= 24),
        'bottom': own[-2:, :] & (a[-2:, :] >= 24),
        'left': own[:, :2] & (a[:, :2] >= 24),
        'right': own[:, -2:] & (a[:, -2:] >= 24),
    }
    for side, t in tests.items():
        if t.sum() >= 12:
            sides.append(side)
    return sides


def render_frame(rgba, L, f, k, hero_cfg, sheet_sides):
    W_out = hero_cfg['left'] + hero_cfg['right']
    H_out = hero_cfg['up'] + hero_cfg['down']
    x0, y0, x1, y1 = f['bbox']
    pad = 2
    x0p, y0p = max(0, x0 - pad), max(0, y0 - pad)
    x1p, y1p = min(rgba.shape[1] - 1, x1 + pad), min(rgba.shape[0] - 1, y1 + pad)
    crop = rgba[y0p:y1p + 1, x0p:x1p + 1].copy()
    crop[L[y0p:y1p + 1, x0p:x1p + 1] != f['cell'] + 1] = 0  # só o que pertence a ESTE quadro

    # degradê onde a folha cortou o efeito em linha reta (coordenadas do recorte)
    if sheet_sides:
        a = crop[..., 3].astype(np.float32)
        h, w = a.shape
        ramp = np.ones_like(a)
        n = SHEET_EDGE_FADE
        if 'top' in sheet_sides and y0p == 0:
            ramp = np.minimum(ramp, (np.clip(np.arange(h) / n, 0, 1) ** 1.5)[:, None])
        if 'bottom' in sheet_sides and y1p == rgba.shape[0] - 1:
            ramp = np.minimum(ramp, (np.clip((h - 1 - np.arange(h)) / n, 0, 1) ** 1.5)[:, None])
        if 'left' in sheet_sides and x0p == 0:
            ramp = np.minimum(ramp, (np.clip(np.arange(w) / n, 0, 1) ** 1.5)[None, :])
        if 'right' in sheet_sides and x1p == rgba.shape[1] - 1:
            ramp = np.minimum(ramp, (np.clip((w - 1 - np.arange(w)) / n, 0, 1) ** 1.5)[None, :])
        crop[..., 3] = np.where(a < 250, a * ramp, a).astype(np.uint8)

    im = Image.fromarray(crop, 'RGBA')
    size = (max(1, round(im.width * k)), max(1, round(im.height * k)))
    im = resize_premult(im, size)
    px = round(hero_cfg['left'] - (f['cx'] - x0p) * k)
    py = round(hero_cfg['up'] - (f['ground'] - y0p) * k)
    canvas = Image.new('RGBA', (W_out, H_out), (0, 0, 0, 0))
    place(canvas, im, px, py)

    arr = np.array(canvas)
    a = arr[..., 3].astype(np.float32)
    xs = np.arange(W_out, dtype=np.float32)
    ys = np.arange(H_out, dtype=np.float32)
    ramp = np.minimum(
        np.clip(np.minimum(xs, W_out - 1 - xs) / EDGE_FADE, 0, 1)[None, :],
        np.clip(ys / EDGE_FADE, 0, 1)[:, None],
    )
    a = np.where(a < 250, a * ramp, a)
    below = ys - hero_cfg['up']
    g0, g1 = GROUND_FADE
    bramp = np.clip(1 - (below - g0) / (g1 - g0), 0, 1)
    arr[..., 3] = np.clip(a * bramp[:, None], 0, 255).astype(np.uint8)
    arr[arr[..., 3] == 0] = 0
    return Image.fromarray(arr, 'RGBA')


def save_png(im, path, quantize=False):
    if quantize:
        im = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    buf = io.BytesIO()
    im.save(buf, format='PNG', optimize=True)
    for attempt in range(10):
        try:
            with open(path, 'wb') as fh:
                fh.write(buf.getvalue())
            return len(buf.getvalue())
        except OSError:
            if attempt == 9:
                raise
            time.sleep(0.3)


# =============================================================================================
# 5. Driver
# =============================================================================================
CACHE_DIR = None  # --cache DIR: guarda a segmentação de cada folha (só acelera reexecuções)


def prepare_sheet(args):
    hero, state, path, cache_dir, ref = args
    cache = None
    out = None
    if cache_dir:
        st = os.stat(path)
        key = hashlib.md5(f'{path}|{st.st_mtime_ns}|{st.st_size}'.encode()).hexdigest()
        cache = os.path.join(cache_dir, f'{hero}_{state}_{key}.pkl.gz')
        if os.path.exists(cache):
            with gzip.open(cache, 'rb') as fh:
                out = pickle.load(fh)
    if out is None:
        rgba = load_sheet(path)
        L, _ = segment(rgba[..., 3], f'{hero}/{state}')
        frames = analyse(rgba[..., 3], L)
        out = (rgba, L, frames, scale_masks(frames))
        if cache:
            os.makedirs(cache_dir, exist_ok=True)
            with gzip.open(cache, 'wb', compresslevel=1) as fh:
                pickle.dump(out, fh, protocol=4)
    rgba, L, frames, masks = out
    est = estimate_scale(ref, masks) if ref is not None else (1.0, 0.0, 1.0, [])
    return rgba, L, frames, masks, est


def process_hero(hero, only_states, measure, preview_dir, log):
    cfg = HEROES[hero]
    hero_dir = os.path.join(HEROES_DIR, hero)
    sheets = {}
    for state in SHEET_NAMES:
        p = sheet_path(hero, state)
        if p:
            sheets[state] = p
    if 'idle' not in sheets:
        sys.exit(f'{hero}: sem folha Idle (referência de escala)')

    todo_states = [st for st in sheets if st == 'idle' or not only_states or st in only_states]
    t0 = time.time()
    data = {'idle': prepare_sheet((hero, 'idle', sheets['idle'], CACHE_DIR, None))}
    ref = data['idle'][3]
    others = [st for st in todo_states if st != 'idle']
    with concurrent.futures.ProcessPoolExecutor() as pool:
        args = [(hero, st, sheets[st], CACHE_DIR, ref) for st in others]
        for st, res in zip(others, pool.map(prepare_sheet, args)):
            data[st] = res
    log(f'  {len(todo_states)} folhas segmentadas e medidas em {time.time() - t0:.1f}s')
    idle_h = float(np.median([f['sil_h'] for f in data['idle'][2]]))
    k_idle = cfg['target'] / idle_h
    log(f'  Idle: silhueta {idle_h:.0f}px -> alvo {cfg["target"]}px (k={k_idle:.3f})')

    todo = [s for s in todo_states if s != 'idle']
    if not only_states or 'idle' in only_states:
        todo = ['idle'] + todo
    summary, extents = {}, dict(left=0, right=0, up=0, down=0)
    for state in todo:
        rgba, L, frames, _, (s, spread, iou, ests) = data[state]
        s *= OVERRIDES.get((hero, state), {}).get('scale', 1.0)
        k = k_idle * s
        flag = '   <-- spread alto, conferir a escala' if spread > 0.12 else ''
        detail = (f'iou {ests[0]:.2f} blob {ests[1]:.2f} hb0 {ests[2]:.2f} hb7 {ests[3]:.2f}; spread {spread:.2f}'
                  if ests else 'referência')
        log(f'  {state:17s} escala x{s:.2f}  ({detail}){flag}')
        out = []
        for f in frames:
            sides = _edge_cut_sides(rgba, L, f['cell'] + 1, *f['bbox'])
            im = render_frame(rgba, L, f, k, cfg, sides)
            out.append(im)
            if measure:
                a = np.array(im)[..., 3] >= 24
                ys, xs = np.where(a)
                if len(xs):
                    extents['left'] = max(extents['left'], cfg['left'] - int(xs.min()))
                    extents['right'] = max(extents['right'], int(xs.max()) - cfg['left'])
                    extents['up'] = max(extents['up'], cfg['up'] - int(ys.min()))
                    extents['down'] = max(extents['down'], int(ys.max()) - cfg['up'])
        summary[state] = out
        if not measure:
            for i, im in enumerate(out):
                save_png(im, os.path.join(hero_dir, f'{state}_{i:02d}.png'), state in QUANTIZE_STATES)
            # quadros antigos além dos 8 novos (o estado ficou com menos quadros)
            for fname in os.listdir(hero_dir):
                if fname.startswith(state + '_') and fname.endswith('.png'):
                    idx = fname[len(state) + 1:-4]
                    if idx.isdigit() and int(idx) >= FRAMES:
                        os.remove(os.path.join(hero_dir, fname))
    if measure:
        log(f'  extensão necessária (alpha>=24): {extents}')
    if preview_dir:
        write_preview(hero, summary, cfg, preview_dir)
    return summary


def write_preview(hero, summary, cfg, preview_dir):
    os.makedirs(preview_dir, exist_ok=True)
    W_out, H_out = cfg['left'] + cfg['right'], cfg['up'] + cfg['down']
    bg = (60, 78, 62, 255)
    for state, frames in summary.items():
        sheet = Image.new('RGBA', (COLS * W_out, ROWS * H_out), bg)
        d = ImageDraw.Draw(sheet)
        for i, fr in enumerate(frames):
            ox, oy = (i % COLS) * W_out, (i // COLS) * H_out
            sheet.alpha_composite(fr, (ox, oy))
            d.line([(ox, oy + cfg['up']), (ox + W_out, oy + cfg['up'])], fill=(70, 200, 90, 255))
            d.line([(ox + cfg['left'], oy), (ox + cfg['left'], oy + H_out)], fill=(70, 120, 220, 255))
            d.rectangle([ox, oy, ox + W_out - 1, oy + H_out - 1], outline=(110, 110, 130, 255))
            d.text((ox + 4, oy + 4), f'{state} {i}', fill=(255, 255, 255, 255))
        sheet.convert('RGB').save(os.path.join(preview_dir, f'{hero}_{state}.png'))
        gif = Image.new('RGBA', (W_out, H_out), bg)
        frames_bg = []
        for fr in frames:
            g = gif.copy()
            g.alpha_composite(fr)
            frames_bg.append(g.convert('RGB'))
        frames_bg[0].save(os.path.join(preview_dir, f'{hero}_{state}.gif'), save_all=True,
                          append_images=frames_bg[1:], duration=120, loop=0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('targets', nargs='*', help='herói ou herói:estado (padrão: todos)')
    ap.add_argument('--measure', action='store_true', help='só mede a extensão necessária do canvas')
    ap.add_argument('--preview', metavar='DIR', help='grava tiras/GIFs de conferência nesta pasta')
    ap.add_argument('--cache', metavar='DIR', help='guarda a segmentação das folhas (só para iterar mais rápido)')
    args = ap.parse_args()
    global CACHE_DIR
    CACHE_DIR = os.path.abspath(args.cache) if args.cache else None

    wanted = {}
    for t in args.targets or list(HEROES):
        hero, _, state = t.partition(':')
        if hero not in HEROES:
            sys.exit(f'herói desconhecido: {hero} (opções: {", ".join(HEROES)})')
        wanted.setdefault(hero, set())
        if state:
            wanted[hero].add(state)

    def log(msg):
        print(msg, flush=True)

    for hero, states in wanted.items():
        log(f'== {hero}')
        process_hero(hero, states, args.measure, args.preview, log)
    log('Pronto.' if not args.measure else 'Medição concluída (nada foi gravado).')


if __name__ == '__main__':
    main()
