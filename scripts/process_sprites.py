import os
import sys
from collections import deque
from PIL import Image

def process_frame(in_path: str, out_path: str, target_size=(96, 128)):
    im = Image.open(in_path).convert('RGBA')
    w, h = im.size
    pix = im.load()

    def is_bg(r, g, b):
        # Light neutral grey background check
        return (abs(r - g) < 22 and abs(g - b) < 22 and abs(r - b) < 22 and r > 135)

    visited = set()
    bg_set = set()

    for y in range(h):
        for x in range(w):
            if (x, y) not in visited and is_bg(*pix[x, y][:3]):
                comp = []
                q = deque([(x, y)])
                visited.add((x, y))
                is_border_connected = False
                while q:
                    cx, cy = q.popleft()
                    comp.append((cx, cy))
                    if cx == 0 or cx == w - 1 or cy == 0 or cy == h - 1:
                        is_border_connected = True
                    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited and is_bg(*pix[nx, ny][:3]):
                            visited.add((nx, ny))
                            q.append((nx, ny))
                if is_border_connected or len(comp) > 200:
                    for px, py in comp:
                        bg_set.add((px, py))

    out_img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out_pix = out_img.load()
    for y in range(h):
        for x in range(w):
            if (x, y) in bg_set:
                out_pix[x, y] = (0, 0, 0, 0)
            else:
                out_pix[x, y] = pix[x, y]

    resized = out_img.resize(target_size, Image.Resampling.LANCZOS)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    resized.save(out_path, 'PNG')
    print(f"Processed {in_path} -> {out_path} ({target_size[0]}x{target_size[1]})")

if __name__ == '__main__':
    if len(sys.argv) >= 3:
        process_frame(sys.argv[1], sys.argv[2])

