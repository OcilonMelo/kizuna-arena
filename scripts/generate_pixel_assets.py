import os
import math
import random
from PIL import Image, ImageDraw

OUT_DIR = r"C:\Users\manoel.ocilon\.gemini\antigravity\scratch\kizuna-arena\public\assets"
SPRITE_DIR = os.path.join(OUT_DIR, "sprites")
os.makedirs(SPRITE_DIR, exist_ok=True)


def clamp(v: int) -> int:
    return 0 if v < 0 else 255 if v > 255 else v


def tint_color(c, factor: float):
    r, g, b, a = c
    if a == 0:
        return (0, 0, 0, 0)
    return (clamp(int(r * factor)), clamp(int(g * factor)), clamp(int(b * factor)), a)


def scale2x_epx(img: Image.Image) -> Image.Image:
    """Classic pixel-art EPX / Scale2x algorithm: doubles resolution cleanly while beveling diagonal edges."""
    w, h = img.size
    src = img.load()
    out = Image.new("RGBA", (w * 2, h * 2), (0, 0, 0, 0))
    dst = out.load()

    for y in range(h):
        for x in range(w):
            P = src[x, y]
            A = src[x, y - 1] if y > 0 else (0, 0, 0, 0)
            B = src[x + 1, y] if x < w - 1 else (0, 0, 0, 0)
            C = src[x - 1, y] if x > 0 else (0, 0, 0, 0)
            D = src[x, y + 1] if y < h - 1 else (0, 0, 0, 0)

            p1 = A if (C == A and C != D and A != B) else P
            p2 = B if (A == B and A != C and B != D) else P
            p3 = C if (D == C and D != B and C != A) else P
            p4 = D if (B == D and B != A and D != C) else P

            dst[x * 2, y * 2] = p1
            dst[x * 2 + 1, y * 2] = p2
            dst[x * 2, y * 2 + 1] = p3
            dst[x * 2 + 1, y * 2 + 1] = p4
    return out


def enhance_pixel_art_128(raw_64: Image.Image) -> Image.Image:
    """
    Upgrades a 64x64 sprite into true 128x128 32-bit HD pixel art:
    1. Strip any flat outline, apply EPX/Scale2x to 128x128 for organic beveled pixel curves.
    2. Apply 3-tone directional pixel shading (top-right rim highlight, bottom-left shadow)
       + subtle Bayer 2x2 dithering on shaded bands.
    3. Apply selective dark internal shading lines (sel-out) between contrasting color regions.
    4. Finish with a crisp 1px dark exterior pixel outline.
    """
    # Step 1: Remove exterior dark outline if present so EPX smooths actual body shapes cleanly
    w0, h0 = raw_64.size
    cleaned = raw_64.copy()
    cpx = cleaned.load()
    for y in range(h0):
        for x in range(w0):
            if cpx[x, y] == (14, 10, 24, 255):
                cpx[x, y] = (0, 0, 0, 0)

    # Step 2: Double resolution 64x64 -> 128x128 with EPX pixel-art curve beveling
    hi = scale2x_epx(cleaned)
    w, h = hi.size
    src = hi.load()
    shaded = hi.copy()
    dst = shaded.load()

    def color_dist(c1, c2):
        return abs(c1[0] - c2[0]) + abs(c1[1] - c2[1]) + abs(c1[2] - c2[2])

    for y in range(h):
        for x in range(w):
            p = src[x, y]
            if p[3] == 0:
                continue

            up = src[x, y - 1] if y > 0 else (0, 0, 0, 0)
            down = src[x, y + 1] if y < h - 1 else (0, 0, 0, 0)
            left = src[x - 1, y] if x > 0 else (0, 0, 0, 0)
            right = src[x + 1, y] if x < w - 1 else (0, 0, 0, 0)

            # Skip pure white highlights / glowing cores
            luma = (p[0] * 299 + p[1] * 587 + p[2] * 114) / 1000
            if luma > 242:
                continue

            # Directional Rim Highlight (top & right edges exposed to light)
            if up[3] == 0 or (right[3] == 0 and y < h * 0.72):
                dst[x, y] = tint_color(p, 1.22)
            # Directional Bottom/Left Shadow with subtle 2x2 Bayer pixel dithering
            elif down[3] == 0 or left[3] == 0:
                dst[x, y] = tint_color(p, 0.74)
            else:
                # Internal boundary selective shading (separates clothing/armor/hair/weapons cleanly!)
                diff_down = color_dist(p, down) if down[3] > 0 else 0
                diff_left = color_dist(p, left) if left[3] > 0 else 0
                if diff_down > 95 or diff_left > 95:
                    dst[x, y] = tint_color(p, 0.78)
                elif (x + y) % 2 == 0:
                    # Subtle 2nd-pixel inner bevel highlight/shadow for 32-bit richness
                    up2 = src[x, y - 2] if y > 1 else (0, 0, 0, 0)
                    down2 = src[x, y + 2] if y < h - 2 else (0, 0, 0, 0)
                    if up2[3] == 0:
                        dst[x, y] = tint_color(p, 1.1)
                    elif down2[3] == 0:
                        dst[x, y] = tint_color(p, 0.88)

    # Step 3: Crisp 1px selective dark exterior outline at 128x128
    out = shaded.copy()
    opx = out.load()
    spx = shaded.load()
    for y in range(h):
        for x in range(w):
            if spx[x, y][3] == 0:
                neighbors = []
                for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and spx[nx, ny][3] > 0:
                        neighbors.append(spx[nx, ny])
                if neighbors:
                    # Colored dark sel-out (tinted dark version of adjacent pixel — pro pixel art look!)
                    nr = sum(n[0] for n in neighbors) // len(neighbors)
                    ng = sum(n[1] for n in neighbors) // len(neighbors)
                    nb = sum(n[2] for n in neighbors) // len(neighbors)
                    opx[x, y] = (max(10, int(nr * 0.22)), max(8, int(ng * 0.2)), max(18, int(nb * 0.26)), 255)
    return out


def add_outline(img: Image.Image, outline_color=(14, 10, 24, 255)) -> Image.Image:
    w, h = img.size
    src = img.load()
    out = img.copy()
    dst = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3] == 0:
                for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] > 0:
                        dst[x, y] = outline_color
                        break
    return out


def rect(d, x0, y0, x1, y1, color):
    d.rectangle([x0, y0, x1, y1], fill=color)


def poly(d, pts, color):
    d.polygon(pts, fill=color)


def draw_anime_head(d, cx, cy, skin, skin_sh, eye_main, eye_hi, hair_base, hair_sh, hair_hi, blush=None):
    # Neck
    rect(d, cx - 2, cy + 7, cx + 2, cy + 10, skin_sh)
    # Face oval/chin (anime 3/4 facing right)
    rect(d, cx - 7, cy - 6, cx + 7, cy + 5, skin)
    rect(d, cx - 6, cy + 5, cx + 6, cy + 7, skin)
    rect(d, cx - 4, cy + 7, cx + 4, cy + 8, skin)
    # Cheek & jaw shadow
    rect(d, cx - 7, cy - 4, cx - 5, cy + 5, skin_sh)
    rect(d, cx - 5, cy + 5, cx - 2, cy + 7, skin_sh)
    # Ear
    rect(d, cx - 8, cy, cx - 7, cy + 3, skin)
    rect(d, cx - 8, cy + 2, cx - 7, cy + 3, skin_sh)

    # Blush
    if blush:
        rect(d, cx - 1, cy + 3, cx + 1, cy + 4, blush)
        rect(d, cx + 5, cy + 3, cx + 6, cy + 4, blush)

    # Expressive Anime Eyes (3/4 view)
    # Left eye
    rect(d, cx - 1, cy - 1, cx + 2, cy + 3, (255, 255, 255, 255))
    rect(d, cx, cy - 1, cx + 2, cy + 2, eye_main)
    rect(d, cx + 1, cy, cx + 2, cy + 1, (20, 16, 32, 255))
    d.point((cx, cy), fill=(255, 255, 255, 255))
    d.point((cx + 1, cy + 2), fill=eye_hi)
    rect(d, cx - 1, cy - 2, cx + 2, cy - 2, (26, 20, 38, 255))  # lash/brow

    # Right eye
    rect(d, cx + 4, cy - 1, cx + 6, cy + 3, (255, 255, 255, 255))
    rect(d, cx + 5, cy - 1, cx + 6, cy + 2, eye_main)
    rect(d, cx + 5, cy, cx + 6, cy + 1, (20, 16, 32, 255))
    d.point((cx + 4, cy), fill=(255, 255, 255, 255))
    d.point((cx + 5, cy + 2), fill=eye_hi)
    rect(d, cx + 4, cy - 2, cx + 6, cy - 2, (26, 20, 38, 255))

    # Hair crown base
    rect(d, cx - 8, cy - 9, cx + 8, cy - 4, hair_base)
    rect(d, cx - 9, cy - 6, cx - 5, cy + 3, hair_base)
    rect(d, cx - 9, cy - 3, cx - 7, cy + 4, hair_sh)
    # Specular anime hair shine band
    rect(d, cx - 5, cy - 8, cx + 5, cy - 7, hair_hi)
    rect(d, cx - 3, cy - 9, cx + 3, cy - 9, hair_base)


def make_ren():
    """Ren — Lâmina Carmesim (64x64 detailed anime swordsman with flame katana & crimson scarf)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Flowing crimson scarf tails blowing back-left
    poly(d, [(25, 27), (10, 26), (5, 31), (12, 33), (24, 32)], (220, 38, 38, 255))
    poly(d, [(24, 30), (11, 32), (8, 37), (16, 37), (25, 34)], (153, 27, 27, 255))
    d.line([(12, 28), (22, 28)], fill=(252, 165, 165, 255))

    # Back leg & boot (wide swordsman lunge)
    poly(d, [(22, 43), (27, 43), (23, 54), (17, 54)], (24, 33, 56, 255))
    rect(d, 15, 53, 24, 58, (127, 29, 29, 255))
    rect(d, 16, 54, 23, 56, (185, 28, 28, 255))
    rect(d, 15, 57, 25, 58, (30, 27, 36, 255))

    # Front leg & shin guard
    poly(d, [(29, 43), (35, 43), (39, 54), (33, 54)], (30, 41, 69, 255))
    rect(d, 33, 48, 38, 53, (226, 232, 240, 255))  # white leg wrap
    rect(d, 33, 53, 42, 58, (153, 27, 27, 255))
    rect(d, 34, 54, 41, 56, (220, 38, 38, 255))
    rect(d, 33, 57, 43, 58, (30, 27, 36, 255))

    # Torso — dark navy anime combat haori/tunic with crimson & gold trim
    poly(d, [(21, 29), (35, 29), (37, 44), (20, 44)], (30, 58, 138, 255))
    poly(d, [(21, 29), (26, 29), (25, 44), (20, 44)], (23, 37, 84, 255))
    # Chest cross-sash & gold trim
    d.line([(23, 30), (34, 41)], fill=(250, 204, 21, 255), width=2)
    rect(d, 20, 39, 37, 42, (30, 24, 38, 255))  # belt
    rect(d, 28, 39, 32, 42, (250, 204, 21, 255))  # gold buckle
    # Armored shoulder pauldron
    rect(d, 19, 28, 25, 33, (148, 163, 184, 255))
    rect(d, 20, 29, 24, 31, (226, 232, 240, 255))
    rect(d, 19, 32, 25, 33, (250, 204, 21, 255))

    # Scarf collar
    rect(d, 22, 26, 35, 30, (239, 68, 68, 255))
    rect(d, 23, 27, 34, 28, (248, 113, 113, 255))

    # Head & spiky dark anime hair
    draw_anime_head(
        d, 28, 19,
        skin=(253, 224, 196, 255),
        skin_sh=(232, 182, 148, 255),
        eye_main=(239, 68, 68, 255),
        eye_hi=(254, 202, 202, 255),
        hair_base=(28, 34, 58, 255),
        hair_sh=(15, 20, 38, 255),
        hair_hi=(78, 96, 148, 255),
    )
    # Extra anime hair spikes
    poly(d, [(20, 12), (14, 9), (19, 16)], (28, 34, 58, 255))
    poly(d, [(24, 10), (22, 5), (28, 10)], (28, 34, 58, 255))
    poly(d, [(29, 10), (33, 5), (34, 11)], (28, 34, 58, 255))
    poly(d, [(35, 13), (40, 11), (36, 16)], (28, 34, 58, 255))
    # Bangs over forehead
    poly(d, [(24, 13), (26, 18), (28, 14)], (28, 34, 58, 255))
    poly(d, [(30, 13), (32, 18), (34, 14)], (28, 34, 58, 255))

    # Front arm + gauntlet holding Katana
    rect(d, 31, 31, 38, 35, (30, 58, 138, 255))
    rect(d, 36, 32, 41, 36, (185, 28, 28, 255))
    rect(d, 38, 33, 41, 35, (253, 224, 196, 255))

    # Curved Flaming Katana (diagonal dramatic angle!)
    rect(d, 39, 34, 42, 37, (250, 204, 21, 255))  # tsuba guard
    d.line([(36, 38), (39, 35)], fill=(127, 29, 29, 255), width=2)  # hilt
    for i in range(21):
        bx = 42 + i
        by = 33 - int(i * 1.15 - (i * i) * 0.012)
        if 1 <= bx < 63 and 1 <= by < 63:
            # Flame aura behind blade
            d.point((bx - 1, by - 1), fill=(239, 68, 68, 255))
            d.point((bx, by + 2), fill=(249, 115, 22, 255))
            # Glowing katana steel
            d.point((bx, by), fill=(255, 255, 255, 255))
            d.point((bx, by + 1), fill=(254, 240, 138, 255))
            if i % 3 == 0:
                d.point((bx - 2, by - 2), fill=(251, 146, 60, 255))

    return add_outline(img)


def make_lyra():
    """Lyra — Arcanista Astral (64x64 detailed anime archmage with witch hat & crystal staff)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Flowing starry indigo mage cape behind
    poly(d, [(21, 28), (10, 49), (26, 52), (34, 34)], (49, 46, 129, 255))
    poly(d, [(22, 30), (14, 48), (24, 50), (31, 34)], (67, 56, 202, 255))
    # Starry sparkles on cape
    for sx, sy in [(16, 44), (20, 47), (18, 39)]:
        d.point((sx, sy), fill=(254, 240, 138, 255))

    # Boots peeking beneath robe
    rect(d, 22, 53, 27, 58, (30, 58, 138, 255))
    rect(d, 30, 53, 36, 58, (37, 99, 235, 255))
    rect(d, 30, 57, 37, 58, (250, 204, 21, 255))

    # Layered sapphire dress / mage robe with gold embroidery
    poly(d, [(22, 29), (34, 29), (39, 54), (18, 54)], (37, 99, 235, 255))
    poly(d, [(22, 29), (27, 29), (24, 54), (18, 54)], (29, 78, 216, 255))
    # White & gold center tabard
    poly(d, [(27, 30), (31, 30), (33, 53), (26, 53)], (224, 242, 254, 255))
    rect(d, 28, 32, 30, 51, (56, 189, 248, 255))
    rect(d, 19, 52, 39, 54, (250, 204, 21, 255))  # gold hem
    # Collar / Mantle
    poly(d, [(20, 28), (36, 28), (33, 34), (23, 34)], (79, 70, 229, 255))
    rect(d, 26, 30, 31, 33, (250, 204, 21, 255))  # brooch
    rect(d, 27, 31, 30, 32, (56, 189, 248, 255))

    # Long flowing silver hair behind head
    poly(d, [(19, 20), (14, 38), (22, 39), (24, 23)], (203, 213, 225, 255))
    poly(d, [(20, 21), (17, 36), (22, 37), (23, 23)], (241, 245, 249, 255))

    # Head
    draw_anime_head(
        d, 28, 20,
        skin=(255, 234, 218, 255),
        skin_sh=(236, 198, 174, 255),
        eye_main=(56, 189, 248, 255),
        eye_hi=(224, 242, 254, 255),
        hair_base=(226, 232, 240, 255),
        hair_sh=(148, 163, 184, 255),
        hair_hi=(255, 255, 255, 255),
        blush=(249, 168, 212, 255),
    )

    # Ornate Pointed Archmage Hat with curved tip & gold band
    poly(d, [(12, 15), (44, 15), (41, 18), (15, 18)], (49, 46, 129, 255))
    poly(d, [(18, 15), (37, 15), (32, 5), (21, 7)], (67, 56, 202, 255))
    poly(d, [(21, 7), (15, 3), (25, 6)], (49, 46, 129, 255))
    rect(d, 19, 13, 36, 15, (250, 204, 21, 255))  # hat band
    rect(d, 28, 12, 31, 15, (56, 189, 248, 255))  # gem

    # Front arm reaching toward staff
    rect(d, 33, 32, 42, 36, (37, 99, 235, 255))
    rect(d, 40, 32, 43, 35, (255, 234, 218, 255))

    # Sculpted Crystal Astral Staff
    rect(d, 43, 18, 45, 57, (146, 64, 14, 255))
    rect(d, 44, 18, 45, 57, (180, 83, 9, 255))
    # Gold crescent head
    poly(d, [(39, 17), (49, 17), (47, 20), (41, 20)], (250, 204, 21, 255))
    d.line([(39, 17), (40, 10)], fill=(250, 204, 21, 255), width=2)
    d.line([(49, 17), (48, 10)], fill=(250, 204, 21, 255), width=2)
    # Floating radiant cyan diamond crystal
    poly(d, [(44, 6), (48, 12), (44, 17), (40, 12)], (56, 189, 248, 255))
    poly(d, [(44, 8), (46, 12), (44, 15), (42, 12)], (224, 242, 254, 255))
    d.point((44, 11), fill=(255, 255, 255, 255))
    # Arcane sparkles around crystal
    for sx, sy in [(36, 10), (52, 9), (51, 16), (37, 16)]:
        d.point((sx, sy), fill=(125, 211, 252, 255))

    return add_outline(img)


def make_bram():
    """Bram — Baluarte Dourado (64x64 towering armored paladin with clear raised warhammer & kite shield)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Royal blue paladin cape with gold trim flowing behind
    poly(d, [(21, 29), (12, 52), (24, 54), (30, 35)], (30, 58, 138, 255))
    poly(d, [(22, 30), (15, 50), (23, 52), (29, 35)], (37, 99, 235, 255))
    d.line([(13, 51), (23, 53)], fill=(250, 204, 21, 255), width=2)

    # Clearly separated Back Arm holding a tall Glowing Golden Warhammer UP & LEFT (far from helmet!)
    rect(d, 10, 31, 18, 35, (203, 213, 225, 255))  # armored arm
    rect(d, 9, 30, 13, 35, (234, 179, 8, 255))     # gauntlet gripping handle
    # Long wooden/steel hammer shaft vertical on the left
    rect(d, 10, 14, 12, 43, (120, 53, 15, 255))
    rect(d, 11, 14, 12, 43, (161, 98, 7, 255))
    rect(d, 10, 42, 12, 44, (250, 204, 21, 255))   # pommel
    # Massive unmistakable Warhammer Head clearly above the handle
    rect(d, 4, 8, 18, 16, (148, 163, 184, 255))
    rect(d, 6, 9, 16, 14, (226, 232, 240, 255))
    rect(d, 4, 8, 7, 16, (250, 204, 21, 255))      # gold striking face L
    rect(d, 15, 8, 18, 16, (250, 204, 21, 255))    # gold striking face R
    rect(d, 9, 10, 13, 14, (56, 189, 248, 255))    # glowing rune gem

    # Armored Greaves / Legs
    rect(d, 22, 45, 29, 58, (148, 163, 184, 255))
    rect(d, 23, 46, 27, 55, (203, 213, 225, 255))
    rect(d, 21, 55, 30, 59, (202, 138, 4, 255))

    rect(d, 32, 45, 39, 58, (148, 163, 184, 255))
    rect(d, 33, 46, 37, 55, (226, 232, 240, 255))
    rect(d, 32, 55, 41, 59, (234, 179, 8, 255))

    # Broad Metallic Breastplate + Royal Blue Tabard
    rect(d, 20, 28, 39, 45, (148, 163, 184, 255))
    rect(d, 22, 29, 37, 42, (226, 232, 240, 255))
    rect(d, 26, 31, 34, 45, (37, 99, 235, 255))
    rect(d, 29, 32, 31, 44, (250, 204, 21, 255))
    rect(d, 20, 41, 39, 44, (202, 138, 4, 255))

    # Sculpted Golden Pauldrons
    poly(d, [(17, 27), (25, 26), (25, 34), (17, 33)], (234, 179, 8, 255))
    rect(d, 18, 28, 24, 30, (254, 240, 138, 255))
    poly(d, [(34, 26), (42, 27), (41, 34), (34, 34)], (234, 179, 8, 255))
    rect(d, 35, 28, 40, 30, (254, 240, 138, 255))

    # Head with heroic blond hair + winged silver-gold knight helm (clean separation!)
    draw_anime_head(
        d, 30, 19,
        skin=(248, 214, 184, 255),
        skin_sh=(218, 172, 138, 255),
        eye_main=(59, 130, 246, 255),
        eye_hi=(191, 219, 254, 255),
        hair_base=(234, 179, 8, 255),
        hair_sh=(161, 98, 7, 255),
        hair_hi=(254, 240, 138, 255),
    )
    rect(d, 22, 10, 38, 16, (203, 213, 225, 255))
    rect(d, 24, 11, 36, 14, (241, 245, 249, 255))
    rect(d, 22, 15, 38, 16, (250, 204, 21, 255))
    poly(d, [(27, 10), (33, 10), (28, 4), (21, 7)], (37, 99, 235, 255))
    poly(d, [(28, 9), (31, 9), (28, 5)], (96, 165, 250, 255))

    # Massive Ornate Tower/Kite Shield clearly held in front right
    poly(d, [(41, 27), (57, 27), (57, 46), (49, 56), (41, 46)], (234, 179, 8, 255))
    poly(d, [(43, 29), (55, 29), (55, 45), (49, 53), (43, 45)], (37, 99, 235, 255))
    rect(d, 48, 31, 50, 50, (254, 240, 138, 255))
    rect(d, 44, 37, 54, 40, (254, 240, 138, 255))
    rect(d, 48, 37, 50, 40, (255, 255, 255, 255))

    return add_outline(img)


def make_kage():
    """Kage — Sombra Silenciosa (64x64 crouched shadow shinobi with twin energy daggers)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Tattered flowing violet shadow scarf trailing behind
    poly(d, [(24, 28), (6, 24), (4, 30), (14, 33), (25, 33)], (147, 51, 234, 255))
    poly(d, [(22, 31), (9, 34), (7, 40), (16, 38), (24, 34)], (107, 33, 168, 255))
    d.line([(10, 27), (21, 29)], fill=(216, 180, 254, 255))

    # Reverse-grip glowing back dagger
    poly(d, [(20, 38), (7, 43), (9, 46), (21, 41)], (168, 85, 247, 255))
    d.line([(19, 39), (9, 44)], fill=(245, 208, 254, 255), width=1)

    # Agile crouched shinobi legs
    poly(d, [(20, 44), (27, 44), (21, 55), (15, 55)], (15, 23, 42, 255))
    rect(d, 14, 54, 22, 58, (88, 28, 135, 255))
    poly(d, [(30, 44), (37, 44), (42, 55), (36, 55)], (30, 27, 75, 255))
    rect(d, 36, 54, 45, 58, (107, 33, 168, 255))
    # Shinobi leg straps
    rect(d, 35, 49, 40, 51, (168, 85, 247, 255))

    # Sleek ninja tunic + kunai chest straps
    poly(d, [(21, 31), (36, 31), (38, 45), (20, 45)], (30, 27, 75, 255))
    poly(d, [(21, 31), (26, 31), (25, 45), (20, 45)], (15, 23, 42, 255))
    d.line([(23, 32), (35, 43)], fill=(100, 116, 139, 255), width=2)
    rect(d, 20, 41, 38, 44, (88, 28, 135, 255))
    rect(d, 28, 41, 32, 44, (216, 180, 254, 255))

    # Head + Ninja Hood & Face Mask (crouched slightly lower)
    draw_anime_head(
        d, 29, 22,
        skin=(245, 215, 195, 255),
        skin_sh=(212, 178, 155, 255),
        eye_main=(232, 121, 249, 255),
        eye_hi=(255, 255, 255, 255),
        hair_base=(30, 27, 75, 255),
        hair_sh=(15, 23, 42, 255),
        hair_hi=(126, 34, 206, 255),
    )
    # Shinobi mask covering lower face + metal headband
    rect(d, 22, 25, 36, 31, (49, 46, 129, 255))
    rect(d, 23, 27, 35, 29, (88, 28, 135, 255))
    rect(d, 21, 16, 37, 19, (107, 33, 168, 255))
    rect(d, 27, 16, 34, 19, (148, 163, 184, 255))  # shinobi plate
    rect(d, 28, 17, 33, 18, (226, 232, 240, 255))

    # Front arm + Glowing Shadow Dagger thrust forward
    rect(d, 34, 34, 42, 38, (30, 27, 75, 255))
    rect(d, 40, 34, 43, 38, (147, 51, 234, 255))
    poly(d, [(43, 35), (58, 29), (56, 34), (43, 38)], (168, 85, 247, 255))
    d.line([(44, 36), (56, 31)], fill=(255, 255, 255, 255), width=2)
    # Shadow energy wisps
    for sx, sy in [(52, 27), (59, 31), (49, 39), (12, 47)]:
        d.point((sx, sy), fill=(232, 121, 249, 255))

    return add_outline(img)


def make_sora():
    """Sora — Flecha do Vendaval (64x64 wind archer with quiver, emerald coat & energy bow)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Quiver of glowing arrows on back
    poly(d, [(17, 23), (23, 21), (26, 36), (20, 37)], (120, 53, 15, 255))
    for fx, fy in [(18, 20), (20, 19), (22, 19)]:
        rect(d, fx, fy, fx + 1, fy + 3, (167, 243, 208, 255))

    # Emerald ranger capelet blowing left
    poly(d, [(21, 28), (10, 39), (19, 43), (26, 33)], (4, 120, 87, 255))
    poly(d, [(22, 29), (13, 38), (20, 41), (26, 33)], (16, 185, 129, 255))

    # Athletic archer legs & leather boots
    poly(d, [(21, 43), (27, 43), (23, 54), (18, 54)], (120, 53, 15, 255))
    rect(d, 17, 53, 25, 58, (69, 26, 3, 255))
    poly(d, [(29, 43), (35, 43), (38, 54), (32, 54)], (146, 64, 14, 255))
    rect(d, 32, 53, 41, 58, (92, 40, 10, 255))
    rect(d, 32, 53, 39, 55, (16, 185, 129, 255))

    # Emerald Ranger Coat + leather belt
    poly(d, [(21, 29), (35, 29), (37, 44), (20, 44)], (5, 150, 105, 255))
    poly(d, [(21, 29), (26, 29), (25, 44), (20, 44)], (6, 95, 70, 255))
    rect(d, 26, 30, 31, 43, (236, 253, 245, 255))
    rect(d, 20, 39, 37, 42, (120, 53, 15, 255))
    rect(d, 28, 39, 31, 42, (250, 204, 21, 255))

    # Windswept blonde ponytail behind head
    poly(d, [(20, 17), (10, 20), (8, 27), (16, 26), (21, 22)], (234, 179, 8, 255))
    poly(d, [(19, 18), (12, 21), (11, 25), (17, 24)], (250, 204, 21, 255))

    # Head
    draw_anime_head(
        d, 28, 19,
        skin=(253, 226, 198, 255),
        skin_sh=(230, 188, 154, 255),
        eye_main=(16, 185, 129, 255),
        eye_hi=(167, 243, 208, 255),
        hair_base=(250, 204, 21, 255),
        hair_sh=(202, 138, 4, 255),
        hair_hi=(254, 249, 195, 255),
        blush=(253, 164, 175, 255),
    )
    # Ranger headband
    rect(d, 20, 13, 36, 15, (16, 185, 129, 255))

    # Arms drawing bow
    rect(d, 33, 31, 44, 34, (5, 150, 105, 255))
    rect(d, 42, 31, 45, 34, (253, 226, 198, 255))

    # Large Curved Glowing Energy Longbow
    for dy in range(-16, 17):
        bx = 49 - int((dy * dy) / 28)
        by = 32 + dy
        if 1 <= bx < 63 and 1 <= by < 63:
            d.point((bx, by), fill=(16, 185, 129, 255))
            d.point((bx + 1, by), fill=(52, 211, 153, 255))
            if abs(dy) < 10:
                d.point((bx + 2, by), fill=(167, 243, 208, 255))
    # Drawn bowstring
    d.line([(40, 16), (34, 32)], fill=(209, 250, 229, 255))
    d.line([(40, 48), (34, 32)], fill=(209, 250, 229, 255))
    # Radiant Wind Arrow
    rect(d, 34, 31, 58, 33, (255, 255, 255, 255))
    poly(d, [(55, 28), (61, 32), (55, 36)], (52, 211, 153, 255))
    d.point((58, 32), fill=(255, 255, 255, 255))

    return add_outline(img)


def make_hana():
    """Hana — Sacerdotisa da Aurora (64x64 celestial shrine maiden with radiant lantern staff)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Golden Celestial Halo Ring behind head
    d.ellipse([17, 6, 39, 28], outline=(254, 240, 138, 255), width=2)

    # Long flowing rose-pink shrine maiden hair behind
    poly(d, [(19, 19), (12, 42), (23, 44), (25, 23)], (219, 39, 119, 255))
    poly(d, [(20, 20), (15, 40), (22, 42), (24, 23)], (244, 114, 182, 255))

    # Sandals peeking under hakama
    rect(d, 22, 55, 27, 58, (255, 255, 255, 255))
    rect(d, 30, 55, 36, 58, (255, 255, 255, 255))
    rect(d, 22, 57, 27, 58, (219, 39, 119, 255))
    rect(d, 30, 57, 36, 58, (219, 39, 119, 255))

    # Pleated Crimson-Rose Hakama Skirt
    poly(d, [(21, 38), (35, 38), (40, 56), (16, 56)], (236, 72, 153, 255))
    poly(d, [(21, 38), (26, 38), (23, 56), (16, 56)], (190, 24, 93, 255))
    # Pleat highlights & gold obi sash
    d.line([(28, 40), (28, 55)], fill=(249, 168, 212, 255))
    d.line([(33, 40), (35, 55)], fill=(249, 168, 212, 255))
    rect(d, 21, 37, 36, 40, (250, 204, 21, 255))
    rect(d, 26, 38, 31, 42, (254, 240, 138, 255))

    # White Ceremonial Kimono Top + Wide Flowing Sleeves
    poly(d, [(21, 28), (35, 28), (36, 38), (21, 38)], (255, 255, 255, 255))
    poly(d, [(21, 28), (25, 28), (25, 38), (21, 38)], (226, 232, 240, 255))
    d.line([(25, 29), (29, 36)], fill=(244, 114, 182, 255), width=2)
    d.line([(32, 29), (28, 36)], fill=(244, 114, 182, 255), width=2)
    # Wide kimono sleeve
    poly(d, [(32, 30), (42, 32), (40, 42), (32, 39)], (255, 255, 255, 255))
    d.line([(32, 39), (40, 42)], fill=(244, 114, 182, 255), width=2)
    rect(d, 41, 32, 44, 35, (255, 232, 220, 255))

    # Head
    draw_anime_head(
        d, 28, 19,
        skin=(255, 232, 220, 255),
        skin_sh=(236, 196, 178, 255),
        eye_main=(234, 179, 8, 255),
        eye_hi=(254, 249, 195, 255),
        hair_base=(244, 114, 182, 255),
        hair_sh=(190, 24, 93, 255),
        hair_hi=(251, 207, 232, 255),
        blush=(251, 113, 133, 255),
    )
    # Golden Shrine Hair Ribbon
    poly(d, [(21, 10), (26, 13), (21, 15)], (250, 204, 21, 255))
    poly(d, [(35, 10), (30, 13), (35, 15)], (250, 204, 21, 255))
    rect(d, 26, 11, 30, 14, (254, 240, 138, 255))

    # Ornate Celestial Lantern Staff
    rect(d, 44, 17, 46, 57, (217, 119, 6, 255))
    rect(d, 45, 17, 46, 57, (250, 204, 21, 255))
    # Hooked lantern arch
    rect(d, 44, 12, 53, 14, (250, 204, 21, 255))
    rect(d, 52, 14, 53, 17, (250, 204, 21, 255))
    # Radiant Floating Lantern
    rect(d, 48, 17, 57, 27, (250, 204, 21, 255))
    rect(d, 49, 18, 56, 26, (254, 240, 138, 255))
    rect(d, 51, 20, 54, 24, (255, 255, 255, 255))
    # Hanging pink talisman
    rect(d, 52, 27, 53, 33, (244, 114, 182, 255))

    return add_outline(img)


def make_arena_bg():
    # Wider logical low-res pixel art canvas (426 x 240) scaled 3x -> 1280 x 720 nearest-neighbor
    W, H = 426, 240
    img = Image.new("RGBA", (W, H), (14, 13, 34, 255))
    d = ImageDraw.Draw(img)

    sky_colors = [
        (12, 12, 36),
        (22, 18, 56),
        (38, 26, 78),
        (64, 34, 96),
        (102, 48, 114),
        (148, 68, 122),
        (182, 92, 124),
    ]
    for y in range(68):
        idx = min(len(sky_colors) - 1, int(y / 68 * len(sky_colors)))
        d.line([(0, y), (W, y)], fill=sky_colors[idx] + (255,))

    rng = random.Random(42)
    for _ in range(70):
        sx, sy = rng.randint(2, W - 3), rng.randint(2, 48)
        c = (255, 250, 220, 255) if rng.random() > 0.35 else (147, 197, 253, 255)
        d.point((sx, sy), fill=c)

    d.ellipse([W - 58, 10, W - 34, 34], fill=(254, 249, 195, 255))
    d.ellipse([W - 52, 8, W - 30, 30], fill=(22, 18, 56, 255))

    for x in range(W):
        peak = int(56 - 12 * abs(math.sin(x * 0.019)) - 6 * math.sin(x * 0.06))
        d.line([(x, peak), (x, 68)], fill=(26, 20, 52, 255))

    rect(d, 0, 58, W, 72, (48, 52, 78, 255))
    rect(d, 0, 58, W, 60, (98, 108, 146, 255))
    rect(d, 0, 70, W, 72, (28, 30, 48, 255))

    for px in (18, 88, 162, 248, 322, 392):
        rect(d, px, 28, px + 16, 72, (70, 76, 108, 255))
        rect(d, px + 2, 30, px + 13, 70, (98, 106, 142, 255))
        rect(d, px - 2, 25, px + 18, 29, (132, 142, 178, 255))
        rect(d, px + 6, 38, px + 9, 45, (56, 189, 248, 255))
        rect(d, px + 7, 39, px + 8, 44, (224, 242, 254, 255))

    rect(d, 0, 72, W, H, (42, 46, 70, 255))

    tile_w, tile_h = 22, 16
    for row, ty in enumerate(range(72, H, tile_h)):
        for col, tx in enumerate(range(0, W, tile_w)):
            shade = ((row + col) % 2) * 5
            base = (46 + shade, 50 + shade, 76 + shade, 255)
            hi = (64 + shade, 70 + shade, 100 + shade, 255)
            lo = (30, 34, 54, 255)
            rect(d, tx, ty, tx + tile_w - 1, ty + tile_h - 1, base)
            d.line([(tx, ty), (tx + tile_w - 1, ty)], fill=hi)
            d.line([(tx, ty + tile_h - 1), (tx + tile_w - 1, ty + tile_h - 1)], fill=lo)
            d.line([(tx + tile_w - 1, ty), (tx + tile_w - 1, ty + tile_h - 1)], fill=lo)

    d.rectangle([14, 76, W - 15, H - 8], outline=(88, 98, 140, 255), width=2)
    d.line([(W // 2, 78), (W // 2, H - 10)], fill=(56, 189, 248, 90), width=1)
    d.line([(W // 4, 84), (W // 4, H - 16)], fill=(56, 189, 248, 40), width=1)
    d.line([(3 * W // 4, 84), (3 * W // 4, H - 16)], fill=(244, 63, 94, 40), width=1)

    cx, cy = W // 2, 156
    d.ellipse([cx - 58, cy - 30, cx + 58, cy + 30], outline=(56, 189, 248, 185), width=2)
    d.ellipse([cx - 44, cy - 22, cx + 44, cy + 22], outline=(129, 140, 248, 150), width=1)
    d.ellipse([cx - 16, cy - 8, cx + 16, cy + 8], outline=(224, 242, 254, 190), width=1)

    for _ in range(85):
        px = rng.randint(4, W - 5)
        py = rng.randint(60, 95) if rng.random() > 0.35 else rng.randint(78, H - 12)
        c = (244, 114, 182, 230) if rng.random() > 0.4 else (251, 207, 232, 230)
        rect(d, px, py, px + 1, py + 1, c)

    return img.resize((1280, 720), Image.Resampling.NEAREST)


def make_ryuji():
    """Ryuji — Punho do Trovão (64x64 spiky-haired lightning martial artist with electric gauntlets)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Flowing black martial arts sash tails
    poly(d, [(22, 39), (9, 43), (11, 47), (23, 43)], (30, 41, 59, 255))
    poly(d, [(21, 41), (12, 49), (16, 51), (24, 44)], (15, 23, 42, 255))

    # Wide martial arts stance legs + white bandages
    poly(d, [(20, 43), (27, 43), (21, 55), (15, 55)], (30, 41, 59, 255))
    rect(d, 15, 51, 22, 55, (241, 245, 249, 255))
    rect(d, 14, 55, 23, 59, (217, 119, 6, 255))
    poly(d, [(30, 43), (37, 43), (42, 55), (35, 55)], (51, 65, 85, 255))
    rect(d, 35, 51, 42, 55, (241, 245, 249, 255))
    rect(d, 35, 55, 44, 59, (245, 158, 11, 255))

    # Sleeveless orange-gold martial arts gi (open chest V)
    poly(d, [(21, 29), (36, 29), (38, 44), (20, 44)], (245, 158, 11, 255))
    poly(d, [(21, 29), (26, 29), (25, 44), (20, 44)], (217, 119, 6, 255))
    poly(d, [(26, 29), (33, 29), (30, 37)], (253, 224, 196, 255))  # chest
    rect(d, 20, 39, 38, 43, (15, 23, 42, 255))  # black belt
    rect(d, 28, 39, 32, 43, (250, 204, 21, 255))

    # Head with blazing golden-amber spiky anime hair
    draw_anime_head(
        d, 29, 19,
        skin=(253, 224, 196, 255),
        skin_sh=(230, 180, 146, 255),
        eye_main=(245, 158, 11, 255),
        eye_hi=(254, 249, 195, 255),
        hair_base=(245, 158, 11, 255),
        hair_sh=(180, 83, 9, 255),
        hair_hi=(254, 240, 138, 255),
    )
    # Super spiky upward golden hair
    poly(d, [(20, 12), (12, 6), (20, 16)], (245, 158, 11, 255))
    poly(d, [(23, 10), (21, 2), (28, 10)], (250, 204, 21, 255))
    poly(d, [(28, 10), (33, 2), (34, 11)], (250, 204, 21, 255))
    poly(d, [(34, 12), (42, 7), (36, 16)], (245, 158, 11, 255))

    # Muscular front arm + Glowing Thunder Gauntlet punching forward
    rect(d, 34, 31, 42, 36, (253, 224, 196, 255))
    rect(d, 41, 29, 51, 38, (30, 41, 59, 255))
    rect(d, 42, 30, 50, 37, (250, 204, 21, 255))
    rect(d, 44, 31, 49, 36, (255, 255, 255, 255))
    # Crackling lightning sparks around fist
    d.line([(48, 28), (53, 23), (51, 29)], fill=(254, 240, 138, 255), width=2)
    d.line([(52, 35), (58, 33), (54, 39)], fill=(56, 189, 248, 255), width=2)
    d.line([(44, 39), (47, 45)], fill=(254, 240, 138, 255), width=2)

    return add_outline(img)


def make_yuki():
    """Yuki — Imperatriz da Geada (64x64 ice empress with crystal crown, frost kimono & ice fan)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Floating ice crystals behind her
    poly(d, [(12, 16), (15, 22), (12, 28), (9, 22)], (103, 232, 249, 255))
    d.point((12, 21), fill=(255, 255, 255, 255))
    poly(d, [(48, 11), (51, 16), (48, 21), (45, 16)], (165, 243, 252, 255))

    # Long flowing icy-white hair behind
    poly(d, [(19, 18), (11, 45), (22, 47), (25, 22)], (186, 230, 253, 255))
    poly(d, [(20, 19), (14, 43), (21, 45), (24, 22)], (240, 249, 255, 255))

    # Royal Frost Kimono / Gown
    poly(d, [(21, 29), (35, 29), (41, 57), (16, 57)], (8, 145, 178, 255))
    poly(d, [(21, 29), (26, 29), (22, 57), (16, 57)], (14, 116, 144, 255))
    # Pale frost inner robe + silver obi
    poly(d, [(26, 30), (32, 30), (34, 56), (25, 56)], (224, 242, 254, 255))
    rect(d, 20, 38, 37, 42, (56, 189, 248, 255))
    rect(d, 26, 38, 31, 42, (255, 255, 255, 255))
    rect(d, 17, 55, 40, 57, (165, 243, 252, 255))

    # Flowing frost sleeve
    poly(d, [(32, 30), (43, 32), (41, 43), (32, 40)], (224, 242, 254, 255))
    rect(d, 41, 32, 44, 35, (255, 236, 230, 255))

    # Head
    draw_anime_head(
        d, 28, 19,
        skin=(255, 238, 232, 255),
        skin_sh=(226, 200, 210, 255),
        eye_main=(6, 182, 212, 255),
        eye_hi=(255, 255, 255, 255),
        hair_base=(224, 242, 254, 255),
        hair_sh=(125, 211, 252, 255),
        hair_hi=(255, 255, 255, 255),
        blush=(165, 243, 252, 255),
    )
    # Ice Crystal Tiara / Crown
    poly(d, [(21, 11), (24, 5), (27, 11)], (103, 232, 249, 255))
    poly(d, [(26, 11), (29, 3), (32, 11)], (224, 242, 254, 255))
    poly(d, [(31, 11), (34, 5), (37, 11)], (103, 232, 249, 255))

    # Radiant Crystalline War Fan held forward
    poly(d, [(43, 35), (56, 21), (60, 30), (55, 39), (44, 38)], (34, 211, 238, 255))
    poly(d, [(45, 35), (55, 24), (58, 30), (54, 37)], (224, 242, 254, 255))
    d.line([(44, 36), (57, 26)], fill=(6, 182, 212, 255))
    d.line([(44, 36), (57, 32)], fill=(6, 182, 212, 255))

    return add_outline(img)


def make_drake():
    """Drake — Lanceiro Dragão (64x64 crimson dragon knight with horned helm & dragon halberd)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Tattered dark dragon-wing cape behind
    poly(d, [(22, 28), (6, 22), (9, 35), (5, 44), (20, 44)], (69, 10, 10, 255))
    poly(d, [(21, 30), (10, 26), (12, 36), (19, 41)], (153, 27, 27, 255))

    # Armored crimson dragon-scale legs
    poly(d, [(21, 43), (27, 43), (23, 56), (17, 56)], (127, 29, 29, 255))
    rect(d, 16, 54, 25, 59, (30, 27, 36, 255))
    poly(d, [(30, 43), (36, 43), (40, 56), (34, 56)], (185, 28, 28, 255))
    rect(d, 34, 54, 43, 59, (234, 179, 8, 255))

    # Dragon-scale torso armor with gold sternum crest
    poly(d, [(20, 28), (37, 28), (38, 44), (19, 44)], (153, 27, 27, 255))
    poly(d, [(20, 28), (26, 28), (25, 44), (19, 44)], (127, 29, 29, 255))
    poly(d, [(26, 30), (33, 30), (30, 40)], (250, 204, 21, 255))
    rect(d, 19, 40, 38, 43, (30, 27, 36, 255))
    # Spiked dragon pauldrons
    poly(d, [(15, 26), (25, 26), (24, 34), (16, 33)], (220, 38, 38, 255))
    poly(d, [(32, 26), (42, 26), (41, 34), (33, 34)], (220, 38, 38, 255))

    # Head + Crimson Horned Dragon Helm
    draw_anime_head(
        d, 28, 19,
        skin=(248, 214, 184, 255),
        skin_sh=(218, 172, 138, 255),
        eye_main=(250, 204, 21, 255),
        eye_hi=(255, 255, 255, 255),
        hair_base=(30, 27, 36, 255),
        hair_sh=(15, 12, 20, 255),
        hair_hi=(127, 29, 29, 255),
    )
    rect(d, 20, 10, 37, 16, (185, 28, 28, 255))
    rect(d, 22, 11, 35, 14, (239, 68, 68, 255))
    # Swept golden dragon horns
    poly(d, [(22, 11), (13, 3), (19, 13)], (250, 204, 21, 255))
    poly(d, [(33, 11), (42, 3), (36, 13)], (250, 204, 21, 255))

    # Massive Dragon Halberd / Spear thrust diagonally
    d.line([(16, 48), (54, 16)], fill=(71, 85, 105, 255), width=3)
    poly(d, [(48, 18), (61, 8), (58, 21), (51, 22)], (239, 68, 68, 255))
    poly(d, [(51, 17), (59, 10), (57, 18)], (254, 240, 138, 255))
    poly(d, [(47, 22), (55, 27), (45, 28)], (250, 204, 21, 255))  # axe wing

    return add_outline(img)


def make_nova():
    """Nova — Artilheira Cibernética (64x64 cyber-anime gunner with neon visor & plasma railcannon)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Cybernetic glowing jet-fin / energy pack on back
    poly(d, [(13, 27), (22, 29), (21, 41), (12, 38)], (30, 41, 59, 255))
    rect(d, 14, 30, 17, 36, (56, 189, 248, 255))

    # Sleek cyber leggings & neon boots
    poly(d, [(22, 43), (27, 43), (23, 55), (18, 55)], (15, 23, 42, 255))
    rect(d, 17, 53, 25, 58, (236, 72, 153, 255))
    poly(d, [(29, 43), (35, 43), (39, 55), (33, 55)], (30, 41, 59, 255))
    rect(d, 33, 53, 42, 58, (244, 114, 182, 255))
    rect(d, 34, 57, 42, 58, (56, 189, 248, 255))

    # White & black cropped cyber jacket with neon-pink trim
    poly(d, [(21, 29), (35, 29), (36, 43), (20, 43)], (241, 245, 249, 255))
    poly(d, [(21, 29), (26, 29), (25, 43), (20, 43)], (148, 163, 184, 255))
    rect(d, 25, 31, 32, 42, (15, 23, 42, 255))
    rect(d, 27, 33, 30, 38, (56, 189, 248, 255))  # chest core
    rect(d, 20, 39, 36, 41, (236, 72, 153, 255))

    # Head with neon-pink bob hair & glowing cyber visor
    draw_anime_head(
        d, 28, 19,
        skin=(254, 230, 214, 255),
        skin_sh=(232, 192, 170, 255),
        eye_main=(56, 189, 248, 255),
        eye_hi=(255, 255, 255, 255),
        hair_base=(236, 72, 153, 255),
        hair_sh=(157, 23, 77, 255),
        hair_hi=(251, 207, 232, 255),
    )
    # Cyber headphones & glowing cyan visor
    rect(d, 25, 17, 36, 21, (56, 189, 248, 255))
    rect(d, 27, 18, 35, 19, (224, 242, 254, 255))
    rect(d, 19, 16, 23, 23, (30, 41, 59, 255))
    rect(d, 20, 18, 22, 21, (244, 114, 182, 255))

    # Heavy Plasma Rail-Cannon aimed forward
    rect(d, 32, 31, 58, 38, (30, 41, 59, 255))
    rect(d, 34, 32, 56, 34, (226, 232, 240, 255))
    rect(d, 36, 34, 57, 36, (56, 189, 248, 255))  # glowing plasma barrel
    rect(d, 56, 32, 61, 37, (244, 114, 182, 255))  # muzzle glow
    rect(d, 58, 33, 61, 36, (255, 255, 255, 255))

    return add_outline(img)


def make_kael():
    """Kael — Ceifador do Abismo (64x64 hooded spectral reaper with massive glowing soul scythe)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Floating spectral soul wisp behind
    d.ellipse([10, 14, 18, 22], fill=(99, 102, 241, 255))
    d.ellipse([12, 16, 16, 20], fill=(224, 242, 254, 255))

    # Tattered floating abyssal reaper cloak
    poly(d, [(20, 27), (36, 27), (41, 56), (34, 53), (28, 58), (22, 53), (14, 57)], (30, 27, 75, 255))
    poly(d, [(20, 27), (26, 27), (22, 54), (14, 57)], (15, 23, 42, 255))
    # Glowing indigo rune trim down front
    rect(d, 27, 30, 30, 52, (99, 102, 241, 255))
    rect(d, 28, 32, 29, 50, (199, 210, 254, 255))
    # Rib/chain belt
    rect(d, 20, 38, 37, 41, (71, 85, 105, 255))
    rect(d, 27, 37, 31, 42, (129, 140, 248, 255))

    # Deep Hooded Head with eerie shadowed face & glowing eyes
    poly(d, [(17, 13), (38, 12), (40, 27), (16, 28)], (30, 27, 75, 255))
    poly(d, [(20, 11), (36, 11), (32, 6), (22, 8)], (49, 46, 129, 255))
    # Shadowed void inside hood
    rect(d, 24, 16, 36, 26, (9, 9, 20, 255))
    # Piercing glowing cyan-violet eyes
    rect(d, 27, 19, 30, 21, (56, 189, 248, 255))
    rect(d, 33, 19, 35, 21, (56, 189, 248, 255))
    d.point((28, 20), fill=(255, 255, 255, 255))
    d.point((34, 20), fill=(255, 255, 255, 255))

    # Massive Curved Spectral Soul Scythe
    d.line([(24, 56), (47, 14)], fill=(51, 65, 85, 255), width=3)
    # Huge curved glowing crescent blade
    poly(d, [(46, 13), (61, 18), (58, 33), (52, 24), (44, 18)], (99, 102, 241, 255))
    poly(d, [(48, 15), (59, 20), (57, 30), (53, 22)], (165, 243, 252, 255))
    d.line([(47, 14), (60, 19)], fill=(255, 255, 255, 255), width=2)

    return add_outline(img)


def make_tetsu():
    """Tetsu — Colosso de Jade (64x64 heavy jade samurai-oni tank with kabuto & giant tetsubo club)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Giant Iron-Studded Tetsubo War Club resting over shoulder
    d.line([(10, 12), (31, 34)], fill=(120, 53, 15, 255), width=5)
    poly(d, [(5, 7), (16, 6), (25, 19), (16, 25), (6, 15)], (71, 85, 105, 255))
    for sx, sy in [(9, 10), (14, 11), (12, 16), (18, 16), (17, 21)]:
        rect(d, sx, sy, sx + 1, sy + 1, (250, 204, 21, 255))

    # Heavy Jade Samurai Greaves
    rect(d, 19, 45, 27, 59, (15, 118, 110, 255))
    rect(d, 20, 46, 25, 56, (20, 184, 166, 255))
    rect(d, 18, 56, 28, 59, (180, 83, 9, 255))
    rect(d, 31, 45, 39, 59, (15, 118, 110, 255))
    rect(d, 33, 46, 37, 56, (45, 212, 191, 255))
    rect(d, 31, 56, 41, 59, (217, 119, 6, 255))

    # Massive Layered Jade & Bronze Samurai-Oni Armor
    rect(d, 17, 27, 41, 46, (17, 94, 89, 255))
    rect(d, 19, 28, 39, 44, (20, 184, 166, 255))
    # Glowing turquoise spirit core in chest
    rect(d, 26, 32, 33, 38, (250, 204, 21, 255))
    rect(d, 27, 33, 32, 37, (153, 246, 228, 255))
    # Layered armor plates & bronze waist guard
    rect(d, 17, 41, 41, 45, (180, 83, 9, 255))
    rect(d, 27, 41, 32, 45, (250, 204, 21, 255))
    # Huge Jade Sode (samurai shoulder guards)
    rect(d, 13, 26, 22, 36, (15, 118, 110, 255))
    rect(d, 14, 27, 21, 30, (45, 212, 191, 255))
    rect(d, 14, 34, 21, 36, (250, 204, 21, 255))
    rect(d, 36, 26, 45, 36, (15, 118, 110, 255))
    rect(d, 37, 27, 44, 30, (45, 212, 191, 255))
    rect(d, 37, 34, 44, 36, (250, 204, 21, 255))

    # Armored Oni-Kabuto Helmet Head
    rect(d, 21, 12, 37, 26, (15, 118, 110, 255))
    rect(d, 23, 13, 35, 20, (20, 184, 166, 255))
    # Oni face mask + glowing amber eyes
    rect(d, 24, 18, 36, 25, (30, 41, 59, 255))
    rect(d, 26, 19, 29, 21, (250, 204, 21, 255))
    rect(d, 32, 19, 35, 21, (250, 204, 21, 255))
    # Golden crescent Kabuto crest horns
    poly(d, [(28, 13), (20, 4), (25, 13)], (250, 204, 21, 255))
    poly(d, [(30, 13), (38, 4), (33, 13)], (250, 204, 21, 255))

    # Armored gauntlet fist
    rect(d, 40, 35, 48, 42, (20, 184, 166, 255))
    rect(d, 42, 36, 47, 40, (250, 204, 21, 255))

    return add_outline(img)


def make_fenrir():
    """Fenrir — Lobo do Crepúsculo (64x64 mythic Nordic frost-shadow giant wolf)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Bushy frost-shadow tail sweeping up behind
    poly(d, [(14, 34), (4, 24), (8, 19), (18, 28), (19, 36)], (30, 41, 75, 255))
    poly(d, [(7, 23), (10, 20), (16, 27), (12, 30)], (56, 189, 248, 255))

    # Back muscular wolf legs
    poly(d, [(16, 38), (24, 38), (19, 55), (13, 55)], (30, 41, 59, 255))
    rect(d, 13, 54, 22, 58, (148, 163, 184, 255))
    # Front prowling wolf legs
    poly(d, [(35, 39), (43, 39), (46, 55), (39, 55)], (51, 65, 85, 255))
    rect(d, 40, 54, 49, 58, (226, 232, 240, 255))
    # Sharp icy claws
    for cx in (46, 48, 50):
        d.point((cx, 57), fill=(56, 189, 248, 255))

    # Sleek powerful wolf torso with frost mane
    poly(d, [(14, 31), (43, 28), (45, 42), (16, 43)], (30, 41, 75, 255))
    poly(d, [(18, 36), (41, 35), (41, 42), (18, 42)], (148, 163, 184, 255))  # silver belly
    # Frost-spike mane around neck/shoulders
    poly(d, [(28, 26), (36, 17), (42, 25), (46, 21), (46, 34), (31, 35)], (56, 189, 248, 255))
    poly(d, [(32, 27), (38, 21), (44, 29), (35, 33)], (224, 242, 254, 255))

    # Fierce Wolf Head facing right
    poly(d, [(37, 21), (51, 21), (58, 27), (56, 31), (42, 32)], (51, 65, 85, 255))
    # Pointed wolf ears
    poly(d, [(38, 21), (36, 12), (43, 19)], (30, 41, 75, 255))
    poly(d, [(43, 20), (45, 11), (48, 19)], (51, 65, 85, 255))
    # Glowing cyan eye + snout + fangs
    rect(d, 46, 23, 50, 25, (56, 189, 248, 255))
    d.point((48, 24), fill=(255, 255, 255, 255))
    rect(d, 56, 27, 58, 29, (15, 23, 42, 255))  # nose
    # White fangs
    d.point((52, 31), fill=(255, 255, 255, 255))
    d.point((55, 31), fill=(255, 255, 255, 255))
    # Frost aura wisps
    for sx, sy in [(22, 22), (55, 18), (59, 34)]:
        rect(d, sx, sy, sx + 1, sy + 1, (125, 211, 252, 255))

    return add_outline(img)


def make_ignis():
    """Ignis — Fênix Imortal (64x64 majestic winged fiery mythic phoenix hovering in air)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Flowing blazing tail plumes trailing down-left
    poly(d, [(22, 37), (6, 48), (11, 53), (25, 42)], (220, 38, 38, 255))
    poly(d, [(24, 39), (12, 55), (18, 57), (28, 43)], (249, 115, 22, 255))
    poly(d, [(20, 41), (10, 49), (14, 51), (22, 43)], (254, 240, 138, 255))

    # Huge spread left/back fiery wing
    poly(d, [(26, 28), (6, 12), (10, 24), (16, 28), (12, 34), (27, 34)], (220, 38, 38, 255))
    poly(d, [(25, 29), (11, 17), (15, 26), (25, 31)], (249, 115, 22, 255))
    poly(d, [(24, 29), (16, 22), (19, 27)], (254, 240, 138, 255))

    # Huge spread right/front fiery wing
    poly(d, [(35, 29), (58, 12), (54, 25), (47, 29), (52, 35), (36, 35)], (239, 68, 68, 255))
    poly(d, [(36, 30), (53, 17), (48, 26), (37, 32)], (251, 146, 60, 255))
    poly(d, [(37, 30), (47, 22), (44, 28)], (254, 240, 138, 255))

    # Majestic Golden-Crimson Phoenix Body
    poly(d, [(25, 27), (38, 27), (40, 40), (31, 45), (23, 39)], (249, 115, 22, 255))
    poly(d, [(28, 29), (36, 29), (36, 39), (31, 42), (27, 38)], (254, 240, 138, 255))
    # Golden talons tucked
    rect(d, 28, 44, 30, 48, (250, 204, 21, 255))
    rect(d, 34, 44, 36, 48, (250, 204, 21, 255))

    # Phoenix Head, Golden Crest & Beak facing right
    rect(d, 28, 15, 39, 26, (239, 68, 68, 255))
    rect(d, 30, 17, 38, 24, (249, 115, 22, 255))
    # Flowing golden head crest
    poly(d, [(31, 15), (22, 7), (28, 14), (24, 11), (34, 15)], (250, 204, 21, 255))
    poly(d, [(33, 15), (30, 6), (36, 14)], (254, 240, 138, 255))
    # Radiant eye & sharp golden beak
    rect(d, 35, 19, 37, 21, (255, 255, 255, 255))
    poly(d, [(39, 19), (46, 22), (39, 24)], (250, 204, 21, 255))

    return add_outline(img)


def make_cerberus():
    """Cérbero — Cão do Submundo (64x64 hulking three-headed obsidian & lava hellhound)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Fiery whip tail
    d.line([(12, 36), (5, 28), (8, 23)], fill=(127, 29, 29, 255), width=3)
    rect(d, 6, 21, 10, 25, (249, 115, 22, 255))

    # Hulking obsidian beast legs
    rect(d, 13, 41, 22, 57, (30, 27, 36, 255))
    rect(d, 12, 55, 23, 59, (185, 28, 28, 255))
    rect(d, 33, 41, 43, 57, (45, 38, 52, 255))
    rect(d, 34, 55, 45, 59, (220, 38, 38, 255))

    # Massive muscular hellhound torso with glowing magma veins
    poly(d, [(12, 31), (42, 28), (44, 45), (14, 45)], (30, 27, 36, 255))
    d.line([(18, 34), (27, 38), (22, 42)], fill=(249, 115, 22, 255), width=2)
    d.line([(29, 33), (36, 39)], fill=(250, 204, 21, 255), width=2)

    # Spiked iron collar
    rect(d, 34, 26, 42, 36, (100, 116, 139, 255))
    for sy in (27, 31, 35):
        rect(d, 36, sy, 39, sy + 1, (250, 204, 21, 255))

    # THREE FIERCE HELLHOUND HEADS!
    # Top head
    poly(d, [(36, 12), (49, 11), (54, 17), (43, 21)], (45, 38, 52, 255))
    rect(d, 44, 14, 47, 16, (250, 204, 21, 255))  # glowing eye
    poly(d, [(38, 12), (37, 7), (42, 11)], (30, 27, 36, 255))
    # Middle main head
    poly(d, [(40, 22), (55, 22), (60, 28), (45, 32)], (30, 27, 36, 255))
    rect(d, 49, 24, 53, 26, (239, 68, 68, 255))
    d.point((51, 25), fill=(254, 240, 138, 255))
    rect(d, 55, 29, 57, 31, (255, 255, 255, 255))  # fang
    # Lower head
    poly(d, [(38, 32), (52, 33), (56, 39), (42, 41)], (45, 38, 52, 255))
    rect(d, 47, 35, 50, 37, (249, 115, 22, 255))

    return add_outline(img)


def make_medusa():
    """Medusa — Górgona Esmeralda (64x64 mythic gorgon with serpent tail & snake hair)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Coiled Emerald Serpent Lower Body / Tail
    poly(d, [(22, 39), (35, 39), (41, 50), (35, 58), (15, 58), (10, 51), (18, 47)], (22, 163, 74, 255))
    poly(d, [(18, 49), (34, 49), (34, 56), (16, 56)], (74, 222, 128, 255))
    # Tail tip curling left
    poly(d, [(11, 52), (5, 45), (9, 43), (15, 50)], (21, 128, 61, 255))
    # Golden scale belt
    rect(d, 21, 38, 36, 41, (250, 204, 21, 255))

    # Regal purple & gold gorgon corset/drape
    poly(d, [(22, 28), (35, 28), (36, 39), (21, 39)], (107, 33, 168, 255))
    rect(d, 26, 29, 31, 38, (147, 51, 234, 255))
    rect(d, 27, 30, 30, 32, (74, 222, 128, 255))  # emerald jewel

    # Writhing Emerald Serpent Hair behind & around head!
    for pts in [
        [(20, 17), (10, 12), (8, 16), (17, 21)],
        [(21, 12), (14, 5), (18, 5), (24, 12)],
        [(28, 10), (31, 3), (35, 6), (31, 12)],
        [(34, 14), (44, 10), (45, 14), (36, 18)],
        [(19, 23), (11, 27), (14, 30), (21, 26)],
    ]:
        poly(d, pts, (22, 163, 74, 255))
        d.point(pts[1], fill=(250, 204, 21, 255))  # snake eye

    # Head with pale jade-tinted skin & glowing violet petrifying eyes
    draw_anime_head(
        d, 28, 19,
        skin=(220, 252, 231, 255),
        skin_sh=(167, 243, 208, 255),
        eye_main=(168, 85, 247, 255),
        eye_hi=(255, 255, 255, 255),
        hair_base=(21, 128, 61, 255),
        hair_sh=(20, 83, 45, 255),
        hair_hi=(74, 222, 128, 255),
    )

    # Raised arm casting glowing violet-green petrification orb
    rect(d, 34, 30, 44, 34, (220, 252, 231, 255))
    d.ellipse([44, 24, 56, 36], fill=(168, 85, 247, 255))
    d.ellipse([47, 27, 53, 33], fill=(74, 222, 128, 255))
    d.point((50, 30), fill=(255, 255, 255, 255))

    return add_outline(img)


def make_anubis():
    """Anúbis — Guardião das Areias (64x64 Egyptian jackal-headed god warrior with golden khopesh)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Flowing desert-violet & gold waist sash
    poly(d, [(21, 39), (11, 52), (18, 54), (26, 42)], (107, 33, 168, 255))

    # Athletic dark-obsidian legs with golden greaves
    poly(d, [(21, 43), (27, 43), (22, 56), (16, 56)], (30, 27, 36, 255))
    rect(d, 16, 52, 24, 58, (234, 179, 8, 255))
    poly(d, [(30, 43), (36, 43), (40, 56), (34, 56)], (30, 27, 36, 255))
    rect(d, 34, 52, 43, 58, (250, 204, 21, 255))

    # Egyptian shendyt skirt + broad golden-lapis pectoral collar
    poly(d, [(20, 38), (37, 38), (39, 47), (19, 47)], (241, 245, 249, 255))
    rect(d, 26, 38, 32, 47, (250, 204, 21, 255))
    rect(d, 28, 40, 30, 45, (37, 99, 235, 255))
    # Torso + golden collar
    rect(d, 22, 28, 35, 39, (30, 27, 36, 255))
    poly(d, [(18, 27), (39, 27), (36, 33), (21, 33)], (250, 204, 21, 255))
    rect(d, 22, 29, 35, 31, (37, 99, 235, 255))

    # Ornate Gold-and-Blue Nemes Headdress + Tall Jackal Head
    poly(d, [(18, 15), (36, 15), (39, 29), (15, 29)], (234, 179, 8, 255))
    for sy in (17, 21, 25):
        d.line([(17, sy), (37, sy)], fill=(37, 99, 235, 255), width=2)
    # Tall pointed black jackal ears
    poly(d, [(22, 15), (20, 4), (26, 14)], (24, 24, 34, 255))
    poly(d, [(29, 15), (31, 4), (34, 14)], (24, 24, 34, 255))
    # Jackal snout facing right + glowing purple eye
    poly(d, [(23, 14), (36, 14), (44, 20), (42, 24), (25, 24)], (24, 24, 34, 255))
    rect(d, 32, 16, 36, 18, (192, 132, 252, 255))
    d.point((34, 17), fill=(255, 255, 255, 255))

    # Glowing Golden Khopesh / Was-Staff held forward
    rect(d, 35, 31, 44, 35, (30, 27, 36, 255))
    rect(d, 41, 31, 45, 35, (250, 204, 21, 255))
    # Curved golden khopesh blade with purple soul energy
    poly(d, [(44, 32), (51, 24), (58, 17), (60, 23), (53, 30), (46, 35)], (250, 204, 21, 255))
    d.line([(47, 31), (57, 20)], fill=(254, 249, 195, 255), width=2)
    for sx, sy in [(55, 14), (60, 18), (58, 27)]:
        d.point((sx, sy), fill=(192, 132, 252, 255))

    return add_outline(img)


def make_freya():
    """Freya — Valquíria Celeste (64x64 winged Norse valkyrie with white wings & celestial spear)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Radiant White Feathered Angelic Wings behind back
    poly(d, [(22, 28), (4, 11), (8, 26), (13, 34), (24, 36)], (226, 232, 240, 255))
    poly(d, [(22, 29), (9, 16), (12, 26), (22, 33)], (255, 255, 255, 255))
    poly(d, [(33, 27), (47, 13), (45, 25), (36, 32)], (226, 232, 240, 255))
    poly(d, [(34, 28), (44, 17), (42, 24)], (255, 255, 255, 255))

    # Armored pearl & rose valkyrie boots
    poly(d, [(22, 44), (27, 44), (23, 56), (18, 56)], (241, 245, 249, 255))
    rect(d, 17, 54, 25, 58, (244, 114, 182, 255))
    poly(d, [(29, 44), (35, 44), (39, 56), (33, 56)], (241, 245, 249, 255))
    rect(d, 33, 54, 42, 58, (250, 204, 21, 255))

    # Pearl-white & rose-gold valkyrie battle armor + pleated skirt
    poly(d, [(21, 38), (36, 38), (40, 48), (17, 48)], (244, 114, 182, 255))
    rect(d, 18, 46, 39, 48, (250, 204, 21, 255))
    poly(d, [(22, 28), (35, 28), (36, 39), (21, 39)], (241, 245, 249, 255))
    rect(d, 26, 29, 31, 38, (250, 204, 21, 255))
    rect(d, 27, 31, 30, 34, (244, 114, 182, 255))

    # Flowing golden-rose hair + Head + Winged Valkyrie Tiara
    poly(d, [(19, 19), (14, 37), (22, 38), (24, 22)], (250, 204, 21, 255))
    draw_anime_head(
        d, 28, 19,
        skin=(255, 234, 220, 255),
        skin_sh=(236, 196, 176, 255),
        eye_main=(244, 114, 182, 255),
        eye_hi=(255, 255, 255, 255),
        hair_base=(250, 204, 21, 255),
        hair_sh=(202, 138, 4, 255),
        hair_hi=(254, 249, 195, 255),
        blush=(251, 113, 133, 255),
    )
    # Winged golden tiara
    rect(d, 21, 12, 36, 14, (250, 204, 21, 255))
    poly(d, [(21, 13), (15, 7), (23, 11)], (255, 255, 255, 255))
    poly(d, [(35, 13), (41, 7), (33, 11)], (255, 255, 255, 255))

    # Radiant Celestial Valkyrie Spear aimed forward
    d.line([(20, 44), (58, 24)], fill=(250, 204, 21, 255), width=3)
    poly(d, [(51, 26), (62, 20), (56, 30)], (244, 114, 182, 255))
    poly(d, [(53, 26), (60, 22), (56, 28)], (255, 255, 255, 255))

    return add_outline(img)


def make_leviathan():
    """Leviatã — Serpente Abissal (64x64 coiled sea-dragon serpent with bioluminescent fins)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Coiled giant sea-serpent body
    poly(d, [(10, 52), (24, 42), (40, 48), (36, 58), (14, 58)], (3, 105, 161, 255))
    poly(d, [(14, 44), (10, 30), (24, 24), (34, 34), (24, 46)], (2, 132, 199, 255))
    poly(d, [(22, 26), (34, 14), (44, 22), (34, 34)], (14, 165, 233, 255))
    # Pale aqua underbelly scales
    d.line([(16, 53), (34, 53)], fill=(186, 230, 253, 255), width=3)
    d.line([(17, 36), (26, 30)], fill=(186, 230, 253, 255), width=3)
    # Bioluminescent dorsal fins
    poly(d, [(8, 30), (3, 23), (14, 24)], (56, 189, 248, 255))
    poly(d, [(24, 16), (22, 7), (32, 14)], (125, 211, 252, 255))
    # Fierce Sea-Dragon Head facing right
    poly(d, [(36, 14), (52, 15), (60, 22), (55, 28), (40, 27)], (2, 132, 199, 255))
    poly(d, [(38, 14), (34, 6), (44, 14)], (254, 240, 138, 255))  # horn
    rect(d, 46, 18, 50, 20, (254, 240, 138, 255))  # glowing eye
    d.point((55, 27), fill=(255, 255, 255, 255))  # fang
    # Water splash droplets
    for sx, sy in [(56, 34), (48, 42), (8, 42)]:
        rect(d, sx, sy, sx + 2, sy + 2, (125, 211, 252, 255))
    return add_outline(img)


def make_behemoth():
    """Behemoth — Titã Terrestre (64x64 colossal horned earth-crystal boulder beast)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Massive stone legs
    rect(d, 14, 44, 25, 59, (87, 83, 78, 255))
    rect(d, 34, 44, 46, 59, (120, 113, 108, 255))
    rect(d, 14, 56, 26, 59, (161, 98, 7, 255))
    rect(d, 34, 56, 47, 59, (161, 98, 7, 255))

    # Hulking boulder torso with glowing amber crystal core
    poly(d, [(11, 22), (48, 22), (51, 46), (10, 46)], (87, 83, 78, 255))
    poly(d, [(14, 24), (45, 24), (47, 42), (14, 42)], (120, 113, 108, 255))
    # Glowing amber core + moss
    poly(d, [(28, 28), (35, 34), (28, 40), (21, 34)], (245, 158, 11, 255))
    poly(d, [(28, 30), (32, 34), (28, 38), (24, 34)], (254, 240, 138, 255))
    rect(d, 12, 20, 24, 24, (22, 163, 74, 255))  # moss on shoulder

    # Colossal boulder fist raised right
    rect(d, 46, 28, 60, 44, (120, 113, 108, 255))
    rect(d, 49, 30, 58, 36, (168, 162, 158, 255))
    d.line([(48, 38), (58, 38)], fill=(245, 158, 11, 255), width=2)

    # Horned Titan Head
    rect(d, 22, 11, 40, 23, (68, 64, 60, 255))
    poly(d, [(22, 13), (13, 5), (20, 16)], (250, 204, 21, 255))
    poly(d, [(39, 13), (49, 5), (41, 16)], (250, 204, 21, 255))
    rect(d, 27, 15, 31, 18, (251, 146, 60, 255))
    rect(d, 34, 15, 38, 18, (251, 146, 60, 255))
    return add_outline(img)


def make_bahamut():
    """Bahamut — Dragão Estelar (64x64 cosmic winged dragon with violet scales & starfire)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Cosmic starry wings spread wide
    poly(d, [(24, 28), (4, 8), (8, 28), (17, 36), (27, 36)], (88, 28, 135, 255))
    poly(d, [(24, 29), (10, 14), (13, 27), (24, 33)], (124, 58, 237, 255))
    poly(d, [(35, 26), (55, 8), (52, 24), (38, 32)], (109, 40, 217, 255))
    for sx, sy in [(12, 18), (17, 25), (47, 15), (43, 22)]:
        d.point((sx, sy), fill=(254, 240, 138, 255))

    # Dragon tail & legs
    poly(d, [(18, 44), (5, 51), (10, 56), (22, 49)], (76, 29, 149, 255))
    rect(d, 20, 44, 27, 58, (88, 28, 135, 255))
    rect(d, 32, 44, 40, 58, (109, 40, 217, 255))
    rect(d, 33, 56, 42, 58, (250, 204, 21, 255))

    # Armored Cosmic Dragon Torso
    poly(d, [(21, 27), (39, 27), (41, 46), (19, 46)], (109, 40, 217, 255))
    poly(d, [(26, 29), (35, 29), (35, 44), (26, 44)], (56, 189, 248, 255))

    # Majestic Horned Dragon Head
    poly(d, [(28, 13), (44, 13), (52, 20), (47, 25), (30, 25)], (124, 58, 237, 255))
    poly(d, [(28, 14), (19, 4), (26, 16)], (250, 204, 21, 255))
    poly(d, [(34, 13), (30, 3), (38, 13)], (254, 240, 138, 255))
    rect(d, 40, 16, 44, 19, (56, 189, 248, 255))
    d.point((42, 17), fill=(255, 255, 255, 255))
    # Starfire glow at mouth
    d.ellipse([51, 18, 60, 27], fill=(56, 189, 248, 255))
    d.ellipse([54, 21, 58, 25], fill=(255, 255, 255, 255))
    return add_outline(img)


def make_kraken():
    """Kraken — Terror dos Mares (64x64 giant abyssal octopus monster with sweeping tentacles)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Sweeping tentacles below & sides
    poly(d, [(18, 38), (6, 46), (8, 56), (18, 52), (24, 42)], (15, 118, 110, 255))
    poly(d, [(24, 40), (19, 57), (27, 58), (30, 42)], (17, 94, 89, 255))
    poly(d, [(32, 40), (35, 58), (43, 57), (38, 42)], (15, 118, 110, 255))
    poly(d, [(40, 38), (54, 44), (58, 34), (52, 32), (46, 39)], (20, 184, 166, 255))
    # Suction cups
    for sx, sy in [(11, 50), (23, 52), (38, 52), (51, 39)]:
        rect(d, sx, sy, sx + 2, sy + 2, (192, 132, 252, 255))

    # Giant bulbous Kraken Mantle / Head
    d.ellipse([16, 10, 46, 42], fill=(15, 118, 110, 255))
    d.ellipse([20, 12, 42, 34], fill=(20, 184, 166, 255))
    # Head fins
    poly(d, [(18, 16), (9, 11), (15, 24)], (13, 148, 136, 255))
    poly(d, [(44, 16), (53, 11), (47, 24)], (13, 148, 136, 255))
    # Glowing eldritch violet eyes
    rect(d, 25, 28, 31, 33, (168, 85, 247, 255))
    rect(d, 36, 28, 42, 33, (168, 85, 247, 255))
    rect(d, 27, 29, 29, 31, (254, 240, 138, 255))
    rect(d, 38, 29, 40, 31, (254, 240, 138, 255))
    return add_outline(img)


def make_kitsune():
    """Tamamo — Kitsune das Nove Caudas (64x64 mystical nine-tailed fox spirit)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Fanned glowing Nine Tails behind!
    for tx, ty in [(6, 16), (12, 10), (20, 8), (6, 28), (10, 40)]:
        poly(d, [(25, 36), (tx, ty), (tx + 6, ty - 2), (28, 32)], (255, 255, 255, 255))
        rect(d, tx, ty, tx + 3, ty + 3, (244, 63, 94, 255))

    # White & crimson spirit kimono
    poly(d, [(22, 29), (36, 29), (41, 56), (18, 56)], (255, 255, 255, 255))
    poly(d, [(22, 39), (37, 39), (40, 56), (19, 56)], (244, 63, 94, 255))
    rect(d, 21, 38, 38, 41, (250, 204, 21, 255))

    # Head with fox ears & golden eyes
    draw_anime_head(
        d, 29, 19,
        skin=(255, 236, 224, 255),
        skin_sh=(236, 198, 180, 255),
        eye_main=(245, 158, 11, 255),
        eye_hi=(255, 255, 255, 255),
        hair_base=(255, 255, 255, 255),
        hair_sh=(203, 213, 225, 255),
        hair_hi=(254, 249, 195, 255),
        blush=(251, 113, 133, 255),
    )
    # Tall fox ears with crimson tips
    poly(d, [(21, 12), (19, 3), (26, 11)], (255, 255, 255, 255))
    poly(d, [(20, 6), (19, 3), (22, 7)], (244, 63, 94, 255))
    poly(d, [(32, 11), (37, 3), (37, 12)], (255, 255, 255, 255))
    poly(d, [(35, 6), (37, 3), (37, 7)], (244, 63, 94, 255))

    # Floating Golden Foxfire Orbs in front
    for ox, oy in [(48, 22), (54, 33), (46, 40)]:
        d.ellipse([ox - 4, oy - 4, ox + 4, oy + 4], fill=(244, 63, 94, 255))
        d.ellipse([ox - 2, oy - 2, ox + 2, oy + 2], fill=(254, 240, 138, 255))
    return add_outline(img)


def make_golem():
    """Kronos — Golem do Tempo (64x64 floating brass clockwork titan with halo gears & hourglass)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Giant Golden Clockwork Halo Gear behind
    d.ellipse([11, 6, 49, 44], outline=(234, 179, 8, 255), width=3)
    for ang in range(0, 360, 45):
        gx = 30 + int(math.cos(math.radians(ang)) * 20)
        gy = 25 + int(math.sin(math.radians(ang)) * 20)
        rect(d, gx - 2, gy - 2, gx + 2, gy + 2, (250, 204, 21, 255))

    # Floating lower rune crystal (levitating!)
    poly(d, [(24, 46), (36, 46), (30, 58)], (56, 189, 248, 255))
    poly(d, [(27, 47), (33, 47), (30, 54)], (224, 242, 254, 255))

    # Ornate Brass & Obsidian Torso with glowing Cyan Hourglass Core
    poly(d, [(18, 24), (42, 24), (38, 45), (22, 45)], (180, 83, 9, 255))
    poly(d, [(20, 26), (40, 26), (36, 43), (24, 43)], (234, 179, 8, 255))
    # Hourglass core
    poly(d, [(25, 29), (35, 29), (30, 35)], (56, 189, 248, 255))
    poly(d, [(30, 35), (35, 41), (25, 41)], (224, 242, 254, 255))

    # Floating detached brass gauntlets
    rect(d, 45, 28, 56, 39, (234, 179, 8, 255))
    rect(d, 48, 30, 53, 36, (56, 189, 248, 255))
    rect(d, 8, 28, 16, 38, (180, 83, 9, 255))

    # Crowned Clockwork Head
    rect(d, 23, 13, 37, 24, (234, 179, 8, 255))
    rect(d, 25, 16, 35, 20, (15, 23, 42, 255))
    rect(d, 28, 17, 33, 19, (56, 189, 248, 255))
    return add_outline(img)


def make_raijin():
    """Raijin — Deus do Relâmpago (64x64 thunder god with ring of taiko drums & lightning)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Ring of 5 Taiko Thunder Drums behind back!
    d.ellipse([10, 6, 48, 44], outline=(250, 204, 21, 255), width=2)
    for dx, dy in [(12, 16), (22, 7), (36, 7), (46, 16), (14, 34)]:
        d.ellipse([dx - 4, dy - 4, dx + 4, dy + 4], fill=(185, 28, 28, 255))
        d.ellipse([dx - 2, dy - 2, dx + 2, dy + 2], fill=(254, 249, 195, 255))

    # Floating storm cloud beneath feet
    d.ellipse([14, 50, 46, 59], fill=(148, 163, 184, 255))
    d.ellipse([20, 48, 40, 56], fill=(226, 232, 240, 255))

    # Red & gold thunder deity robe
    poly(d, [(21, 29), (37, 29), (40, 50), (18, 50)], (185, 28, 28, 255))
    rect(d, 26, 30, 32, 49, (250, 204, 21, 255))
    rect(d, 19, 40, 39, 43, (30, 58, 138, 255))

    # Head with wild white-gold hair
    draw_anime_head(
        d, 29, 20,
        skin=(253, 224, 196, 255),
        skin_sh=(230, 180, 146, 255),
        eye_main=(56, 189, 248, 255),
        eye_hi=(255, 255, 255, 255),
        hair_base=(241, 245, 249, 255),
        hair_sh=(148, 163, 184, 255),
        hair_hi=(254, 240, 138, 255),
    )
    # Crackling lightning bolt held in front hand
    d.line([(41, 34), (49, 26), (47, 34), (58, 25)], fill=(250, 204, 21, 255), width=3)
    d.line([(42, 34), (49, 27), (47, 34), (57, 26)], fill=(255, 255, 255, 255), width=1)
    return add_outline(img)


def make_valkor():
    """Valkor — Cavaleiro do Vazio (64x64 cosmic dark knight with giant void greatsword)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Tattered void cape
    poly(d, [(21, 28), (7, 50), (22, 54), (30, 34)], (59, 7, 100, 255))
    poly(d, [(22, 29), (12, 48), (21, 51), (28, 34)], (107, 33, 168, 255))

    # Dark armored legs & chest
    rect(d, 20, 44, 27, 58, (30, 27, 75, 255))
    rect(d, 31, 44, 39, 58, (49, 46, 129, 255))
    rect(d, 19, 28, 38, 45, (30, 27, 75, 255))
    rect(d, 26, 30, 31, 42, (236, 72, 153, 255))  # glowing void core

    # Horned Eclipse Helmet
    rect(d, 21, 11, 37, 26, (30, 27, 75, 255))
    rect(d, 24, 17, 36, 21, (9, 9, 20, 255))
    rect(d, 28, 18, 35, 20, (236, 72, 153, 255))  # glowing magenta visor
    poly(d, [(21, 12), (13, 3), (20, 16)], (168, 85, 247, 255))
    poly(d, [(37, 12), (45, 3), (38, 16)], (168, 85, 247, 255))

    # Colossal Glowing Void Greatsword
    poly(d, [(39, 36), (59, 10), (62, 15), (44, 40)], (147, 51, 234, 255))
    d.line([(41, 36), (59, 13)], fill=(244, 114, 182, 255), width=2)
    rect(d, 37, 34, 45, 38, (250, 204, 21, 255))  # crossguard
    return add_outline(img)


def make_aegis():
    """Aegis-09 — Mecha Orbital (64x64 Gundam-style anime mecha with V-fin & beam rifle)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Shoulder thruster wing pack
    poly(d, [(17, 25), (6, 16), (11, 34), (21, 34)], (37, 99, 235, 255))
    rect(d, 9, 22, 14, 27, (244, 63, 94, 255))

    # Mecha armored legs
    rect(d, 19, 44, 27, 58, (241, 245, 249, 255))
    rect(d, 18, 54, 28, 59, (220, 38, 38, 255))
    rect(d, 31, 44, 39, 58, (241, 245, 249, 255))
    rect(d, 31, 54, 41, 59, (220, 38, 38, 255))

    # Blue/White/Red Gundam Chest + Pauldrons
    rect(d, 19, 28, 39, 44, (37, 99, 235, 255))
    rect(d, 23, 30, 35, 36, (241, 245, 249, 255))
    rect(d, 27, 37, 32, 42, (220, 38, 38, 255))
    rect(d, 15, 26, 23, 35, (241, 245, 249, 255))
    rect(d, 35, 26, 43, 35, (241, 245, 249, 255))

    # Mecha Head + Golden V-Fin Antenna + Glowing Green Visor
    rect(d, 23, 13, 36, 25, (241, 245, 249, 255))
    rect(d, 26, 17, 36, 20, (34, 197, 94, 255))
    poly(d, [(29, 14), (17, 7), (26, 15)], (250, 204, 21, 255))
    poly(d, [(31, 14), (43, 7), (34, 15)], (250, 204, 21, 255))

    # Beam Rifle aimed forward
    rect(d, 37, 32, 60, 38, (51, 65, 85, 255))
    rect(d, 40, 33, 58, 35, (56, 189, 248, 255))
    rect(d, 58, 32, 62, 37, (254, 240, 138, 255))
    return add_outline(img)


def make_sylph():
    """Sylph — Fada da Tempestade (64x64 luminous wind fairy with butterfly wings & wind chakram)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Luminous Emerald-Gold Butterfly Wings
    poly(d, [(23, 29), (6, 12), (8, 28), (18, 34)], (74, 222, 128, 255))
    poly(d, [(22, 30), (11, 18), (12, 27)], (254, 249, 195, 255))
    poly(d, [(23, 36), (10, 44), (16, 52), (24, 42)], (34, 197, 94, 255))

    # Floating Leaf-Petal Dress
    poly(d, [(22, 29), (35, 29), (40, 50), (18, 50)], (34, 197, 94, 255))
    poly(d, [(25, 31), (33, 31), (35, 48), (23, 48)], (187, 247, 208, 255))
    rect(d, 22, 37, 36, 40, (250, 204, 21, 255))

    # Head with vibrant emerald hair
    draw_anime_head(
        d, 29, 19,
        skin=(255, 236, 222, 255),
        skin_sh=(236, 198, 178, 255),
        eye_main=(34, 197, 94, 255),
        eye_hi=(254, 249, 195, 255),
        hair_base=(74, 222, 128, 255),
        hair_sh=(21, 128, 61, 255),
        hair_hi=(254, 249, 195, 255),
        blush=(253, 164, 175, 255),
    )

    # Spinning Glowing Wind Chakram held forward
    d.ellipse([43, 24, 59, 40], outline=(74, 222, 128, 255), width=3)
    d.ellipse([46, 27, 56, 37], outline=(254, 249, 195, 255), width=2)
    return add_outline(img)


def make_oni():
    """Shuten — Rei Oni Escarlate (64x64 crimson-skinned horned Oni warlord with blazing kanabo)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Wild flowing white Oni mane behind
    poly(d, [(20, 12), (8, 22), (10, 38), (22, 34)], (241, 245, 249, 255))

    # Muscular crimson Oni legs + tiger-pelt waist wrap
    rect(d, 19, 44, 27, 58, (220, 38, 38, 255))
    rect(d, 31, 44, 40, 58, (220, 38, 38, 255))
    rect(d, 19, 55, 28, 59, (30, 27, 36, 255))
    rect(d, 31, 55, 41, 59, (30, 27, 36, 255))
    # Tiger-striped loincloth
    rect(d, 18, 39, 41, 47, (250, 204, 21, 255))
    for tx in (21, 27, 33, 38):
        rect(d, tx, 40, tx + 2, 46, (30, 27, 36, 255))

    # Broad Crimson Oni Torso with gold beads
    rect(d, 18, 27, 40, 40, (220, 38, 38, 255))
    rect(d, 20, 28, 37, 37, (239, 68, 68, 255))
    for bx in (22, 26, 30, 34):
        rect(d, bx, 29, bx + 2, 31, (250, 204, 21, 255))

    # Fierce Oni Head with curved golden horns
    draw_anime_head(
        d, 29, 18,
        skin=(239, 68, 68, 255),
        skin_sh=(185, 28, 28, 255),
        eye_main=(250, 204, 21, 255),
        eye_hi=(255, 255, 255, 255),
        hair_base=(241, 245, 249, 255),
        hair_sh=(148, 163, 184, 255),
        hair_hi=(255, 255, 255, 255),
    )
    poly(d, [(23, 11), (18, 2), (26, 10)], (250, 204, 21, 255))
    poly(d, [(33, 11), (39, 2), (36, 11)], (250, 204, 21, 255))

    # Blazing Magma Kanabo War-Club
    poly(d, [(40, 36), (57, 10), (62, 15), (46, 40)], (51, 65, 85, 255))
    for sx, sy in [(47, 29), (51, 23), (55, 17), (58, 13)]:
        rect(d, sx, sy, sx + 2, sy + 2, (250, 204, 21, 255))
    return add_outline(img)


def make_seraph():
    """Seraph — Arcanjo Solar (64x64 six-winged golden seraphim with twin solar light-blades)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Six Radiant Golden-White Wings!
    for pts in [
        [(24, 26), (4, 8), (10, 24), (24, 30)],
        [(23, 33), (6, 30), (10, 42), (24, 38)],
        [(34, 25), (52, 8), (48, 22), (35, 29)],
    ]:
        poly(d, pts, (254, 240, 138, 255))
    # Radiant Halo
    d.ellipse([21, 4, 37, 10], outline=(250, 204, 21, 255), width=2)

    # White & Gold Seraphim Armor
    rect(d, 22, 44, 27, 57, (255, 255, 255, 255))
    rect(d, 31, 44, 37, 57, (255, 255, 255, 255))
    poly(d, [(21, 28), (37, 28), (39, 46), (19, 46)], (255, 255, 255, 255))
    rect(d, 26, 29, 32, 45, (250, 204, 21, 255))
    rect(d, 27, 32, 31, 36, (251, 113, 133, 255))

    # Head with luminous golden hair
    draw_anime_head(
        d, 29, 19,
        skin=(255, 236, 222, 255),
        skin_sh=(236, 198, 178, 255),
        eye_main=(250, 204, 21, 255),
        eye_hi=(255, 255, 255, 255),
        hair_base=(254, 240, 138, 255),
        hair_sh=(234, 179, 8, 255),
        hair_hi=(255, 255, 255, 255),
    )

    # Twin Solar Light-Blades
    d.line([(40, 35), (60, 21)], fill=(250, 204, 21, 255), width=4)
    d.line([(41, 35), (59, 22)], fill=(255, 255, 255, 255), width=2)
    d.line([(19, 36), (6, 47)], fill=(251, 113, 133, 255), width=3)
    return add_outline(img)


def main():
    makers = {
        "ren": make_ren,
        "lyra": make_lyra,
        "bram": make_bram,
        "kage": make_kage,
        "sora": make_sora,
        "hana": make_hana,
        "ryuji": make_ryuji,
        "yuki": make_yuki,
        "drake": make_drake,
        "nova": make_nova,
        "kael": make_kael,
        "tetsu": make_tetsu,
        "fenrir": make_fenrir,
        "ignis": make_ignis,
        "cerberus": make_cerberus,
        "medusa": make_medusa,
        "anubis": make_anubis,
        "freya": make_freya,
        "leviathan": make_leviathan,
        "behemoth": make_behemoth,
        "bahamut": make_bahamut,
        "kraken": make_kraken,
        "kitsune": make_kitsune,
        "golem": make_golem,
        "raijin": make_raijin,
        "valkor": make_valkor,
        "aegis": make_aegis,
        "sylph": make_sylph,
        "oni": make_oni,
        "seraph": make_seraph,
    }
    for name, fn in makers.items():
        sprite_64 = fn()
        # Upgrade to crisp 128x128 HD pixel art (EPX + 3-tone lighting + sel-out) -> scale 2x to 256x256
        sprite_128 = enhance_pixel_art_128(sprite_64)
        scaled = sprite_128.resize((256, 256), Image.Resampling.NEAREST)
        out_path = os.path.join(SPRITE_DIR, f"{name}.png")
        scaled.save(out_path)
        print("Saved 128x128 HD:", out_path)

    arena = make_arena_bg()
    arena_path = os.path.join(OUT_DIR, "arena_bg.png")
    arena.save(arena_path)
    print("Saved:", arena_path)


if __name__ == "__main__":
    main()
