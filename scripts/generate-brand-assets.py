# -*- coding: utf-8 -*-
"""
Génère TOUS les assets de marque La Base 360 depuis la source canonique.

Pourquoi ce script existe
-------------------------
Les assets livrés en prod jusqu'au 2026-08-13 dataient du rebrand « G3 Vital
Fusion » (dégradé emerald → cyan → violet, squircle brillant, lettre B en
Arial Black). Ils ne correspondaient plus à l'identité en vigueur, qui impose
une construction strictement plate :

    anneau teal ouvert (#2DD4BF) + barre lime à 45° (#C5F82A) + B blanc

Règle dure de la charte : le logo est rendu 100 % plat — jamais d'ombre, de
biseau, de brillance ni de dégradé, jamais l'anneau fermé, jamais le B en
dégradé. Les anciens fichiers violaient les trois interdits d'un coup.

Régénérer plutôt que bricoler à la main garantit que les 20 déclinaisons
(favicons, PWA, maskable, OG, apple-touch) restent cohérentes entre elles.

Usage
-----
    python3 scripts/generate-brand-assets.py

Dépendances : cairosvg, pillow  (pip install cairosvg pillow)
Sources     : scripts/brand-src/  (marks canoniques + Anton)
Sortie      : public/brand/labase360/
"""

import os
import shutil

import cairosvg
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "brand-src")
OUT = os.path.join(ROOT, "public", "brand", "labase360")

# ── Palette charte ────────────────────────────────────────────────────────
GROUND = "#162624"   # vert profond : le fond de marque (jamais noir, jamais bleu nuit)
TEAL = "#2DD4BF"     # couleur structurelle / signature
LIME = "#C5F82A"     # réservé aux victoires — ici l'accent 45° du symbole
CREAM = "#F4EFE4"    # blanc chaud du wordmark sur fond sombre
MUTED = "#8FA5A0"    # baseline discrète

# Géométrie du symbole, reprise telle quelle de la source canonique.
RING = ('<path d="M 176.3 71.6 A 80 80 0 1 1 128.3 23.6" fill="none" '
        'stroke="{teal}" stroke-width="13" stroke-linecap="round"/>')
BAR = ('<rect x="-24" y="-6.5" width="48" height="13" rx="6.5" fill="{lime}" '
       'transform="translate(159 41) rotate(-45)"/>')
LETTER_B = (
    '<path fill-rule="evenodd" fill="{ink}" d="M 66 52 L 111 52 C 131 52 144 63.5 144 77 '
    'C 144 88 137 95.5 127 99.5 C 139.5 103 149 112.5 149 126 C 149 140.5 135 151 113 151 '
    'L 66 151 Z M 87 70 L 87 91 L 109 91 C 118.5 91 124 86.5 124 80.5 C 124 74.5 118.5 70 '
    '109 70 Z M 87 110 L 87 133 L 112 133 C 122 133 128 128 128 121.5 C 128 115 122 110 112 '
    '110 Z"/>'
)


def mark_body(teal=TEAL, lime=LIME, ink="#FFFFFF"):
    """Le symbole seul, dans un repère 200×200. Aucun filtre, aucun dégradé."""
    return (RING.format(teal=teal) + BAR.format(lime=lime) + LETTER_B.format(ink=ink))


def svg_mark(teal=TEAL, lime=LIME, ink="#FFFFFF"):
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" '
        'height="200" role="img" aria-label="La Base 360">'
        f"{mark_body(teal, lime, ink)}</svg>"
    )


def svg_badge(side=512, radius_ratio=0.22, mark_ratio=0.62, ground=GROUND):
    """
    Symbole centré sur le fond de marque, coins en squircle (~22 % du côté
    selon la charte). Auto-porteur : lisible aussi bien sur fond clair que
    sombre, donc utilisable partout sans variante.
    """
    r = side * radius_ratio
    size = side * mark_ratio
    offset = (side - size) / 2
    scale = size / 200.0
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {side} {side}" '
        f'width="{side}" height="{side}" role="img" aria-label="La Base 360">'
        f'<rect width="{side}" height="{side}" rx="{r:.2f}" ry="{r:.2f}" fill="{ground}"/>'
        f'<g transform="translate({offset:.2f} {offset:.2f}) scale({scale:.5f})">'
        f"{mark_body()}</g></svg>"
    )


def render_png(svg: str, path: str, side: int):
    cairosvg.svg2png(bytestring=svg.encode("utf-8"), write_to=path,
                     output_width=side, output_height=side)
    print(f"  {os.path.relpath(path, ROOT)}  {side}×{side}")


def flatten(path: str, bg=GROUND):
    """Aplatit l'alpha sur le fond de marque : iOS et Android peignent en noir
    derrière une icône transparente, ce qui casserait le vert profond."""
    im = Image.open(path).convert("RGBA")
    base = Image.new("RGBA", im.size, bg)
    Image.alpha_composite(base, im).convert("RGB").save(path)


def text_to_path(text: str, font_path: str, font_size: float, x: float, y: float,
                 fill: str, tracking: float = 0.0) -> str:
    """
    Vectorise une chaîne avec la police donnée.

    Pourquoi vectoriser plutôt qu'embarquer la police : ce SVG est consommé
    via <img>, donc il ne peut pas hériter d'une police de la page, et le
    support de @font-face en data-URI dans un <img> est inégal selon les
    moteurs (le rendu retombe silencieusement sur une sans-serif générique —
    constaté ici). Des contours garantissent un rendu identique partout, sans
    dépendance. `aria-label` sur le <svg> conserve l'accessibilité.
    """
    font = TTFont(font_path)
    upem = font["head"].unitsPerEm
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    scale = font_size / upem

    parts, cursor = [], 0.0
    for ch in text:
        name = cmap.get(ord(ch))
        if name is None:
            cursor += font_size * 0.4
            continue
        pen = SVGPathPen(glyph_set)
        glyph_set[name].draw(pen)
        d = pen.getCommands()
        if d:
            # y inversé : les polices montent, le repère SVG descend.
            parts.append(
                f'<path d="{d}" transform="translate({x + cursor:.2f} {y:.2f}) '
                f'scale({scale:.6f} {-scale:.6f})" fill="{fill}"/>'
            )
        cursor += hmtx[name][0] * scale + tracking
    return "".join(parts)


def svg_horizontal() -> str:
    """Lockup horizontal : symbole + wordmark vectorisé + baseline."""
    anton = os.path.join(SRC, "Anton-Regular.ttf")
    w, h = 900, 260
    mark = 170
    my = (h - mark) / 2
    scale = mark / 200.0
    wordmark = text_to_path("LA BASE 360", anton, 92, 245, 142, CREAM, tracking=1.5)
    baseline = text_to_path("THE WELLNESS NUTRITION CLUB", anton, 20, 248, 182,
                            MUTED, tracking=5.2)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" '
        f'height="{h}" role="img" aria-label="La Base 360 — The wellness nutrition club">'
        f'<g transform="translate(30 {my:.1f}) scale({scale:.5f})">{mark_body()}</g>'
        f"{wordmark}{baseline}</svg>"
    )


def write(name: str, content: str):
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(content)
    print(f"  {os.path.relpath(path, ROOT)}")


def main():
    os.makedirs(OUT, exist_ok=True)
    print("SVG :")
    # Variantes plates du symbole (fond transparent).
    write("logo-mark.svg", svg_mark())                                    # fond sombre
    write("logo-mark-light.svg", svg_mark("#0D9488", "#6D8C0B", "#17201C"))  # fond clair
    write("logo-mark-mono.svg", svg_mark("currentColor", "currentColor", "currentColor"))
    # logo-primary garde son nom : référencé par index.html, LoginPage,
    # LaBase360Logo et visualContent. Badge auto-porteur → aucun risque de B
    # blanc invisible sur un fond clair.
    write("logo-primary.svg", svg_badge(600))
    write("app-icon-512.svg", svg_badge(512))
    write("app-icon-1024.svg", svg_badge(1024))
    write("favicon.svg", svg_badge(64, mark_ratio=0.72))
    write("logo-horizontal.svg", svg_horizontal())

    print("Favicons :")
    fav = svg_badge(256, mark_ratio=0.72)
    for s in (16, 32, 48, 64, 96):
        p = os.path.join(OUT, f"favicon-{s}.png")
        render_png(fav, p, s)
        flatten(p)

    print("PWA (purpose any) — symbole à 62 %, pleine page :")
    any_icon = svg_badge(1024, radius_ratio=0.0, mark_ratio=0.62)
    for s in (192, 256, 384, 512, 1024):
        p = os.path.join(OUT, f"pwa-{s}.png")
        render_png(any_icon, p, s)
        flatten(p)

    print("PWA maskable — symbole à 46 % pour tenir dans la zone sûre :")
    # Android rogne jusqu'à un cercle inscrit : tout ce qui dépasse des 80 %
    # centraux peut disparaître. On réduit donc le symbole en conséquence.
    maskable = svg_badge(1024, radius_ratio=0.0, mark_ratio=0.46)
    for s in (192, 512):
        p = os.path.join(OUT, f"pwa-maskable-{s}.png")
        render_png(maskable, p, s)
        flatten(p)

    print("Apple touch icon — opaque obligatoire :")
    p = os.path.join(OUT, "apple-touch-icon-180.png")
    render_png(svg_badge(512, radius_ratio=0.0, mark_ratio=0.66), p, 180)
    flatten(p)

    print("Open Graph 1200×630 :")
    og_src = os.path.join(
        SRC, "og-image-1200x630.png"
    )
    og_dst = os.path.join(OUT, "og-image-1200x630.png")
    if os.path.exists(og_src):
        shutil.copyfile(og_src, og_dst)
        print(f"  {os.path.relpath(og_dst, ROOT)}  (source canonique)")
    else:
        anton = os.path.join(SRC, "Anton-Regular.ttf")
        og = (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" '
            'width="1200" height="630">'
            f'<rect width="1200" height="630" fill="{GROUND}"/>'
            f'<g transform="translate(150 205) scale(1.1)">{mark_body()}</g>'
            + text_to_path("LA BASE 360", anton, 104, 430, 330, CREAM, tracking=2)
            + text_to_path("THE WELLNESS NUTRITION CLUB", anton, 23, 434, 382,
                           MUTED, tracking=6)
            + "</svg>"
        )
        cairosvg.svg2png(bytestring=og.encode("utf-8"), write_to=og_dst,
                         output_width=1200, output_height=630)
        Image.open(og_dst).convert("RGB").save(og_dst)
        print(f"  {os.path.relpath(og_dst, ROOT)}  (rendu local)")

    print("\nTerminé.")


if __name__ == "__main__":
    main()
