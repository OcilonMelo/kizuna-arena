import os
import math
import random
from PIL import Image, ImageDraw

OUT_DIR = r"C:\Users\manoel.ocilon\.gemini\antigravity\scratch\kizuna-arena\public\assets"
SPRITE_DIR = os.path.join(OUT_DIR, "sprites")
os.makedirs(SPRITE_DIR, exist_ok=True)


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
    """Bram — Baluarte Dourado (64x64 towering armored paladin with kite shield & warhammer)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Heavy Celestial Warhammer behind left shoulder
    d.line([(17, 16), (25, 42)], fill=(120, 53, 15, 255), width=3)
    rect(d, 8, 9, 24, 19, (148, 163, 184, 255))
    rect(d, 10, 10, 22, 16, (226, 232, 240, 255))
    rect(d, 8, 9, 11, 19, (250, 204, 21, 255))
    rect(d, 21, 9, 24, 19, (250, 204, 21, 255))
    rect(d, 14, 12, 18, 16, (56, 189, 248, 255))

    # Royal blue paladin cape with gold trim
    poly(d, [(20, 27), (10, 51), (22, 53), (28, 34)], (30, 58, 138, 255))
    poly(d, [(21, 28), (13, 49), (21, 51), (27, 34)], (37, 99, 235, 255))
    d.line([(11, 50), (21, 52)], fill=(250, 204, 21, 255), width=2)

    # Armored Greaves / Legs
    rect(d, 20, 44, 27, 58, (148, 163, 184, 255))
    rect(d, 21, 45, 25, 55, (203, 213, 225, 255))
    rect(d, 19, 55, 28, 59, (202, 138, 4, 255))

    rect(d, 30, 44, 38, 58, (148, 163, 184, 255))
    rect(d, 32, 45, 36, 55, (226, 232, 240, 255))
    rect(d, 30, 55, 40, 59, (234, 179, 8, 255))

    # Broad Metallic Breastplate + Royal Blue Tabard
    rect(d, 18, 27, 39, 45, (148, 163, 184, 255))
    rect(d, 20, 28, 37, 42, (226, 232, 240, 255))
    rect(d, 25, 31, 33, 45, (37, 99, 235, 255))
    rect(d, 28, 32, 30, 44, (250, 204, 21, 255))
    rect(d, 18, 41, 39, 44, (202, 138, 4, 255))

    # Huge Sculpted Golden Pauldrons
    poly(d, [(14, 26), (24, 25), (24, 34), (14, 33)], (234, 179, 8, 255))
    rect(d, 16, 27, 23, 30, (254, 240, 138, 255))
    poly(d, [(33, 25), (43, 26), (42, 34), (33, 34)], (234, 179, 8, 255))
    rect(d, 34, 27, 41, 30, (254, 240, 138, 255))

    # Head with heroic blond hair + winged silver-gold knight helm
    draw_anime_head(
        d, 29, 18,
        skin=(248, 214, 184, 255),
        skin_sh=(218, 172, 138, 255),
        eye_main=(59, 130, 246, 255),
        eye_hi=(191, 219, 254, 255),
        hair_base=(234, 179, 8, 255),
        hair_sh=(161, 98, 7, 255),
        hair_hi=(254, 240, 138, 255),
    )
    # Helmet crown + blue plume
    rect(d, 20, 9, 37, 15, (203, 213, 225, 255))
    rect(d, 22, 10, 35, 13, (241, 245, 249, 255))
    rect(d, 20, 14, 37, 15, (250, 204, 21, 255))
    poly(d, [(25, 9), (32, 9), (26, 3), (18, 6)], (37, 99, 235, 255))
    poly(d, [(26, 8), (30, 8), (26, 4)], (96, 165, 250, 255))

    # Massive Ornate Tower/Kite Shield in front
    poly(d, [(38, 27), (54, 27), (54, 46), (46, 56), (38, 46)], (234, 179, 8, 255))
    poly(d, [(40, 29), (52, 29), (52, 45), (46, 53), (40, 45)], (37, 99, 235, 255))
    # Golden Cross Emblem + Shine
    rect(d, 45, 31, 47, 50, (254, 240, 138, 255))
    rect(d, 41, 37, 51, 40, (254, 240, 138, 255))
    rect(d, 45, 37, 47, 40, (255, 255, 255, 255))

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
    }
    for name, fn in makers.items():
        sprite = fn()
        # Scale 3x crisp nearest-neighbor -> 192x192
        scaled = sprite.resize((192, 192), Image.Resampling.NEAREST)
        out_path = os.path.join(SPRITE_DIR, f"{name}.png")
        scaled.save(out_path)
        print("Saved:", out_path)

    arena = make_arena_bg()
    arena_path = os.path.join(OUT_DIR, "arena_bg.png")
    arena.save(arena_path)
    print("Saved:", arena_path)


if __name__ == "__main__":
    main()
