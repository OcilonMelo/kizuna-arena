import os
import math
import random
from PIL import Image, ImageDraw

OUT_DIR = r"C:\Users\manoel.ocilon\.gemini\antigravity\scratch\kizuna-arena\public\assets"
SPRITE_DIR = os.path.join(OUT_DIR, "sprites")
os.makedirs(SPRITE_DIR, exist_ok=True)


def add_outline(img: Image.Image, outline_color=(16, 12, 24, 255)) -> Image.Image:
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


def rect(draw, x0, y0, x1, y1, color):
    draw.rectangle([x0, y0, x1, y1], fill=color)


def draw_base_anime_body(draw, skin, skin_sh, hair, hair_hi, eye, tunic, tunic_sh, pants, boots, scarf=None, cape=None):
    # Cape behind
    if cape:
        rect(draw, 8, 15, 14, 26, cape[1])
        rect(draw, 10, 14, 15, 24, cape[0])

    # Legs / boots (dynamic battle stance facing right)
    rect(draw, 12, 24, 15, 28, pants)
    rect(draw, 17, 24, 20, 28, pants)
    rect(draw, 11, 27, 15, 29, boots)
    rect(draw, 17, 27, 22, 29, boots)

    # Torso / Tunic
    rect(draw, 12, 15, 20, 24, tunic)
    rect(draw, 12, 15, 14, 24, tunic_sh)
    rect(draw, 12, 21, 20, 22, (40, 32, 48, 255))  # belt
    rect(draw, 16, 21, 18, 22, (250, 204, 21, 255))  # buckle

    # Scarf
    if scarf:
        rect(draw, 12, 14, 20, 16, scarf[0])
        rect(draw, 7, 14, 12, 16, scarf[0])
        rect(draw, 5, 16, 10, 18, scarf[1])

    # Head (anime proportions)
    rect(draw, 12, 6, 20, 14, skin)
    rect(draw, 12, 12, 14, 14, skin_sh)

    # Anime Eyes (facing right)
    rect(draw, 16, 9, 17, 11, (255, 255, 255, 255))
    rect(draw, 17, 10, 17, 11, eye)
    rect(draw, 19, 9, 20, 11, (255, 255, 255, 255))
    rect(draw, 20, 10, 20, 11, eye)

    # Hair base
    rect(draw, 11, 4, 21, 8, hair)
    rect(draw, 10, 6, 13, 12, hair)
    rect(draw, 13, 5, 18, 6, hair_hi)
    # Spiky fringe
    rect(draw, 13, 7, 15, 9, hair)
    rect(draw, 17, 7, 19, 8, hair)
    rect(draw, 20, 6, 22, 8, hair)


def make_ren():
    img = Image.new("RGBA", (36, 36), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_base_anime_body(
        d,
        skin=(253, 224, 196, 255),
        skin_sh=(234, 182, 148, 255),
        hair=(30, 35, 58, 255),
        hair_hi=(71, 85, 125, 255),
        eye=(239, 68, 68, 255),
        tunic=(30, 58, 138, 255),
        tunic_sh=(23, 37, 84, 255),
        pants=(30, 41, 59, 255),
        boots=(127, 29, 29, 255),
        scarf=((239, 68, 68, 255), (185, 28, 28, 255)),
    )
    # Extra spiky anime hair
    rect(d, 9, 4, 12, 6, (30, 35, 58, 255))
    rect(d, 15, 2, 18, 4, (30, 35, 58, 255))
    rect(d, 20, 3, 22, 5, (30, 35, 58, 255))
    # Front arm + Glowing Katana
    rect(d, 18, 17, 22, 19, (253, 224, 196, 255))
    rect(d, 21, 18, 23, 20, (250, 204, 21, 255))  # tsuba
    # Diagonal flame katana blade
    for i in range(11):
        bx = 23 + i
        by = 17 - i
        if 0 <= bx < 35 and 0 <= by < 35:
            d.point((bx, by), fill=(255, 255, 255, 255))
            d.point((bx, by + 1), fill=(251, 146, 60, 255))
            if i % 2 == 0:
                d.point((bx - 1, by), fill=(239, 68, 68, 255))
    return add_outline(img)


def make_lyra():
    img = Image.new("RGBA", (36, 36), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_base_anime_body(
        d,
        skin=(254, 232, 214, 255),
        skin_sh=(236, 196, 172, 255),
        hair=(226, 232, 240, 255),
        hair_hi=(255, 255, 255, 255),
        eye=(56, 189, 248, 255),
        tunic=(37, 99, 235, 255),
        tunic_sh=(29, 78, 216, 255),
        pants=(30, 27, 75, 255),
        boots=(59, 130, 246, 255),
        cape=((79, 70, 229, 255), (49, 46, 129, 255)),
    )
    # Long flowing silver hair
    rect(d, 9, 8, 12, 18, (226, 232, 240, 255))
    # Gold mage trim
    rect(d, 15, 15, 17, 24, (250, 204, 21, 255))
    rect(d, 11, 23, 21, 25, (37, 99, 235, 255))
    # Pointed wizard/mage hat
    rect(d, 9, 5, 23, 6, (49, 46, 129, 255))
    rect(d, 12, 2, 19, 5, (67, 56, 202, 255))
    rect(d, 14, 1, 17, 2, (250, 204, 21, 255))
    # Crystal staff
    rect(d, 23, 9, 24, 28, (146, 64, 14, 255))
    rect(d, 22, 6, 25, 9, (56, 189, 248, 255))
    rect(d, 23, 5, 24, 10, (224, 242, 254, 255))
    rect(d, 21, 7, 26, 8, (125, 211, 252, 255))
    return add_outline(img)


def make_bram():
    img = Image.new("RGBA", (36, 36), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_base_anime_body(
        d,
        skin=(248, 214, 184, 255),
        skin_sh=(220, 174, 140, 255),
        hair=(234, 179, 8, 255),
        hair_hi=(254, 240, 138, 255),
        eye=(59, 130, 246, 255),
        tunic=(203, 213, 225, 255),
        tunic_sh=(148, 163, 184, 255),
        pants=(100, 116, 139, 255),
        boots=(202, 138, 4, 255),
        cape=((37, 99, 235, 255), (30, 58, 138, 255)),
    )
    # Broad golden pauldrons
    rect(d, 10, 14, 14, 18, (234, 179, 8, 255))
    rect(d, 18, 14, 22, 18, (250, 204, 21, 255))
    # Helmet crest
    rect(d, 11, 4, 21, 7, (226, 232, 240, 255))
    rect(d, 14, 2, 18, 4, (250, 204, 21, 255))
    # Large Tower Shield in front
    rect(d, 21, 14, 28, 26, (234, 179, 8, 255))
    rect(d, 22, 15, 27, 25, (37, 99, 235, 255))
    rect(d, 24, 16, 25, 24, (254, 240, 138, 255))
    rect(d, 22, 19, 27, 20, (254, 240, 138, 255))
    # Warhammer peeking behind
    rect(d, 8, 8, 10, 20, (120, 53, 15, 255))
    rect(d, 5, 6, 13, 10, (226, 232, 240, 255))
    rect(d, 6, 7, 12, 9, (250, 204, 21, 255))
    return add_outline(img)


def make_kage():
    img = Image.new("RGBA", (36, 36), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_base_anime_body(
        d,
        skin=(245, 215, 195, 255),
        skin_sh=(215, 180, 155, 255),
        hair=(46, 16, 101, 255),
        hair_hi=(126, 34, 206, 255),
        eye=(232, 121, 249, 255),
        tunic=(30, 27, 75, 255),
        tunic_sh=(15, 23, 42, 255),
        pants=(15, 23, 42, 255),
        boots=(88, 28, 135, 255),
        scarf=((168, 85, 247, 255), (107, 33, 168, 255)),
    )
    # Shinobi mask covering lower face
    rect(d, 13, 11, 20, 14, (49, 46, 129, 255))
    # Glowing eyes
    rect(d, 16, 9, 17, 10, (240, 171, 252, 255))
    rect(d, 19, 9, 20, 10, (240, 171, 252, 255))
    # Twin glowing purple energy daggers
    for i in range(7):
        d.point((21 + i, 19 - i // 2), fill=(232, 121, 249, 255))
        d.point((21 + i, 20 - i // 2), fill=(168, 85, 247, 255))
    for i in range(6):
        d.point((10 - i, 19 + i // 2), fill=(232, 121, 249, 255))
        d.point((10 - i, 20 + i // 2), fill=(168, 85, 247, 255))
    return add_outline(img)


def make_sora():
    img = Image.new("RGBA", (36, 36), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_base_anime_body(
        d,
        skin=(253, 226, 198, 255),
        skin_sh=(230, 188, 154, 255),
        hair=(250, 204, 21, 255),
        hair_hi=(254, 249, 195, 255),
        eye=(16, 185, 129, 255),
        tunic=(5, 150, 105, 255),
        tunic_sh=(6, 95, 70, 255),
        pants=(120, 53, 15, 255),
        boots=(69, 26, 3, 255),
        cape=((16, 185, 129, 255), (4, 120, 87, 255)),
    )
    # Windswept ponytail
    rect(d, 7, 7, 11, 11, (250, 204, 21, 255))
    rect(d, 5, 9, 8, 12, (234, 179, 8, 255))
    # Glowing Energy Bow
    for dy in range(-7, 8):
        bx = 26 - int((dy * dy) / 14)
        by = 17 + dy
        d.point((bx, by), fill=(52, 211, 153, 255))
        d.point((bx + 1, by), fill=(167, 243, 208, 255))
    # Bowstring + glowing arrow
    d.line([(23, 10), (23, 24)], fill=(209, 250, 229, 255))
    rect(d, 19, 17, 29, 17, (255, 255, 255, 255))
    rect(d, 28, 16, 30, 18, (52, 211, 153, 255))
    return add_outline(img)


def make_hana():
    img = Image.new("RGBA", (36, 36), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_base_anime_body(
        d,
        skin=(255, 232, 220, 255),
        skin_sh=(238, 198, 180, 255),
        hair=(244, 114, 182, 255),
        hair_hi=(251, 207, 232, 255),
        eye=(234, 179, 8, 255),
        tunic=(255, 255, 255, 255),
        tunic_sh=(226, 232, 240, 255),
        pants=(244, 114, 182, 255),
        boots=(219, 39, 119, 255),
    )
    # Long flowing pink shrine maiden hair + gold ribbon
    rect(d, 9, 8, 12, 20, (244, 114, 182, 255))
    rect(d, 14, 4, 18, 5, (250, 204, 21, 255))
    # Ceremonial crimson-pink skirt/hakama
    rect(d, 11, 21, 21, 27, (236, 72, 153, 255))
    rect(d, 12, 21, 20, 22, (250, 204, 21, 255))
    # Golden Lantern Staff
    rect(d, 23, 10, 24, 28, (217, 119, 6, 255))
    rect(d, 22, 8, 26, 10, (250, 204, 21, 255))
    rect(d, 23, 10, 26, 14, (254, 240, 138, 255))
    rect(d, 24, 11, 25, 13, (255, 255, 255, 255))
    return add_outline(img)


def make_arena_bg():
    # Wider logical low-res pixel art canvas (426 x 240) scaled 3x -> 1280 x 720 nearest-neighbor
    W, H = 426, 240
    img = Image.new("RGBA", (W, H), (14, 13, 34, 255))
    d = ImageDraw.Draw(img)

    # Twilight anime gradient sky (top 68 px)
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

    # Pixel stars & crescent moon glow
    rng = random.Random(42)
    for _ in range(70):
        sx, sy = rng.randint(2, W - 3), rng.randint(2, 48)
        c = (255, 250, 220, 255) if rng.random() > 0.35 else (147, 197, 253, 255)
        d.point((sx, sy), fill=c)

    # Moon
    d.ellipse([W - 58, 10, W - 34, 34], fill=(254, 249, 195, 255))
    d.ellipse([W - 52, 8, W - 30, 30], fill=(22, 18, 56, 255))

    # Distant floating anime islands & mountains
    for x in range(W):
        peak = int(56 - 12 * abs(math.sin(x * 0.019)) - 6 * math.sin(x * 0.06))
        d.line([(x, peak), (x, 68)], fill=(26, 20, 52, 255))

    # Grand Colosseum upper wall & glowing trim
    rect(d, 0, 58, W, 72, (48, 52, 78, 255))
    rect(d, 0, 58, W, 60, (98, 108, 146, 255))
    rect(d, 0, 70, W, 72, (28, 30, 48, 255))

    # Carved stone pillars with glowing cyan crystals
    for px in (18, 88, 162, 248, 322, 392):
        rect(d, px, 28, px + 16, 72, (70, 76, 108, 255))
        rect(d, px + 2, 30, px + 13, 70, (98, 106, 142, 255))
        rect(d, px - 2, 25, px + 18, 29, (132, 142, 178, 255))
        rect(d, px + 6, 38, px + 9, 45, (56, 189, 248, 255))
        rect(d, px + 7, 39, px + 8, 44, (224, 242, 254, 255))

    # Expansive Arena Stone Floor (y=72..239)
    rect(d, 0, 72, W, H, (42, 46, 70, 255))

    # Tiled stone grid
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

    # Outer glowing arena boundary border
    d.rectangle([14, 76, W - 15, H - 8], outline=(88, 98, 140, 255), width=2)
    # Center divider & side deployment markers
    d.line([(W // 2, 78), (W // 2, H - 10)], fill=(56, 189, 248, 90), width=1)
    d.line([(W // 4, 84), (W // 4, H - 16)], fill=(56, 189, 248, 40), width=1)
    d.line([(3 * W // 4, 84), (3 * W // 4, H - 16)], fill=(244, 63, 94, 40), width=1)

    # Grand Glowing Rune Circle in center
    cx, cy = W // 2, 156
    d.ellipse([cx - 58, cy - 30, cx + 58, cy + 30], outline=(56, 189, 248, 185), width=2)
    d.ellipse([cx - 44, cy - 22, cx + 44, cy + 22], outline=(129, 140, 248, 150), width=1)
    d.ellipse([cx - 16, cy - 8, cx + 16, cy + 8], outline=(224, 242, 254, 190), width=1)

    # Fallen cherry blossom petals
    for _ in range(85):
        px = rng.randint(4, W - 5)
        py = rng.randint(60, 95) if rng.random() > 0.35 else rng.randint(78, H - 12)
        c = (244, 114, 182, 230) if rng.random() > 0.4 else (251, 207, 232, 230)
        rect(d, px, py, px + 1, py + 1, c)

    return img.resize((1280, 720), Image.Resampling.NEAREST)


def main():
    makers = {
        "ren": make_ren,
        "lyra": make_lyra,
        "bram": make_bram,
        "kage": make_kage,
        "sora": make_sora,
        "hana": make_hana,
    }
    for name, fn in makers.items():
        sprite = fn()
        # Scale 4x crisp nearest-neighbor -> 144x144
        scaled = sprite.resize((144, 144), Image.Resampling.NEAREST)
        out_path = os.path.join(SPRITE_DIR, f"{name}.png")
        scaled.save(out_path)
        print("Saved:", out_path)

    arena = make_arena_bg()
    arena_path = os.path.join(OUT_DIR, "arena_bg.png")
    arena.save(arena_path)
    print("Saved:", arena_path)


if __name__ == "__main__":
    main()
