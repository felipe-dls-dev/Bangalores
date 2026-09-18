import os
import shutil
import collections
from PIL import Image

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WARRIOR_DIR = os.path.join(PROJECT_ROOT, 'public', 'assets', 'battle', 'sprites', 'heroes', 'guerreiro')
BASES_DIR = os.path.join(WARRIOR_DIR, 'Bases')
BKP_DIR = os.path.join(WARRIOR_DIR, 'bkp')
ARTIFACT_DIR = r'C:\Users\Felipe\.gemini\antigravity\brain\1c544ba1-a090-46c6-9fcb-ffddfb1452fc'

TARGET_W, TARGET_H = 96, 128
SCALE = 0.35
TARGET_GROUND_Y = 125
TARGET_ANCHOR_X = 44

def remove_checkerboard(cell):
    """Remove o fundo xadrez cinza e branco falso de imagens RGB."""
    w, h = cell.size
    visited = [[False]*h for _ in range(w)]
    q = collections.deque()
    
    def is_cb(r, g, b):
        return (max(r, g, b) - min(r, g, b) <= 20) and min(r, g, b) >= 190

    for x in range(w):
        for y in [0, h-1]:
            r, g, b, a = cell.getpixel((x, y))
            if is_cb(r, g, b) and not visited[x][y]:
                visited[x][y] = True
                q.append((x, y))
    for y in range(h):
        for x in [0, w-1]:
            r, g, b, a = cell.getpixel((x, y))
            if is_cb(r, g, b) and not visited[x][y]:
                visited[x][y] = True
                q.append((x, y))

    while q:
        cx, cy = q.popleft()
        for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                r, g, b, a = cell.getpixel((nx, ny))
                if is_cb(r, g, b):
                    visited[nx][ny] = True
                    q.append((nx, ny))

    for x in range(w):
        for y in range(h):
            if not visited[x][y]:
                r, g, b, a = cell.getpixel((x, y))
                if is_cb(r, g, b):
                    comp = []
                    cq = collections.deque([(x, y)])
                    visited[x][y] = True
                    while cq:
                        cur_x, cur_y = cq.popleft()
                        comp.append((cur_x, cur_y))
                        for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
                            nx, ny = cur_x + dx, cur_y + dy
                            if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                                nr, ng, nb, _ = cell.getpixel((nx, ny))
                                if is_cb(nr, ng, nb):
                                    visited[nx][ny] = True
                                    cq.append((nx, ny))
                    if len(comp) > 4:
                        for px, py in comp:
                            cell.putpixel((px, py), (0, 0, 0, 0))

    for x in range(w):
        for y in range(h):
            if visited[x][y]:
                cell.putpixel((x, y), (0, 0, 0, 0))
    return cell

def clean_stray_edge_components(crop, max_edge=30):
    """Elimina fragmentos desconexos que pertençam à linha superior/inferior."""
    if max_edge <= 0:
        return crop
    w, h = crop.size
    visited = [[False]*h for _ in range(w)]
    to_clear = []
    for x in range(w):
        for y in range(h):
            if crop.getpixel((x, y))[3] > 20 and not visited[x][y]:
                comp = []
                q = collections.deque([(x, y)])
                visited[x][y] = True
                while q:
                    cx, cy = q.popleft()
                    comp.append((cx, cy))
                    for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                            if crop.getpixel((nx, ny))[3] > 20:
                                visited[nx][ny] = True
                                q.append((nx, ny))
                if max(p[1] for p in comp) < max_edge:
                    to_clear.extend(comp)
    out = crop.copy()
    for px, py in to_clear:
        out.putpixel((px, py), (0, 0, 0, 0))
    return out

def process_attack():
    print("Processando Ataque.png (12 frames)...")
    img = Image.open(os.path.join(BASES_DIR, 'Ataque.png')).convert('RGBA')
    row_ranges = [
        (10, 390, 378),
        (413, 711, 708),
        (716, 1007, 1005)
    ]
    col_ranges = [
        [(70, 332), (440, 716), (829, 1090), (1174, 1455)],
        [(48, 306), (403, 738), (772, 1177), (1204, 1530)],
        [(59, 423), (448, 731), (807, 1104), (1207, 1492)]
    ]
    frames = []
    idx = 0
    for r_idx, (y0, y1, gy) in enumerate(row_ranges):
        for c_idx, (x0, x1) in enumerate(col_ranges[r_idx]):
            crop = img.crop((max(0, x0-20), y0, min(img.width, x1+20), y1))
            cleaned = remove_checkerboard(crop)
            
            crop_gy = gy - y0
            boot_xs = []
            for by in range(crop_gy - 30, crop_gy + 5):
                if by < 0 or by >= cleaned.height: continue
                for bx in range(cleaned.width):
                    if cleaned.getpixel((bx, by))[3] > 20:
                        boot_xs.append(bx)
            anchor_x = (min(boot_xs) + max(boot_xs)) / 2 if boot_xs else cleaned.width / 2
            
            cw = int(cleaned.width * SCALE)
            ch = int(cleaned.height * SCALE)
            scaled = cleaned.resize((cw, ch), Image.Resampling.LANCZOS)
            
            scaled_anchor_x = int(anchor_x * SCALE)
            scaled_gy = int(crop_gy * SCALE)
            
            canvas = Image.new('RGBA', (TARGET_W, TARGET_H), (0, 0, 0, 0))
            pos_x = TARGET_ANCHOR_X - scaled_anchor_x
            pos_y = TARGET_GROUND_Y - scaled_gy
            canvas.paste(scaled, (pos_x, pos_y), scaled)
            
            out_file = os.path.join(WARRIOR_DIR, f'attack_{idx:02d}.png')
            canvas.save(out_file)
            frames.append(canvas)
            idx += 1
            
    gif_file = os.path.join(ARTIFACT_DIR, 'preview_attack.gif')
    frames[0].save(gif_file, save_all=True, append_images=frames[1:], duration=150, loop=0, disposal=2)
    print(f"Salvo {idx} quadros de attack e {gif_file}")

def process_idle():
    print("Processando Descanso.png (12 frames)...")
    img = Image.open(os.path.join(BASES_DIR, 'Descanso.png')).convert('RGBA')
    row_ranges = [
        (10, 355, 353),
        (364, 688, 684),
        (689, 1004, 1003)
    ]
    col_ranges = [
        [(57, 345), (443, 731), (806, 1114), (1184, 1498)],
        [(56, 347), (420, 735), (812, 1118), (1191, 1498)],
        [(42, 349), (432, 740), (807, 1117), (1203, 1502)]
    ]
    frames = []
    idx = 0
    for r_idx, (y0, y1, gy) in enumerate(row_ranges):
        for c_idx, (x0, x1) in enumerate(col_ranges[r_idx]):
            crop = img.crop((max(0, x0-20), y0, min(img.width, x1+20), y1))
            cleaned = remove_checkerboard(crop)
            
            crop_gy = gy - y0
            boot_xs = []
            for by in range(crop_gy - 30, crop_gy + 5):
                if by < 0 or by >= cleaned.height: continue
                for bx in range(cleaned.width):
                    if cleaned.getpixel((bx, by))[3] > 20:
                        boot_xs.append(bx)
            anchor_x = (min(boot_xs) + max(boot_xs)) / 2 if boot_xs else cleaned.width / 2
            
            cw = int(cleaned.width * SCALE)
            ch = int(cleaned.height * SCALE)
            scaled = cleaned.resize((cw, ch), Image.Resampling.LANCZOS)
            
            scaled_anchor_x = int(anchor_x * SCALE)
            scaled_gy = int(crop_gy * SCALE)
            
            canvas = Image.new('RGBA', (TARGET_W, TARGET_H), (0, 0, 0, 0))
            pos_x = TARGET_ANCHOR_X - scaled_anchor_x
            pos_y = TARGET_GROUND_Y - scaled_gy
            canvas.paste(scaled, (pos_x, pos_y), scaled)
            
            out_file = os.path.join(WARRIOR_DIR, f'idle_{idx:02d}.png')
            canvas.save(out_file)
            frames.append(canvas)
            idx += 1
            
    gif_file = os.path.join(ARTIFACT_DIR, 'preview_idle.gif')
    frames[0].save(gif_file, save_all=True, append_images=frames[1:], duration=140, loop=0, disposal=2)
    print(f"Salvo {idx} quadros de idle e {gif_file}")

def process_defend():
    print("Processando Defesa.png (12 frames)...")
    img = Image.open(os.path.join(BASES_DIR, 'Defesa.png'))
    row_ranges = [
        (6, 370, 366),
        (375, 704, 704),
        (708, 1009, 1000)
    ]
    col_ranges = [
        [(40, 386), (420, 706), (816, 1086), (1185, 1468)],
        [(35, 371), (416, 749), (791, 1139), (1172, 1486)],
        [(26, 310), (419, 699), (800, 1141), (1186, 1518)]
    ]
    frames = []
    idx = 0
    for r_idx, (y0, y1, gy) in enumerate(row_ranges):
        for c_idx, (x0, x1) in enumerate(col_ranges[r_idx]):
            crop = img.crop((max(0, x0-20), y0, min(img.width, x1+20), y1))
            cleaned = clean_stray_edge_components(crop, max_edge=30 if r_idx > 0 else 0)
            
            crop_gy = gy - y0
            boot_xs = []
            for by in range(crop_gy - 30, crop_gy + 5):
                if by < 0 or by >= cleaned.height: continue
                for bx in range(cleaned.width):
                    if cleaned.getpixel((bx, by))[3] > 20:
                        boot_xs.append(bx)
            anchor_x = (min(boot_xs) + max(boot_xs)) / 2 if boot_xs else cleaned.width / 2
            
            cw = int(cleaned.width * SCALE)
            ch = int(cleaned.height * SCALE)
            scaled = cleaned.resize((cw, ch), Image.Resampling.LANCZOS)
            
            scaled_anchor_x = int(anchor_x * SCALE)
            scaled_gy = int(crop_gy * SCALE)
            
            canvas = Image.new('RGBA', (TARGET_W, TARGET_H), (0, 0, 0, 0))
            pos_x = TARGET_ANCHOR_X - scaled_anchor_x
            pos_y = TARGET_GROUND_Y - scaled_gy
            canvas.paste(scaled, (pos_x, pos_y), scaled)
            
            out_file = os.path.join(WARRIOR_DIR, f'defend_{idx:02d}.png')
            canvas.save(out_file)
            frames.append(canvas)
            idx += 1
            
    gif_file = os.path.join(ARTIFACT_DIR, 'preview_defend.gif')
    frames[0].save(gif_file, save_all=True, append_images=frames[1:], duration=130, loop=0, disposal=2)
    print(f"Salvo {idx} quadros de defend e {gif_file}")

def process_critico():
    print("Processando Critico.png (17 frames)...")
    img = Image.open(os.path.join(BASES_DIR, 'Critico.png'))
    row_defs = [
        (10, 308, 296, 5),
        (312, 570, 550, 4),
        (574, 800, 786, 4),
        (803, 1008, 998, 4)
    ]
    frames = []
    idx = 0
    for r_idx, (y0, y1, gy, cols) in enumerate(row_defs):
        col_w = img.width / cols
        for c_idx in range(cols):
            x0 = int(c_idx * col_w)
            x1 = int((c_idx + 1) * col_w)
            crop = img.crop((x0, y0, x1, y1))
            
            crop_gy = gy - y0
            boot_xs = []
            for by in range(crop_gy - 30, crop_gy + 5):
                if by < 0 or by >= crop.height: continue
                for bx in range(crop.width):
                    p = crop.getpixel((bx, by))
                    if p[3] > 150 and (p[0] > 90 or (p[0] < 40 and p[1] < 40 and p[2] < 40)):
                        boot_xs.append(bx)
            anchor_x = (min(boot_xs) + max(boot_xs)) / 2 if boot_xs else crop.width / 2
            
            cw = int(crop.width * SCALE)
            ch = int(crop.height * SCALE)
            scaled = crop.resize((cw, ch), Image.Resampling.LANCZOS)
            
            scaled_anchor_x = int(anchor_x * SCALE)
            scaled_gy = int(crop_gy * SCALE)
            
            canvas = Image.new('RGBA', (TARGET_W, TARGET_H), (0, 0, 0, 0))
            pos_x = TARGET_ANCHOR_X - scaled_anchor_x
            pos_y = TARGET_GROUND_Y - scaled_gy
            canvas.paste(scaled, (pos_x, pos_y), scaled)
            
            out_file = os.path.join(WARRIOR_DIR, f'heavy_{idx:02d}.png')
            canvas.save(out_file)
            frames.append(canvas)
            idx += 1
            
    gif_file = os.path.join(ARTIFACT_DIR, 'preview_critico.gif')
    frames[0].save(gif_file, save_all=True, append_images=frames[1:], duration=130, loop=0, disposal=2)
    print(f"Salvo {idx} quadros de heavy e {gif_file}")

def process_ultimate():
    print("Processando Ultimate.png (17 frames)...")
    img = Image.open(os.path.join(BASES_DIR, 'Ultimate.png'))
    row_defs = [
        (10, 300, 310, 5),
        (305, 555, 560, 4),
        (560, 792, 785, 4),
        (795, 1010, 1005, 4)
    ]
    frames = []
    idx = 0
    for r_idx, (y0, y1, gy, cols) in enumerate(row_defs):
        col_w = img.width / cols
        for c_idx in range(cols):
            x0 = int(c_idx * col_w)
            x1 = int((c_idx + 1) * col_w)
            crop = img.crop((x0, y0, x1, y1))
            
            cell_center_x = crop.width / 2
            crop_gy = gy - y0
            
            cw = int(crop.width * SCALE)
            ch = int(crop.height * SCALE)
            scaled = crop.resize((cw, ch), Image.Resampling.LANCZOS)
            
            scaled_anchor_x = int(cell_center_x * SCALE)
            scaled_gy = int(crop_gy * SCALE)
            
            canvas = Image.new('RGBA', (TARGET_W, TARGET_H), (0, 0, 0, 0))
            pos_x = TARGET_ANCHOR_X - scaled_anchor_x
            pos_y = TARGET_GROUND_Y - scaled_gy
            canvas.paste(scaled, (pos_x, pos_y), scaled)
            
            out_file = os.path.join(WARRIOR_DIR, f'ultimate_{idx:02d}.png')
            canvas.save(out_file)
            frames.append(canvas)
            idx += 1
            
    gif_file = os.path.join(ARTIFACT_DIR, 'preview_ultimate.gif')
    frames[0].save(gif_file, save_all=True, append_images=frames[1:], duration=140, loop=0, disposal=2)
    print(f"Salvo {idx} quadros de ultimate e {gif_file}")

def restore_other_actions_from_bkp():
    print("Restaurando as outras ações de apoio de bkp/...")
    if not os.path.exists(BKP_DIR):
        print("Diretório bkp/ não encontrado, nada a restaurar.")
        return
    other_prefixes = [
        'hit_', 'dodge_', 'potion_', 'skill_',
        'stance_defensive_', 'stance_offensive_',
        'victory_', 'defeat_'
    ]
    restored = 0
    for fname in os.listdir(BKP_DIR):
        if any(fname.startswith(p) for p in other_prefixes) and fname.endswith('.png'):
            src = os.path.join(BKP_DIR, fname)
            dst = os.path.join(WARRIOR_DIR, fname)
            shutil.copy2(src, dst)
            restored += 1
    print(f"Restaurados {restored} arquivos de animações complementares de bkp/.")
    # No guerreiro, receber ataque do inimigo utiliza a folha Defesa.png
    print("Sincronizando hit_*.png com as imagens de Defesa.png...")
    for i in range(12):
        src = os.path.join(WARRIOR_DIR, f'defend_{i:02d}.png')
        dst = os.path.join(WARRIOR_DIR, f'hit_{i:02d}.png')
        shutil.copy2(src, dst)
    print("hit_*.png sincronizado com Defesa.png!")

if __name__ == '__main__':
    process_attack()
    process_idle()
    process_defend()
    process_critico()
    process_ultimate()
    restore_other_actions_from_bkp()
    print("Processamento completo com sucesso!")
