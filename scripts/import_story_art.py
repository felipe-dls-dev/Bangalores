"""Importa cenas das Crônicas geradas fora do repositório (ex.: ChatGPT web) para o jogo.

Uso:
    python scripts/import_story_art.py <pasta-com-as-imagens>
    python scripts/import_story_art.py --manifest     (só refaz a lista, sem importar)

Cada imagem na pasta deve se chamar com o id do capítulo (ex.: `cofre_dos_reis.png`) ou de uma cinemática de ato
(`act-05-crossing.png`). O script corta para 16:9 pelo centro, redimensiona para 1280x720, salva em WebP (baixando a
qualidade até caber em ~250 KB) em public/assets/story/cinematics/ (atos) ou .../cinematics/chapters/ (capítulos), e
refaz src/data/storyScenes.json, a lista de cenas de capítulo que o jogo usa (capítulo fora da lista usa a arte do ato).
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
CINEMATICS = ROOT / 'public' / 'assets' / 'story' / 'cinematics'
CHAPTERS_DIR = CINEMATICS / 'chapters'
MANIFEST = ROOT / 'src' / 'data' / 'storyScenes.json'
EXPANSION = ROOT / 'src' / 'data' / 'storyExpansion.ts'
ACT_FILES = {'act-05-crossing', 'act-06-furnace', 'act-07-reactor', 'ending-two-worlds'}
SIZE = (1280, 720)
MAX_BYTES = 250 * 1024
IMAGE_SUFFIXES = {'.png', '.jpg', '.jpeg', '.webp'}


def chapter_ids():
    """Ids dos capítulos com escolhas em storyExpansion.ts (o capítulo final, sem escolhas, usa a arte do epílogo)."""
    text = EXPANSION.read_text(encoding='utf-8')
    ids = re.findall(r"id: '([a-z0-9_]+)', act: \d+", text)
    return [i for i in ids if i != 'epilogo_dois_mundos']


def normalize(stem):
    # "cofre_dos_reis (1)" ou "Cofre_dos_Reis" -> "cofre_dos_reis"
    return re.sub(r'\s*\(\d+\)$', '', stem.strip()).lower()


def save_webp(image, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    for quality in (82, 76, 70, 64, 58):
        image.save(dest, 'WEBP', quality=quality, method=6)
        if dest.stat().st_size <= MAX_BYTES:
            return quality
    return quality


def write_manifest(known):
    present = sorted(p.stem for p in CHAPTERS_DIR.glob('*.webp') if p.stat().st_size > 0 and p.stem in known)
    MANIFEST.write_text(json.dumps({'chapters': present}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return present


def main():
    known = chapter_ids()
    if len(sys.argv) == 2 and sys.argv[1] == '--manifest':
        present = write_manifest(set(known))
        print(f'Lista refeita: {len(present)} de {len(known)} capítulos com cena.')
        return
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    source = Path(sys.argv[1])
    if not source.is_dir():
        sys.exit(f'Pasta não encontrada: {source}')

    imported, skipped = [], []
    for path in sorted(source.iterdir()):
        if path.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        name = normalize(path.stem)
        if name in ACT_FILES:
            dest = CINEMATICS / f'{name}.webp'
        elif name in known:
            dest = CHAPTERS_DIR / f'{name}.webp'
        else:
            skipped.append(path.name)
            continue
        image = Image.open(path).convert('RGB')
        ratio = image.width / image.height
        warning = '' if ratio >= 1.3 else f'  (atenção: imagem {image.width}x{image.height} não é paisagem; o corte 16:9 perde muito)'
        fitted = ImageOps.fit(image, SIZE, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
        quality = save_webp(fitted, dest)
        imported.append(f'{dest.relative_to(ROOT).as_posix()}  {dest.stat().st_size // 1024} KB, qualidade {quality}{warning}')

    present = write_manifest(set(known))
    print(f'Importadas: {len(imported)}')
    for line in imported:
        print('  ' + line)
    if skipped:
        print(f'Ignoradas (o nome não é id de capítulo nem de ato): {", ".join(skipped)}')
    missing = [i for i in known if i not in present]
    print(f'Capítulos com cena: {len(present)} de {len(known)}.')
    if missing:
        print('Faltam: ' + ', '.join(missing))


if __name__ == '__main__':
    main()
