import os
import math
from PIL import Image, ImageDraw, ImageEnhance, ImageChops

BASE_DIR = os.path.join("public", "assets", "battle", "sprites", "heroes", "guerreiro")

def get_idle_frame(idx: int) -> Image.Image:
    idx = max(0, min(5, idx))
    p = os.path.join(BASE_DIR, f"idle_{idx:02d}.png")
    return Image.open(p).convert("RGBA")

def get_base_frame() -> Image.Image:
    return get_idle_frame(0)

def offset_sprite(img: Image.Image, dx: int, dy: int, rotate_deg: float = 0.0, scale: float = 1.0) -> Image.Image:
    w, h = img.size
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    
    transformed = img
    if scale != 1.0:
        nw = max(1, int(w * scale))
        nh = max(1, int(h * scale))
        transformed = transformed.resize((nw, nh), Image.Resampling.BILINEAR)
    
    if rotate_deg != 0.0:
        transformed = transformed.rotate(rotate_deg, resample=Image.Resampling.BILINEAR, expand=False)
        
    tw, th = transformed.size
    px = dx + (w - tw) // 2
    py = dy + (h - th)
    canvas.alpha_composite(transformed, (px, py))
    return canvas

def tint_sprite(img: Image.Image, r_mul: float, g_mul: float, b_mul: float, alpha_mul: float = 1.0) -> Image.Image:
    r, g, b, a = img.split()
    r = ImageEnhance.Brightness(r).enhance(r_mul)
    g = ImageEnhance.Brightness(g).enhance(g_mul)
    b = ImageEnhance.Brightness(b).enhance(b_mul)
    if alpha_mul != 1.0:
        a = ImageEnhance.Brightness(a).enhance(alpha_mul)
    return Image.merge("RGBA", (r, g, b, a))

def save_frame(img: Image.Image, state: str, idx: int):
    out_path = os.path.join(BASE_DIR, f"{state}_{idx:02d}.png")
    img.save(out_path, "PNG")
    print(f"Saved {out_path} ({img.size[0]}x{img.size[1]})")

# 1. STANCE_OFFENSIVE (6 frames, synced with breathing loop)
def generate_stance_offensive():
    print("Generating stance_offensive (6 frames)...")
    for i in range(6):
        base = get_idle_frame(i)
        # Shift forward +3px, slight crouch (-1px), blade glint
        f = offset_sprite(base, dx=3, dy=1, rotate_deg=1.0)
        # Add subtle crimson glow around sword edge
        draw = ImageDraw.Draw(f)
        draw.line([50, 85, 78, 110], fill=(220, 40, 30, 90), width=3)
        draw.line([52, 87, 80, 112], fill=(255, 180, 50, 110), width=1)
        save_frame(f, "stance_offensive", i)

# 2. STANCE_DEFENSIVE (6 frames, synced with breathing loop)
def generate_stance_defensive():
    print("Generating stance_defensive (6 frames)...")
    for i in range(6):
        base = get_idle_frame(i)
        # Shift back -3px, solid stance, slight armor gleam
        f = offset_sprite(base, dx=-3, dy=0, rotate_deg=-1.0)
        draw = ImageDraw.Draw(f)
        # Subtle steel barrier shimmer
        draw.line([35, 45, 45, 95], fill=(160, 200, 240, 70), width=2)
        save_frame(f, "stance_defensive", i)

# 3. ATTACK (8 frames) - Preserved authentic AI generated top-to-bottom strike frames!
def generate_attack():
    print("Preserving authentic 8-frame downward sword strike frames (attack_00..07)...")
    # attack_00 to attack_07 are generated from authentic pixel art keyframes:
    # attack_00 (combat crouch), attack_01 (mid windup), attack_02 (overhead raise),
    # attack_03 (downward descent), attack_04 (cleave impact), attack_05 (follow-through),
    # attack_06 (recovery), attack_07 (return to guard).
    pass

# 4. HEAVY (10 frames) - Critical strike using authentic top-to-bottom cleave with crimson flames
def generate_heavy():
    print("Generating heavy (10 frames)...")
    atk_00 = Image.open(os.path.join(BASE_DIR, "attack_00.png")).convert("RGBA")
    atk_01 = Image.open(os.path.join(BASE_DIR, "attack_01.png")).convert("RGBA")
    atk_02 = Image.open(os.path.join(BASE_DIR, "attack_02.png")).convert("RGBA")
    atk_03 = Image.open(os.path.join(BASE_DIR, "attack_03.png")).convert("RGBA")
    atk_04 = Image.open(os.path.join(BASE_DIR, "attack_04.png")).convert("RGBA")
    atk_05 = Image.open(os.path.join(BASE_DIR, "attack_05.png")).convert("RGBA")
    
    # 00: Deep combat crouch gather
    f0 = offset_sprite(atk_00, dx=-1, dy=2, scale=0.98)
    save_frame(f0, "heavy", 0)
    
    # 01: Windup chamber with crimson flame embers on blade
    f1 = atk_01.copy()
    draw1 = ImageDraw.Draw(f1)
    draw1.line([25, 30, 48, 70], fill=(255, 60, 30, 200), width=3)
    draw1.line([28, 33, 46, 68], fill=(255, 200, 50, 220), width=1)
    save_frame(f1, "heavy", 1)
    
    # 02: High overhead raise with blazing crimson aura
    f2 = atk_02.copy()
    draw2 = ImageDraw.Draw(f2)
    draw2.line([38, 12, 78, 55], fill=(255, 40, 20, 220), width=4)
    draw2.line([40, 14, 76, 53], fill=(255, 220, 60, 240), width=2)
    save_frame(f2, "heavy", 2)
    
    # 03: Airborne forward jump with flame trail
    f3 = offset_sprite(atk_02, dx=4, dy=-2)
    draw3 = ImageDraw.Draw(f3)
    draw3.line([35, 10, 82, 58], fill=(255, 60, 20, 240), width=5)
    draw3.line([37, 12, 80, 56], fill=(255, 255, 255, 255), width=2)
    save_frame(f3, "heavy", 3)
    
    # 04: Downward cleave descent with blazing arc
    f4 = atk_03.copy()
    draw4 = ImageDraw.Draw(f4)
    draw4.arc([20, 10, 92, 110], start=260, end=50, fill=(255, 50, 20, 240), width=4)
    draw4.arc([22, 12, 90, 108], start=270, end=40, fill=(255, 200, 60, 255), width=2)
    save_frame(f4, "heavy", 4)
    
    # 05: Maximum ground impact / cleave strike
    f5 = atk_04.copy()
    draw5 = ImageDraw.Draw(f5)
    draw5.line([40, 15, 92, 105], fill=(255, 255, 255, 255), width=4)
    draw5.line([38, 12, 94, 107], fill=(255, 80, 20, 220), width=3)
    # Sparks at ground impact
    draw5.line([68, 115, 92, 108], fill=(255, 220, 80, 240), width=3)
    draw5.line([65, 118, 90, 125], fill=(255, 120, 30, 240), width=2)
    save_frame(f5, "heavy", 5)
    
    # 06: Shockwave lingering on follow-through
    f6 = atk_05.copy()
    draw6 = ImageDraw.Draw(f6)
    draw6.line([50, 50, 85, 110], fill=(255, 140, 40, 180), width=2)
    save_frame(f6, "heavy", 6)
    
    # 07: Low follow-through finish
    f7 = atk_05.copy()
    save_frame(f7, "heavy", 7)
    
    # 08: Drawing blade back up
    f8 = offset_sprite(atk_00, dx=3, dy=1)
    save_frame(f8, "heavy", 8)
    
    # 09: Return to combat stance
    f9 = atk_00.copy()
    save_frame(f9, "heavy", 9)

# 5. DEFEND (5 frames)
def generate_defend():
    print("Generating defend (5 frames)...")
    base = get_base_frame()
    
    # 00: Raise guard
    f0 = offset_sprite(base, dx=-2, dy=1, rotate_deg=-2.0)
    save_frame(f0, "defend", 0)
    
    # 01: Guard locked + blue/gold barrier flash
    f1 = offset_sprite(base, dx=-3, dy=1, rotate_deg=-3.0)
    draw1 = ImageDraw.Draw(f1)
    draw1.line([50, 40, 65, 100], fill=(200, 230, 255, 220), width=3)
    draw1.line([48, 38, 67, 102], fill=(255, 215, 0, 160), width=2)
    save_frame(f1, "defend", 1)
    
    # 02: Maximum impact absorption
    f2 = offset_sprite(base, dx=-4, dy=2, rotate_deg=-3.0)
    draw2 = ImageDraw.Draw(f2)
    draw2.line([48, 35, 68, 105], fill=(255, 255, 255, 255), width=4)
    draw2.line([45, 32, 71, 108], fill=(120, 200, 255, 200), width=2)
    # Spark radiating
    draw2.ellipse([55, 65, 65, 75], fill=(255, 255, 255, 240))
    save_frame(f2, "defend", 2)
    
    # 03: Holding firm as barrier fades
    f3 = offset_sprite(base, dx=-3, dy=1, rotate_deg=-2.0)
    draw3 = ImageDraw.Draw(f3)
    draw3.line([52, 45, 64, 95], fill=(160, 210, 255, 120), width=2)
    save_frame(f3, "defend", 3)
    
    # 04: Returning to neutral
    f4 = offset_sprite(base, dx=-1, dy=0, rotate_deg=0.0)
    save_frame(f4, "defend", 4)

# 6. HIT (4 frames) - Damage reaction
def generate_hit():
    print("Generating hit (4 frames)...")
    base = get_base_frame()
    
    # 00: Sudden hit, white flash tint, knockback -4px
    f0 = offset_sprite(base, dx=-4, dy=0, rotate_deg=-2.0)
    f0 = tint_sprite(f0, r_mul=1.8, g_mul=1.8, b_mul=1.8)
    save_frame(f0, "hit", 0)
    
    # 01: Maximum recoil -8px, tilted back -5 deg
    f1 = offset_sprite(base, dx=-8, dy=2, rotate_deg=-5.0)
    f1 = tint_sprite(f1, r_mul=1.3, g_mul=0.8, b_mul=0.8) # red pain tint
    save_frame(f1, "hit", 1)
    
    # 02: Recovery start -5px
    f2 = offset_sprite(base, dx=-5, dy=1, rotate_deg=-3.0)
    save_frame(f2, "hit", 2)
    
    # 03: Settling back -1px
    f3 = offset_sprite(base, dx=-1, dy=0, rotate_deg=-1.0)
    save_frame(f3, "hit", 3)

# 7. DODGE (5 frames)
def generate_dodge():
    print("Generating dodge (5 frames)...")
    base = get_base_frame()
    
    # 00: Lean back
    f0 = offset_sprite(base, dx=-4, dy=0, rotate_deg=-3.0)
    save_frame(f0, "dodge", 0)
    
    # 01: Fast backdash with ghost trail
    ghost = tint_sprite(base, 0.7, 0.7, 1.0, alpha_mul=0.4)
    f1 = offset_sprite(base, dx=-10, dy=1, rotate_deg=-4.0)
    f1.alpha_composite(ghost, (w_off := -4, 0))
    save_frame(f1, "dodge", 1)
    
    # 02: Low duck
    f2 = offset_sprite(base, dx=-7, dy=3, scale=0.96)
    save_frame(f2, "dodge", 2)
    
    # 03: Spring forward
    f3 = offset_sprite(base, dx=-2, dy=1, rotate_deg=1.0)
    save_frame(f3, "dodge", 3)
    
    # 04: Neutral
    f4 = offset_sprite(base, dx=0, dy=0, rotate_deg=0.0)
    save_frame(f4, "dodge", 4)

# 8. POTION (7 frames)
def generate_potion():
    print("Generating potion (7 frames)...")
    base = get_base_frame()
    
    # 00: Reach to belt
    f0 = offset_sprite(base, dx=0, dy=1)
    save_frame(f0, "potion", 0)
    
    # 01: Vial raised
    f1 = offset_sprite(base, dx=0, dy=0)
    draw1 = ImageDraw.Draw(f1)
    # Emerald potion vial near chest/chin
    draw1.ellipse([46, 38, 54, 46], fill=(50, 240, 100, 240), outline=(20, 120, 50, 255))
    save_frame(f1, "potion", 1)
    
    # 02: Drinking potion + emerald glow
    f2 = offset_sprite(base, dx=0, dy=-1, rotate_deg=-2.0)
    draw2 = ImageDraw.Draw(f2)
    draw2.ellipse([45, 34, 55, 44], fill=(80, 255, 140, 255))
    save_frame(f2, "potion", 2)
    
    # 03: Healing surge - emerald sparkles ascending
    f3 = tint_sprite(base, 0.9, 1.3, 1.0)
    draw3 = ImageDraw.Draw(f3)
    for sx, sy in [(35, 30), (55, 25), (42, 50), (60, 60), (30, 70), (50, 85)]:
        draw3.ellipse([sx-2, sy-2, sx+2, sy+2], fill=(120, 255, 160, 240))
    save_frame(f3, "potion", 3)
    
    # 04: Sparkles fading
    f4 = offset_sprite(base, dx=0, dy=0)
    draw4 = ImageDraw.Draw(f4)
    for sx, sy in [(37, 20), (53, 15), (44, 40), (58, 50)]:
        draw4.ellipse([sx-1, sy-1, sx+1, sy+1], fill=(180, 255, 200, 180))
    save_frame(f4, "potion", 4)
    
    # 05: Lower hand
    f5 = offset_sprite(base, dx=0, dy=0)
    save_frame(f5, "potion", 5)
    
    # 06: Back to ready
    f6 = offset_sprite(base, dx=0, dy=0)
    save_frame(f6, "potion", 6)

# 9. SKILL (10 frames) - "Ímpeto Marcial"
def generate_skill():
    print("Generating skill (10 frames)...")
    base = get_base_frame()
    
    for i in range(10):
        if i < 2:
            # Stance brace
            f = offset_sprite(base, dx=0, dy=1, rotate_deg=-1.0)
        elif i < 6:
            # Peak war cry: crimson flames erupting around warrior
            f = offset_sprite(base, dx=1, dy=-1, rotate_deg=1.0)
            f = tint_sprite(f, 1.4, 0.9, 0.9)
            draw = ImageDraw.Draw(f)
            # Flame aura around body
            aura_h = 10 + (i - 2) * 15
            draw.arc([20, 120 - aura_h, 80, 128], start=180, end=360, fill=(255, 40, 20, 180), width=4)
            draw.arc([25, 118 - aura_h, 75, 128], start=180, end=360, fill=(255, 180, 40, 220), width=2)
            # Glowing lion emblem on chest
            draw.ellipse([46, 32, 54, 40], fill=(255, 220, 60, 240))
        else:
            # Settling down with empowered blade
            f = offset_sprite(base, dx=2, dy=0)
            draw = ImageDraw.Draw(f)
            draw.line([50, 75, 78, 105], fill=(255, 80, 30, 160), width=2)
        save_frame(f, "skill", i)

# 10. ULTIMATE (12 frames) - "Lâmina do Vendaval de Ignaris"
def generate_ultimate():
    print("Generating ultimate (12 frames)...")
    base = get_base_frame()
    
    for i in range(12):
        if i < 3:
            # Gathering crimson energy
            f = offset_sprite(base, dx=-2 + i, dy=0, rotate_deg=-2.0)
            draw = ImageDraw.Draw(f)
            draw.ellipse([40 - i*4, 70 - i*4, 60 + i*4, 90 + i*4], outline=(255, 50, 20, 180), width=2)
        elif i < 6:
            # High speed forward dash + cross slashes
            f = offset_sprite(base, dx=8 + (i-3)*4, dy=1, rotate_deg=4.0)
            draw = ImageDraw.Draw(f)
            # Cross slash 1
            draw.line([30, 20, 92, 100], fill=(255, 255, 255, 255), width=5)
            draw.line([28, 18, 94, 102], fill=(255, 160, 30, 220), width=3)
            if i >= 4:
                # Cross slash 2 (X pattern)
                draw.line([92, 20, 30, 100], fill=(255, 255, 255, 255), width=5)
                draw.line([94, 18, 28, 102], fill=(255, 40, 20, 220), width=3)
        elif i < 9:
            # Explosive impact vortex
            f = offset_sprite(base, dx=14 - (i-6)*2, dy=1, rotate_deg=2.0)
            draw = ImageDraw.Draw(f)
            r_box = 15 + (i - 6) * 10
            draw.ellipse([60 - r_box, 60 - r_box, 60 + r_box, 60 + r_box], outline=(255, 200, 50, 200), width=3)
            draw.ellipse([60 - r_box//2, 60 - r_box//2, 60 + r_box//2, 60 + r_box//2], fill=(255, 255, 255, 160))
        else:
            # Epic finishing recovery
            f = offset_sprite(base, dx=4 - (i-9)*2, dy=0, rotate_deg=0.0)
            draw = ImageDraw.Draw(f)
            draw.line([50, 75, 80, 108], fill=(255, 100, 40, 140), width=2)
        save_frame(f, "ultimate", i)

# 11. VICTORY (8 frames, holds last frame)
def generate_victory():
    print("Generating victory (8 frames)...")
    base = get_base_frame()
    
    for i in range(8):
        if i == 0:
            f = offset_sprite(base, dx=0, dy=0)
        elif i < 3:
            # Straightening up, lowering ready guard
            f = offset_sprite(base, dx=0, dy=-1, scale=1.01)
        elif i < 6:
            # Raising sword high in salute
            f = offset_sprite(base, dx=0, dy=-2, scale=1.02)
            draw = ImageDraw.Draw(f)
            # Raised gleaming blade pointing to heaven
            draw.line([48, 8, 48, 50], fill=(255, 255, 255, 255), width=3)
            draw.line([46, 6, 50, 10], fill=(255, 215, 0, 220), width=2)
            if i >= 4:
                # Star glint on blade tip
                draw.line([44, 8, 52, 8], fill=(255, 255, 255, 255), width=2)
                draw.line([48, 4, 48, 12], fill=(255, 255, 255, 255), width=2)
        else:
            # Proud permanent victory pose
            f = offset_sprite(base, dx=0, dy=-2, scale=1.02)
            draw = ImageDraw.Draw(f)
            draw.line([48, 8, 48, 50], fill=(255, 255, 255, 255), width=3)
            draw.line([46, 6, 50, 10], fill=(255, 215, 0, 220), width=2)
            draw.line([45, 8, 51, 8], fill=(255, 255, 200, 240), width=2)
            draw.line([48, 5, 48, 11], fill=(255, 255, 200, 240), width=2)
        save_frame(f, "victory", i)

# 12. DEFEAT (8 frames, holds last frame)
def generate_defeat():
    print("Generating defeat (8 frames)...")
    base = get_base_frame()
    
    for i in range(8):
        if i == 0:
            # Lethal recoil
            f = offset_sprite(base, dx=-4, dy=1, rotate_deg=-3.0)
            f = tint_sprite(f, 1.4, 0.8, 0.8)
        elif i < 3:
            # Stumbling down
            f = offset_sprite(base, dx=-6, dy=4, rotate_deg=-5.0, scale=0.96)
            f = tint_sprite(f, 0.9, 0.8, 0.8)
        elif i < 6:
            # Dropping to one knee
            f = offset_sprite(base, dx=-6, dy=12, scale=0.88, rotate_deg=-3.0)
            f = tint_sprite(f, 0.8, 0.8, 0.85)
            draw = ImageDraw.Draw(f)
            # Sword tip planted in stone ground
            draw.line([55, 85, 55, 126], fill=(180, 180, 190, 240), width=2)
        else:
            # Final vanquished pose on knee, head bowed, held permanently
            f = offset_sprite(base, dx=-6, dy=14, scale=0.85, rotate_deg=-2.0)
            f = tint_sprite(f, 0.75, 0.75, 0.8)
            draw = ImageDraw.Draw(f)
            draw.line([54, 88, 54, 126], fill=(160, 160, 170, 220), width=2)
        save_frame(f, "defeat", i)

def main():
    print("=== Generating complete warrior battle animation frames ===")
    generate_stance_offensive()
    generate_stance_defensive()
    generate_attack()
    generate_heavy()
    generate_defend()
    generate_hit()
    generate_dodge()
    generate_potion()
    generate_skill()
    generate_ultimate()
    generate_victory()
    generate_defeat()
    print("=== All warrior animation frames generated successfully! ===")

if __name__ == "__main__":
    main()

