"""Gera as versões leves das artes dos heróis usadas na seleção de herói do modo Moderno.

As artes originais (public/assets/heroes/*.png) têm 2 a 3 MB cada; a tela mostra os 9 ao mesmo tempo,
então o modo Moderno usa estas cópias: um retrato grande (figure) e uma miniatura (thumb).
Não altera nenhuma arte original.

Uso: python scripts/make_hero_select_assets.py
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "assets" / "ui" / "select"
FIGURE_HEIGHT = 1080
THUMB_HEIGHT = 300


def save(image: Image.Image, height: int, target: Path, quality: int) -> None:
    width = round(image.width * height / image.height)
    resized = image.resize((width, height), Image.LANCZOS)
    resized.save(target, "WEBP", quality=quality, method=6)
    print(f"{target.relative_to(ROOT)}  {resized.size}  {target.stat().st_size // 1024} KB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    heroes = json.loads((ROOT / "src" / "data" / "herois.json").read_text(encoding="utf8"))
    for hero in heroes:
        source = Image.open(ROOT / "public" / hero["arte"]).convert("RGB")
        save(source, FIGURE_HEIGHT, OUT / f"{hero['id']}-figure.webp", 84)
        save(source, THUMB_HEIGHT, OUT / f"{hero['id']}-thumb.webp", 80)


if __name__ == "__main__":
    main()
