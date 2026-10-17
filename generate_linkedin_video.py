"""
FFC Valve Reclamation System - LinkedIn Android App Showcase Video Generator
High-Quality 1080p 60fps / 30fps Video with Smooth Zoom, Pan, and 3D Motion Graphics
Designed & Engineered by Muhammad Wasiq Hussain
"""

import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio

# Paths
FONTS_DIR = r"C:\Windows\Fonts"
FONT_REGULAR = os.path.join(FONTS_DIR, "segoeui.ttf") if os.path.exists(os.path.join(FONTS_DIR, "segoeui.ttf")) else os.path.join(FONTS_DIR, "arial.ttf")
FONT_BOLD = os.path.join(FONTS_DIR, "segoeuib.ttf") if os.path.exists(os.path.join(FONTS_DIR, "segoeuib.ttf")) else os.path.join(FONTS_DIR, "arialbd.ttf")
FONT_SEMI = os.path.join(FONTS_DIR, "segoeuisl.ttf") if os.path.exists(os.path.join(FONTS_DIR, "segoeuisl.ttf")) else FONT_REGULAR

FFC_LOGO_PATH = r"c:\WASIQ\FFC WORK PAPA\frontend\public\ffc-logo.png"

# Video Configuration
WIDTH = 1920
HEIGHT = 1080
FPS = 30
DURATION_SEC = 34
TOTAL_FRAMES = DURATION_SEC * FPS

# Phone Geometry
PHONE_W = 460
PHONE_H = 960
PHONE_RADIUS = 48
SCREEN_PAD = 14
SCREEN_W = PHONE_W - (SCREEN_PAD * 2)
SCREEN_H = PHONE_H - (SCREEN_PAD * 2)
SCREEN_RADIUS = 38

def get_font(path, size):
    try:
        return ImageFont.truetype(path, int(size))
    except Exception:
        return ImageFont.load_default()

def ease_in_out_cubic(x):
    return 4 * x * x * x if x < 0.5 else 1 - math.pow(-2 * x + 2, 3) / 2

def ease_out_quad(x):
    return 1 - (1 - x) * (1 - x)

def lerp(a, b, t):
    return a + (b - a) * t

# -------------------------------------------------------------
# SCREEN 1: LOGIN SCREEN
# -------------------------------------------------------------
def render_screen_login():
    im = Image.new("RGBA", (SCREEN_W, SCREEN_H), (248, 250, 252, 255))
    draw = ImageDraw.Draw(im)

    # Status Bar
    f_stat = get_font(FONT_BOLD, 14)
    draw.text((28, 14), "09:41", fill=(15, 23, 42), font=f_stat)
    draw.text((SCREEN_W - 85, 14), "5G  ●  100%", fill=(15, 23, 42), font=get_font(FONT_REGULAR, 12))

    # FFC Logo
    if os.path.exists(FFC_LOGO_PATH):
        try:
            logo = Image.open(FFC_LOGO_PATH).convert("RGBA")
            lw = 180
            lh = int(logo.height * (lw / logo.width))
            logo = logo.resize((lw, lh), Image.Resampling.LANCZOS)
            im.paste(logo, ((SCREEN_W - lw) // 2, 85), logo)
        except Exception:
            pass

    # Header Titles
    f_h1 = get_font(FONT_BOLD, 17)
    f_h2 = get_font(FONT_BOLD, 12)
    f_h3 = get_font(FONT_REGULAR, 13)

    t1 = "FAUJI FERTILIZER COMPANY LTD."
    t2 = "FABRICATION SHOP · GOTH MACHHI"
    t3 = "Reclamation Management System"

    draw.text(((SCREEN_W - draw.textlength(t1, f_h1)) // 2, 160), t1, fill=(15, 23, 42), font=f_h1)
    draw.text(((SCREEN_W - draw.textlength(t2, f_h2)) // 2, 185), t2, fill=(4, 120, 87), font=f_h2)
    draw.text(((SCREEN_W - draw.textlength(t3, f_h3)) // 2, 206), t3, fill=(100, 116, 139), font=f_h3)

    # Login Card
    card_x0, card_y0 = 24, 245
    card_x1, card_y1 = SCREEN_W - 24, 690
    draw.rounded_rectangle([card_x0, card_y0, card_x1, card_y1], radius=16, fill=(255, 255, 255, 255), outline=(226, 232, 240), width=1)

    # Card Header
    draw.text((card_x0 + 18, card_y0 + 16), "SIGN IN TO WORKSTATION", fill=(30, 41, 59), font=get_font(FONT_BOLD, 12))
    draw.rounded_rectangle([card_x1 - 105, card_y0 + 12, card_x1 - 16, card_y0 + 32], radius=6, fill=(236, 253, 245), outline=(167, 243, 208), width=1)
    draw.text((card_x1 - 98, card_y0 + 15), "SECURE SESSION", fill=(5, 150, 105), font=get_font(FONT_BOLD, 9))

    draw.line([(card_x0 + 16, card_y0 + 44), (card_x1 - 16, card_y0 + 44)], fill=(241, 245, 249), width=1)

    # Form Fields
    f_lbl = get_font(FONT_BOLD, 12)
    f_val = get_font(FONT_REGULAR, 13)

    # Field 1
    draw.text((card_x0 + 18, card_y0 + 60), "Official Email or Username", fill=(71, 85, 105), font=f_lbl)
    draw.rounded_rectangle([card_x0 + 18, card_y0 + 82, card_x1 - 18, card_y0 + 124], radius=8, fill=(248, 250, 252), outline=(203, 213, 225), width=1)
    draw.text((card_x0 + 32, card_y0 + 94), "mwasiq@ffc.com.pk", fill=(15, 23, 42), font=f_val)

    # Field 2
    draw.text((card_x0 + 18, card_y0 + 140), "Password", fill=(71, 85, 105), font=f_lbl)
    draw.rounded_rectangle([card_x0 + 18, card_y0 + 162, card_x1 - 18, card_y0 + 204], radius=8, fill=(248, 250, 252), outline=(203, 213, 225), width=1)
    draw.text((card_x0 + 32, card_y0 + 174), "● ● ● ● ● ● ● ● ● ● ● ●", fill=(71, 85, 105), font=f_val)

    # Sign In Button
    draw.rounded_rectangle([card_x0 + 18, card_y0 + 230, card_x1 - 18, card_y0 + 276], radius=10, fill=(15, 23, 42, 255))
    draw.text(((SCREEN_W - draw.textlength("Sign In to Portal →", get_font(FONT_BOLD, 14))) // 2, card_y0 + 244), "Sign In to Portal →", fill=(255, 255, 255), font=get_font(FONT_BOLD, 14))

    # Quick Sign In Button
    draw.rounded_rectangle([card_x0 + 18, card_y0 + 290, card_x1 - 18, card_y0 + 334], radius=10, fill=(236, 253, 245), outline=(110, 231, 183), width=1)
    draw.text(((SCREEN_W - draw.textlength("Quick Sign In (Shop Floor)", get_font(FONT_BOLD, 13))) // 2, card_y0 + 303), "Quick Sign In (Shop Floor)", fill=(6, 95, 70), font=get_font(FONT_BOLD, 13))

    # Quality Standard Footnote
    f_fn = get_font(FONT_REGULAR, 11)
    draw.text(((SCREEN_W - draw.textlength("Quality Specification QF-003-05-307", f_fn)) // 2, 730), "Quality Specification QF-003-05-307", fill=(148, 163, 184), font=f_fn)
    draw.text(((SCREEN_W - draw.textlength("FFC Goth Machhi · Sadiqabad", f_fn)) // 2, 750), "FFC Goth Machhi · Sadiqabad", fill=(148, 163, 184), font=f_fn)

    # Footnote Author Credit
    f_auth = get_font(FONT_BOLD, 12)
    draw.text(((SCREEN_W - draw.textlength("© Muhammad Wasiq Hussain", f_auth)) // 2, 775), "© Muhammad Wasiq Hussain", fill=(100, 116, 139), font=f_auth)

    # Corner Copyright Badge (Right Corner)
    f_corner = get_font(FONT_BOLD, 11)
    draw.rounded_rectangle([SCREEN_W - 175, SCREEN_H - 46, SCREEN_W - 18, SCREEN_H - 18], radius=6, fill=(255, 255, 255, 220), outline=(226, 232, 240), width=1)
    draw.text((SCREEN_W - 168, SCREEN_H - 37), "© Muhammad Wasiq Hussain", fill=(71, 85, 105), font=f_corner)

    # Bottom Android Nav Pill
    draw.rounded_rectangle([(SCREEN_W - 120) // 2, SCREEN_H - 10, (SCREEN_W + 120) // 2, SCREEN_H - 6], radius=2, fill=(15, 23, 42, 140))
    return im

# -------------------------------------------------------------
# SCREEN 2: EXECUTIVE DASHBOARD
# -------------------------------------------------------------
def render_screen_dashboard(progress=1.0):
    im = Image.new("RGBA", (SCREEN_W, SCREEN_H), (248, 250, 252, 255))
    draw = ImageDraw.Draw(im)

    # Status Bar
    draw.text((28, 14), "09:41", fill=(15, 23, 42), font=get_font(FONT_BOLD, 14))
    draw.text((SCREEN_W - 85, 14), "5G  ●  100%", fill=(15, 23, 42), font=get_font(FONT_REGULAR, 12))

    # Top App Bar
    draw.rounded_rectangle([18, 48, SCREEN_W - 18, 98], radius=14, fill=(255, 255, 255), outline=(226, 232, 240), width=1)
    draw.text((32, 58), "FFC RECLAMATION SHOP", fill=(15, 23, 42), font=get_font(FONT_BOLD, 13))
    draw.text((32, 76), "Plant Operations Overview", fill=(100, 116, 139), font=get_font(FONT_REGULAR, 11))

    # Sync Button Pill in TopBar
    draw.rounded_rectangle([SCREEN_W - 95, 58, SCREEN_W - 30, 88], radius=8, fill=(241, 245, 249), outline=(203, 213, 225), width=1)
    draw.text((SCREEN_W - 85, 66), "● Sync", fill=(15, 23, 42), font=get_font(FONT_BOLD, 11))

    # Hero KPI Banner
    draw.rounded_rectangle([18, 112, SCREEN_W - 18, 220], radius=16, fill=(6, 16, 32))
    draw.text((34, 126), "TOTAL VALVES RECLAIMED", fill=(148, 163, 184), font=get_font(FONT_BOLD, 11))

    valves_count = int(1284 * progress)
    draw.text((34, 144), f"{valves_count:,}", fill=(255, 255, 255), font=get_font(FONT_BOLD, 36))

    draw.rounded_rectangle([34, 192, 170, 210], radius=6, fill=(16, 185, 129, 50))
    draw.text((40, 194), "+18.4% vs Last Quarter", fill=(52, 211, 153), font=get_font(FONT_BOLD, 10))

    # KPI 2x2 Grid
    cards = [
        ("Hydro Pass Rate", f"{99.4 * progress:.1f}%", (5, 150, 105), (236, 253, 245)),
        ("Active Floor Jobs", f"{int(48 * progress)}", (37, 99, 235), (239, 246, 255)),
        ("Ready for Delivery", f"{int(132 * progress)}", (217, 119, 6), (254, 243, 199)),
        ("Total Savings (PKR)", f"Rs {84.5 * progress:.1f}M", (124, 58, 237), (245, 243, 255)),
    ]

    for idx, (title, val, fg, bg) in enumerate(cards):
        col = idx % 2
        row = idx // 2
        gx0 = 18 + col * 210
        gy0 = 232 + row * 105
        gx1 = gx0 + 198
        gy1 = gy0 + 95

        draw.rounded_rectangle([gx0, gy0, gx1, gy1], radius=14, fill=bg, outline=(226, 232, 240), width=1)
        draw.text((gx0 + 14, gy0 + 14), title, fill=(100, 116, 139), font=get_font(FONT_BOLD, 11))
        draw.text((gx0 + 14, gy0 + 38), val, fill=fg, font=get_font(FONT_BOLD, 22))

    # Recent Reclamation Section
    draw.text((22, 460), "Active Valve Records (Sequence FAB)", fill=(15, 23, 42), font=get_font(FONT_BOLD, 14))

    records = [
        ("FAB-2026-000001", "Ammonia Plant · 6\" 300# Gate Valve", "READY TO ISSUE", (5, 150, 105)),
        ("FAB-2026-000002", "Urea Unit · 4\" 600# Globe Valve", "TESTING PASS", (37, 99, 235)),
        ("FAB-2026-000003", "Utilities · 10\" Butterfly Valve", "RECLAMATION IN PROG", (217, 119, 6)),
        ("FAB-2026-000004", "DAP Unit · 2\" Check Valve", "INSPECTION QUEUED", (100, 116, 139)),
    ]

    for r_idx, (tag, desc, stat, colr) in enumerate(records):
        ry0 = 490 + r_idx * 75
        ry1 = ry0 + 66
        draw.rounded_rectangle([18, ry0, SCREEN_W - 18, ry1], radius=12, fill=(255, 255, 255), outline=(226, 232, 240), width=1)

        draw.text((32, ry0 + 12), tag, fill=(15, 23, 42), font=get_font(FONT_BOLD, 13))
        draw.text((32, ry0 + 36), desc, fill=(100, 116, 139), font=get_font(FONT_REGULAR, 11))

        # Status Pill
        sw = int(draw.textlength(stat, get_font(FONT_BOLD, 9))) + 16
        draw.rounded_rectangle([SCREEN_W - 32 - sw, ry0 + 20, SCREEN_W - 32, ry0 + 44], radius=6, fill=(colr[0], colr[1], colr[2], 30))
        draw.text((SCREEN_W - 32 - sw + 8, ry0 + 26), stat, fill=colr, font=get_font(FONT_BOLD, 9))

    # Bottom Mobile Bar (Careem / Netflix style)
    draw.rounded_rectangle([0, SCREEN_H - 72, SCREEN_W, SCREEN_H], radius=0, fill=(255, 255, 255, 250), outline=(226, 232, 240), width=1)

    # 4 Nav Items
    navs = ["Dashboard", "Register", "Scan OCR", "New Valve"]
    for n_idx, n_title in enumerate(navs):
        nx = 55 + n_idx * 105
        is_active = (n_idx == 0)
        c_fill = (5, 150, 105) if is_active else (100, 116, 139)
        draw.text(((nx - draw.textlength(n_title, get_font(FONT_BOLD, 11)) // 2), SCREEN_H - 34), n_title, fill=c_fill, font=get_font(FONT_BOLD, 11))
        draw.ellipse([nx - 8, SCREEN_H - 58, nx + 8, SCREEN_H - 42], fill=(c_fill if is_active else (203, 213, 225)))

    # Corner Copyright
    draw.rounded_rectangle([SCREEN_W - 170, SCREEN_H - 96, SCREEN_W - 14, SCREEN_H - 76], radius=5, fill=(255, 255, 255, 220), outline=(226, 232, 240), width=1)
    draw.text((SCREEN_W - 164, SCREEN_H - 91), "© Muhammad Wasiq Hussain", fill=(100, 116, 139), font=get_font(FONT_BOLD, 10))

    # Android Pill
    draw.rounded_rectangle([(SCREEN_W - 120) // 2, SCREEN_H - 8, (SCREEN_W + 120) // 2, SCREEN_H - 4], radius=2, fill=(15, 23, 42, 140))
    return im

# -------------------------------------------------------------
# SCREEN 3: AI OCR CERTIFICATE SCANNER
# -------------------------------------------------------------
def render_screen_scanner(scan_progress=0.5):
    im = Image.new("RGBA", (SCREEN_W, SCREEN_H), (15, 23, 42, 255))
    draw = ImageDraw.Draw(im)

    # Status Bar
    draw.text((28, 14), "09:41", fill=(255, 255, 255), font=get_font(FONT_BOLD, 14))
    draw.text((SCREEN_W - 85, 14), "5G  ●  100%", fill=(255, 255, 255), font=get_font(FONT_REGULAR, 12))

    # Camera Viewfinder Header
    draw.text((24, 48), "AI CERTIFICATE SCANNER", fill=(255, 255, 255), font=get_font(FONT_BOLD, 15))
    draw.text((24, 70), "Point camera at valve test plate or certificate", fill=(148, 163, 184), font=get_font(FONT_REGULAR, 11))

    # Live Camera Viewfinder Box
    vf_x0, vf_y0 = 24, 105
    vf_x1, vf_y1 = SCREEN_W - 24, 460
    draw.rounded_rectangle([vf_x0, vf_y0, vf_x1, vf_y1], radius=18, fill=(30, 41, 59, 255), outline=(51, 65, 85), width=2)

    # Simulated Valve Image background
    draw.rounded_rectangle([vf_x0 + 15, vf_y0 + 15, vf_x1 - 15, vf_y1 - 15], radius=12, fill=(15, 23, 42))

    # Valve Drawing
    draw.ellipse([SCREEN_W//2 - 60, (vf_y0 + vf_y1)//2 - 60, SCREEN_W//2 + 60, (vf_y0 + vf_y1)//2 + 60], outline=(100, 116, 139), width=3)
    draw.rectangle([SCREEN_W//2 - 80, (vf_y0 + vf_y1)//2 - 15, SCREEN_W//2 + 80, (vf_y0 + vf_y1)//2 + 15], fill=(51, 65, 85))
    draw.text((SCREEN_W//2 - 45, (vf_y0 + vf_y1)//2 - 6), "FFC-VALVE", fill=(203, 213, 225), font=get_font(FONT_BOLD, 11))

    # Viewfinder Target Corners (Emerald)
    c_len = 28
    c_color = (16, 185, 129)
    # TL
    draw.line([(vf_x0 + 10, vf_y0 + 10), (vf_x0 + 10 + c_len, vf_y0 + 10)], fill=c_color, width=3)
    draw.line([(vf_x0 + 10, vf_y0 + 10), (vf_x0 + 10, vf_y0 + 10 + c_len)], fill=c_color, width=3)
    # TR
    draw.line([(vf_x1 - 10, vf_y0 + 10), (vf_x1 - 10 - c_len, vf_y0 + 10)], fill=c_color, width=3)
    draw.line([(vf_x1 - 10, vf_y0 + 10), (vf_x1 - 10, vf_y0 + 10 + c_len)], fill=c_color, width=3)
    # BL
    draw.line([(vf_x0 + 10, vf_y1 - 10), (vf_x0 + 10 + c_len, vf_y1 - 10)], fill=c_color, width=3)
    draw.line([(vf_x0 + 10, vf_y1 - 10), (vf_x0 + 10, vf_y1 - 10 - c_len)], fill=c_color, width=3)
    # BR
    draw.line([(vf_x1 - 10, vf_y1 - 10), (vf_x1 - 10 - c_len, vf_y1 - 10)], fill=c_color, width=3)
    draw.line([(vf_x1 - 10, vf_y1 - 10), (vf_x1 - 10, vf_y1 - 10 - c_len)], fill=c_color, width=3)

    # Emerald Laser Beam Sweeping
    laser_y = int(vf_y0 + 20 + (vf_y1 - vf_y0 - 40) * ((scan_progress * 2) % 1.0))
    draw.line([(vf_x0 + 8, laser_y), (vf_x1 - 8, laser_y)], fill=(52, 211, 153), width=3)

    # Scan Glow
    draw.line([(vf_x0 + 8, laser_y - 2), (vf_x1 - 8, laser_y - 2)], fill=(16, 185, 129, 120), width=2)
    draw.line([(vf_x0 + 8, laser_y + 2), (vf_x1 - 8, laser_y + 2)], fill=(16, 185, 129, 120), width=2)

    # Detected Bounding Boxes
    if scan_progress > 0.3:
        draw.rounded_rectangle([SCREEN_W//2 - 90, (vf_y0 + vf_y1)//2 - 25, SCREEN_W//2 + 90, (vf_y0 + vf_y1)//2 + 5], radius=4, outline=(16, 185, 129), width=2)
        draw.text((SCREEN_W//2 - 80, (vf_y0 + vf_y1)//2 - 40), "DETECTED TAG", fill=(52, 211, 153), font=get_font(FONT_BOLD, 9))

    # Real-Time Extracted Data Card
    draw.rounded_rectangle([24, 480, SCREEN_W - 24, 800], radius=16, fill=(30, 41, 59, 255), outline=(51, 65, 85), width=1)
    draw.text((40, 498), "REAL-TIME OCR EXTRACTION", fill=(52, 211, 153), font=get_font(FONT_BOLD, 12))
    draw.line([(40, 522), (SCREEN_W - 40, 522)], fill=(51, 65, 85), width=1)

    fields = [
        ("Tracking Sequence", "FAB-2026-000001 (Auto)", (52, 211, 153)),
        ("Valve Description", "6\" 300# Flanged Gate Valve", (255, 255, 255)),
        ("Plant / Department", "Ammonia Plant · Urea Section", (255, 255, 255)),
        ("Hydro Shell Test", "1125 PSI · Passed QF Standard", (52, 211, 153)),
        ("Seat Leakage Rate", "0 Bubbles/min (Zero Leakage)", (52, 211, 153)),
    ]

    for f_idx, (lbl, val, col) in enumerate(fields):
        fy = 535 + f_idx * 50
        draw.text((40, fy), lbl, fill=(148, 163, 184), font=get_font(FONT_REGULAR, 11))
        draw.text((40, fy + 16), val, fill=col, font=get_font(FONT_BOLD, 13))

    # 1-Click Auto-Register Button
    draw.rounded_rectangle([24, 820, SCREEN_W - 24, 868], radius=12, fill=(16, 185, 129, 255))
    draw.text(((SCREEN_W - draw.textlength("1-Click Auto-Register Certificate", get_font(FONT_BOLD, 14))) // 2, 836), "1-Click Auto-Register Certificate", fill=(255, 255, 255), font=get_font(FONT_BOLD, 14))

    # Corner Copyright
    draw.rounded_rectangle([SCREEN_W - 170, SCREEN_H - 46, SCREEN_W - 14, SCREEN_H - 22], radius=5, fill=(15, 23, 42, 220), outline=(51, 65, 85), width=1)
    draw.text((SCREEN_W - 164, SCREEN_H - 39), "© Muhammad Wasiq Hussain", fill=(148, 163, 184), font=get_font(FONT_BOLD, 10))

    # Android Pill
    draw.rounded_rectangle([(SCREEN_W - 120) // 2, SCREEN_H - 10, (SCREEN_W + 120) // 2, SCREEN_H - 6], radius=2, fill=(255, 255, 255, 160))
    return im

# -------------------------------------------------------------
# SCREEN 4: DIGITAL TEST CERTIFICATE (QF-003-05-307)
# -------------------------------------------------------------
def render_screen_certificate():
    im = Image.new("RGBA", (SCREEN_W, SCREEN_H), (255, 255, 255, 255))
    draw = ImageDraw.Draw(im)

    # Status Bar
    draw.text((28, 14), "09:41", fill=(15, 23, 42), font=get_font(FONT_BOLD, 14))
    draw.text((SCREEN_W - 85, 14), "5G  ●  100%", fill=(15, 23, 42), font=get_font(FONT_REGULAR, 12))

    # Certificate Border Box (Industrial Certificate Theme)
    draw.rounded_rectangle([16, 44, SCREEN_W - 16, SCREEN_H - 60], radius=12, fill=(255, 255, 255), outline=(15, 23, 42), width=2)
    draw.rectangle([20, 48, SCREEN_W - 20, SCREEN_H - 64], outline=(203, 213, 225), width=1)

    # Header
    draw.text((32, 60), "FAUJI FERTILIZER COMPANY LTD.", fill=(15, 23, 42), font=get_font(FONT_BOLD, 14))
    draw.text((32, 78), "Fabrication Shop · Quality Assurance Department", fill=(71, 85, 105), font=get_font(FONT_REGULAR, 10))

    # Certificate Title Badge
    draw.rounded_rectangle([32, 102, SCREEN_W - 32, 138], radius=6, fill=(6, 16, 32))
    draw.text((45, 112), "VALVE RECLAMATION TEST CERTIFICATE", fill=(255, 255, 255), font=get_font(FONT_BOLD, 12))

    # Specifications Table
    specs = [
        ("Tracking ID:", "FAB-2026-000001", "Cert Number:", "CERT-2026-0001"),
        ("Valve Description:", "6\" 300# Flanged Gate", "Plant Name:", "Ammonia Plant"),
        ("Serial / Tag No:", "V-102-AMMONIA", "Date of Test:", "17-OCT-2026"),
        ("Body Material:", "ASTM A216 WCB", "Disc/Wedge:", "Stellite 6 Hardfaced"),
        ("Hydro Shell Test:", "1125 PSI (PASSED)", "Seat Test (DS):", "815 PSI (PASSED)"),
        ("Seat Leakage:", "0 BUBBLES / MIN", "Test Standard:", "API 598 / QF-003"),
    ]

    for s_idx, (k1, v1, k2, v2) in enumerate(specs):
        sy = 155 + s_idx * 44
        draw.line([(32, sy), (SCREEN_W - 32, sy)], fill=(241, 245, 249), width=1)
        draw.text((34, sy + 6), k1, fill=(100, 116, 139), font=get_font(FONT_REGULAR, 10))
        draw.text((34, sy + 20), v1, fill=(15, 23, 42), font=get_font(FONT_BOLD, 11))

        draw.text((SCREEN_W // 2 + 10, sy + 6), k2, fill=(100, 116, 139), font=get_font(FONT_REGULAR, 10))
        c_val2 = (5, 150, 105) if "PASSED" in v2 else (15, 23, 42)
        draw.text((SCREEN_W // 2 + 10, sy + 20), v2, fill=c_val2, font=get_font(FONT_BOLD, 11))

    # Official Seal / QR Stamp Box
    draw.rounded_rectangle([32, 435, SCREEN_W - 32, 570], radius=10, fill=(248, 250, 252), outline=(226, 232, 240), width=1)

    # QR Code placeholder
    draw.rectangle([48, 452, 138, 542], fill=(15, 23, 42))
    draw.rectangle([58, 462, 78, 482], fill=(255, 255, 255))
    draw.rectangle([108, 462, 128, 482], fill=(255, 255, 255))
    draw.rectangle([58, 512, 78, 532], fill=(255, 255, 255))
    draw.text((56, 548), "SCAN TO VERIFY", fill=(100, 116, 139), font=get_font(FONT_BOLD, 8))

    # Signatures
    draw.text((160, 460), "DIGITALLY SIGNED & VERIFIED", fill=(5, 150, 105), font=get_font(FONT_BOLD, 11))
    draw.text((160, 480), "Inspector: Tariq Mahmood (QA Lead)", fill=(15, 23, 42), font=get_font(FONT_REGULAR, 11))
    draw.text((160, 500), "Reclamation Lead: Engr. Wasiq Hussain", fill=(15, 23, 42), font=get_font(FONT_BOLD, 11))
    draw.text((160, 520), "Status: APPROVED FOR INSTALLATION", fill=(5, 150, 105), font=get_font(FONT_BOLD, 11))

    # In-App Export Action Bar (Scoped Storage Native Fix)
    draw.rounded_rectangle([32, 595, SCREEN_W - 32, 690], radius=12, fill=(241, 245, 249), outline=(203, 213, 225), width=1)
    draw.text((45, 608), "IN-APP AUTHENTICATED EXPORTS", fill=(71, 85, 105), font=get_font(FONT_BOLD, 11))

    # PDF Download Button
    draw.rounded_rectangle([45, 630, 155, 672], radius=8, fill=(225, 29, 72))
    draw.text((62, 642), "📥 PDF Cert", fill=(255, 255, 255), font=get_font(FONT_BOLD, 12))

    # Excel Download Button
    draw.rounded_rectangle([165, 630, 275, 672], radius=8, fill=(5, 150, 105))
    draw.text((182, 642), "📊 Excel (.xlsx)", fill=(255, 255, 255), font=get_font(FONT_BOLD, 12))

    # CSV Button
    draw.rounded_rectangle([285, 630, SCREEN_W - 45, 672], radius=8, fill=(15, 23, 42))
    draw.text((302, 642), "📄 CSV", fill=(255, 255, 255), font=get_font(FONT_BOLD, 12))

    # Android Scoped Storage Toast Notification
    draw.rounded_rectangle([28, 715, SCREEN_W - 28, 775], radius=10, fill=(236, 253, 245), outline=(110, 231, 183), width=1)
    draw.text((42, 727), "✓ File Saved to Scoped Storage", fill=(5, 150, 105), font=get_font(FONT_BOLD, 12))
    draw.text((42, 747), "Environment.DIRECTORY_DOWNLOADS/FFC_Reclamation", fill=(6, 95, 70), font=get_font(FONT_REGULAR, 10))

    # Corner Copyright
    draw.rounded_rectangle([SCREEN_W - 170, SCREEN_H - 46, SCREEN_W - 14, SCREEN_H - 22], radius=5, fill=(255, 255, 255, 220), outline=(226, 232, 240), width=1)
    draw.text((SCREEN_W - 164, SCREEN_H - 39), "© Muhammad Wasiq Hussain", fill=(100, 116, 139), font=get_font(FONT_BOLD, 10))

    # Android Pill
    draw.rounded_rectangle([(SCREEN_W - 120) // 2, SCREEN_H - 10, (SCREEN_W + 120) // 2, SCREEN_H - 6], radius=2, fill=(15, 23, 42, 140))
    return im

# -------------------------------------------------------------
# COMPOSITE FULL ANDROID DEVICE
# -------------------------------------------------------------
def render_android_device(screen_img):
    dev = Image.new("RGBA", (PHONE_W, PHONE_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(dev)

    # Outer Titanium Bezel
    draw.rounded_rectangle([0, 0, PHONE_W, PHONE_H], radius=PHONE_RADIUS, fill=(30, 41, 59, 255), outline=(100, 116, 139), width=3)
    draw.rounded_rectangle([2, 2, PHONE_W - 2, PHONE_H - 2], radius=PHONE_RADIUS - 2, outline=(51, 65, 85), width=2)
    draw.rounded_rectangle([SCREEN_PAD - 2, SCREEN_PAD - 2, PHONE_W - SCREEN_PAD + 2, PHONE_H - SCREEN_PAD + 2], radius=SCREEN_RADIUS + 2, fill=(15, 23, 42, 255))

    # Mask and Paste Screen
    mask = Image.new("L", (SCREEN_W, SCREEN_H), 0)
    d_mask = ImageDraw.Draw(mask)
    d_mask.rounded_rectangle([0, 0, SCREEN_W, SCREEN_H], radius=SCREEN_RADIUS, fill=255)

    dev.paste(screen_img, (SCREEN_PAD, SCREEN_PAD), mask)

    # Punch-Hole Selfie Camera
    cam_x = PHONE_W // 2
    cam_y = SCREEN_PAD + 15
    draw.ellipse([cam_x - 7, cam_y - 7, cam_x + 7, cam_y + 7], fill=(15, 23, 42))
    draw.ellipse([cam_x - 3, cam_y - 3, cam_x + 3, cam_y + 3], fill=(30, 41, 59))

    # Speaker Slit
    draw.rounded_rectangle([cam_x - 30, SCREEN_PAD - 6, cam_x + 30, SCREEN_PAD - 3], radius=1, fill=(71, 85, 105))

    # Subtle Glass Highlight on Device Edge
    draw.arc([SCREEN_PAD, SCREEN_PAD, PHONE_W - SCREEN_PAD, PHONE_H - SCREEN_PAD], start=180, end=270, fill=(255, 255, 255, 80), width=1)
    return dev

# -------------------------------------------------------------
# MAIN FRAME RENDERER WITH ZOOM, PAN, AND MOTION GRAPHICS
# -------------------------------------------------------------
def render_frame(frame_idx, screen_login, screen_dashboard, screen_scanner, screen_cert):
    t_sec = frame_idx / FPS

    # High-End Background
    bg = Image.new("RGBA", (WIDTH, HEIGHT), (6, 13, 26, 255))
    draw = ImageDraw.Draw(bg)

    # Ambient Glow Circles (Emerald & Cyan Studio Lights)
    glow_pulse = math.sin(t_sec * 1.5) * 40
    # Top Left Emerald
    draw.ellipse([-100, -100, 700 + int(glow_pulse), 700 + int(glow_pulse)], fill=(16, 185, 129, 25))
    # Bottom Right Cyan
    draw.ellipse([WIDTH - 700, HEIGHT - 700, WIDTH + 200, HEIGHT + 200], fill=(14, 165, 233, 20))

    # Subtle Background Grid
    for gx in range(0, WIDTH, 80):
        draw.line([(gx, 0), (gx, HEIGHT)], fill=(255, 255, 255, 7), width=1)
    for gy in range(0, HEIGHT, 80):
        draw.line([(0, gy), (WIDTH, gy)], fill=(255, 255, 255, 7), width=1)

    # Scene Timeline Logic
    # 0.0 - 6.0s: Login Screen & Security + Copyright Zoom
    # 6.0 - 12.0s: Executive Dashboard Pan & Zoom
    # 12.0 - 18.0s: AI OCR Scanner Viewfinder & Detection
    # 18.0 - 24.0s: Quality Test Certificate QF-003
    # 24.0 - 29.0s: In-App Downloads & OTA Live Updates
    # 29.0 - 34.0s: Hero 3D Outro & Muhammad Wasiq Hussain Credits

    if t_sec < 6.0:
        # SCENE 1: LOGIN & CORNER COPYRIGHT
        p = t_sec / 6.0
        active_screen = screen_login
        title_badge = "01 / ENTERPRISE AUTHENTICATION"
        title_main = "FFC Valve Reclamation App"
        title_sub = "Universal multi-auth with persistent scoped session"
        bullet1 = "✓ Biometric & Active Directory Login"
        bullet2 = "✓ Quality Standard QF-003-05-307 Compliant"
        bullet3 = "✓ Designed & Built by Muhammad Wasiq Hussain"

        # Camera Zoom Transition: Starts at 0.95, zooms into 1.55 focusing on form and copyright
        e = ease_in_out_cubic(min(1.0, p * 1.2))
        cam_scale = lerp(0.95, 1.45, e)
        cam_tx = lerp(WIDTH * 0.65, WIDTH * 0.62, e)
        cam_ty = lerp(HEIGHT * 0.50, HEIGHT * 0.62, e)

    elif t_sec < 12.0:
        # SCENE 2: DASHBOARD
        p = (t_sec - 6.0) / 6.0
        active_screen = render_screen_dashboard(progress=min(1.0, p * 1.5))
        title_badge = "02 / SHOP FLOOR TELEMETRY"
        title_main = "Real-Time Executive Dashboard"
        title_sub = "Live visibility across Ammonia, Urea, and Utilities Plants"
        bullet1 = "✓ 1,280+ Valves Reclaimed & Tested"
        bullet2 = "✓ 99.4% Hydraulic Pressure Pass Rate"
        bullet3 = "✓ Automated Tracking Sequence (FAB-2026)"

        e = ease_in_out_cubic(p)
        cam_scale = lerp(1.2, 1.6, e)
        cam_tx = lerp(WIDTH * 0.62, WIDTH * 0.60, e)
        cam_ty = lerp(HEIGHT * 0.55, HEIGHT * 0.38, e) # Pan up to KPI cards

    elif t_sec < 18.0:
        # SCENE 3: AI OCR CERTIFICATE SCANNER
        p = (t_sec - 12.0) / 6.0
        active_screen = render_screen_scanner(scan_progress=p)
        title_badge = "03 / COMPUTER VISION & OCR"
        title_main = "1-Click AI Certificate Scanner"
        title_sub = "On-device camera viewfinder with instant tag extraction"
        bullet1 = "✓ Live Environment Camera Stream"
        bullet2 = "✓ Laser Sweep & Real-Time Bounding Box"
        bullet3 = "✓ Instant Auto-Fill for Valve Specs & Testing"

        e = ease_in_out_cubic(p)
        cam_scale = lerp(1.35, 1.75, e)
        cam_tx = lerp(WIDTH * 0.60, WIDTH * 0.58, e)
        cam_ty = lerp(HEIGHT * 0.42, HEIGHT * 0.48, e)

    elif t_sec < 24.0:
        # SCENE 4: CERTIFICATES & REVISION CONTROL
        p = (t_sec - 18.0) / 6.0
        active_screen = screen_cert
        title_badge = "04 / QUALITY CERTIFICATION"
        title_main = "QF-003-05-307 Digital Certificate"
        title_sub = "Hydro Shell & Seat pressure testing with tamper-proof QR"
        bullet1 = "✓ Hydraulic Shell Test: 1125 PSI (Passed)"
        bullet2 = "✓ Dual Digital Inspection Signatures"
        bullet3 = "✓ Sequence Continuing Seamlessly (FAB)"

        e = ease_in_out_cubic(p)
        cam_scale = lerp(1.4, 1.65, e)
        cam_tx = lerp(WIDTH * 0.60, WIDTH * 0.58, e)
        cam_ty = lerp(HEIGHT * 0.48, HEIGHT * 0.60, e)

    elif t_sec < 29.0:
        # SCENE 5: IN-APP EXPORTS & OTA AUTO-UPDATES
        p = (t_sec - 24.0) / 5.0
        active_screen = screen_cert
        title_badge = "05 / IN-APP DOWNLOADS & OTA UPDATES"
        title_main = "Native Scoped Storage & Auto-Sync"
        title_sub = "Direct CSV, Excel & PDF exports with zero APK re-installs"
        bullet1 = "✓ Android Scoped Storage (MediaStore.Downloads)"
        bullet2 = "✓ Native FileProvider & Direct Sheet Share"
        bullet3 = "✓ Dynamic LOAD_NO_CACHE: Updates Live from Server"

        e = ease_in_out_cubic(p)
        cam_scale = lerp(1.65, 1.50, e)
        cam_tx = lerp(WIDTH * 0.58, WIDTH * 0.60, e)
        cam_ty = lerp(HEIGHT * 0.60, HEIGHT * 0.72, e) # Focus on export buttons

    else:
        # SCENE 6: HERO 3D OUTRO & CREDITS
        p = (t_sec - 29.0) / 5.0
        active_screen = screen_dashboard
        title_badge = "06 / ARCHITECTURE & CREDITS"
        title_main = "Engineered for FFC Shop Floor"
        title_sub = "Production Android Solution for Fauji Fertilizer Company Ltd."
        bullet1 = "★ Architect & Lead Developer: Muhammad Wasiq Hussain"
        bullet2 = "★ Tech: Capacitor Android · FastAPI · Next.js · SQLite"
        bullet3 = "★ Location: FFC Goth Machhi, Sadiqabad"

        e = ease_out_quad(p)
        cam_scale = lerp(1.3, 0.92, e)
        cam_tx = lerp(WIDTH * 0.60, WIDTH * 0.68, e)
        cam_ty = lerp(HEIGHT * 0.60, HEIGHT * 0.50, e)

    # Render Phone with Active Screen
    phone_raw = render_android_device(active_screen)

    # Scale and place phone on background
    new_w = int(PHONE_W * cam_scale)
    new_h = int(PHONE_H * cam_scale)
    scaled_phone = phone_raw.resize((new_w, new_h), Image.Resampling.LANCZOS)

    # Phone Drop Shadow
    shadow_w = new_w + 60
    shadow_h = new_h + 60
    shadow = Image.new("RGBA", (shadow_w, shadow_h), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    s_draw.rounded_rectangle([30, 30, shadow_w - 30, shadow_h - 30], radius=int(PHONE_RADIUS * cam_scale), fill=(0, 0, 0, 160))
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))

    px = int(cam_tx - new_w // 2)
    py = int(cam_ty - new_h // 2)

    bg.paste(shadow, (px - 30, py - 10), shadow)
    bg.paste(scaled_phone, (px, py), scaled_phone)

    # Left Motion-Graphics Typography Panel
    left_x = 90
    panel_y = 180

    # Section Pill
    draw.rounded_rectangle([left_x, panel_y, left_x + 360, panel_y + 36], radius=8, fill=(16, 185, 129, 35), outline=(16, 185, 129), width=1)
    draw.text((left_x + 18, panel_y + 9), title_badge, fill=(52, 211, 153), font=get_font(FONT_BOLD, 12))

    # Main Headline
    draw.text((left_x, panel_y + 55), title_main, fill=(255, 255, 255), font=get_font(FONT_BOLD, 38))

    # Subtitle
    draw.text((left_x, panel_y + 115), title_sub, fill=(148, 163, 184), font=get_font(FONT_REGULAR, 17))

    # Bullet Features with Green Accent
    draw.line([(left_x, panel_y + 160), (left_x + 520, panel_y + 160)], fill=(255, 255, 255, 30), width=1)

    draw.text((left_x, panel_y + 185), bullet1, fill=(241, 245, 249), font=get_font(FONT_BOLD, 17))
    draw.text((left_x, panel_y + 225), bullet2, fill=(241, 245, 249), font=get_font(FONT_BOLD, 17))
    b3_color = (52, 211, 153) if "Wasiq" in bullet3 else (241, 245, 249)
    draw.text((left_x, panel_y + 265), bullet3, fill=b3_color, font=get_font(FONT_BOLD, 17))

    # Prominent Developer Credit Callout Box (Bottom-Left)
    draw.rounded_rectangle([left_x, HEIGHT - 180, left_x + 540, HEIGHT - 75], radius=16, fill=(15, 23, 42, 220), outline=(51, 65, 85), width=1)

    # Author Avatar circle
    draw.ellipse([left_x + 20, HEIGHT - 160, left_x + 65, HEIGHT - 115], fill=(16, 185, 129), outline=(52, 211, 153), width=2)
    draw.text((left_x + 33, HEIGHT - 150), "W", fill=(255, 255, 255), font=get_font(FONT_BOLD, 19))

    draw.text((left_x + 80, HEIGHT - 158), "Muhammad Wasiq Hussain", fill=(255, 255, 255), font=get_font(FONT_BOLD, 17))
    draw.text((left_x + 80, HEIGHT - 132), "Software Engineer · Full-Stack & Android Systems", fill=(52, 211, 153), font=get_font(FONT_BOLD, 12))
    draw.text((left_x + 80, HEIGHT - 110), "Fauji Fertilizer Company Ltd. | Goth Machhi", fill=(148, 163, 184), font=get_font(FONT_REGULAR, 11))

    # Top Brand Logo (FFC Official)
    if os.path.exists(FFC_LOGO_PATH):
        try:
            top_logo = Image.open(FFC_LOGO_PATH).convert("RGBA")
            tlw = 160
            tlh = int(top_logo.height * (tlw / top_logo.width))
            top_logo = top_logo.resize((tlw, tlh), Image.Resampling.LANCZOS)
            bg.paste(top_logo, (left_x, 70), top_logo)
            draw.text((left_x + tlw + 20, 82), "VALVE RECLAMATION MANAGEMENT SYSTEM", fill=(255, 255, 255), font=get_font(FONT_BOLD, 14))
            draw.text((left_x + tlw + 20, 102), "Official Enterprise Android Application", fill=(100, 116, 139), font=get_font(FONT_REGULAR, 12))
        except Exception:
            pass

    # Progress Bar at Bottom of Video
    pb_w = int((frame_idx / TOTAL_FRAMES) * WIDTH)
    draw.rectangle([0, HEIGHT - 6, WIDTH, HEIGHT], fill=(15, 23, 42))
    draw.rectangle([0, HEIGHT - 6, pb_w, HEIGHT], fill=(16, 185, 129))

    # Convert to RGB array for ffmpeg
    return np.array(bg.convert("RGB"))

def main():
    print(f"Rendering {TOTAL_FRAMES} frames ({DURATION_SEC}s @ {FPS}fps) to MP4...")

    output_path = r"c:\WASIQ\FFC WORK PAPA\ffc_android_app_showcase.mp4"

    # Pre-render static base screens
    print("Pre-rendering screen assets...")
    screen_login = render_screen_login()
    screen_dashboard = render_screen_dashboard(progress=1.0)
    screen_scanner = render_screen_scanner(scan_progress=0.5)
    screen_cert = render_screen_certificate()

    # ImageIO MP4 Writer with high-quality H.264
    writer = imageio.get_writer(
        output_path,
        fps=FPS,
        codec="libx264",
        pixelformat="yuv420p",
        bitrate="8000k",
        macro_block_size=1
    )

    for f in range(TOTAL_FRAMES):
        frame = render_frame(f, screen_login, screen_dashboard, screen_scanner, screen_cert)
        writer.append_data(frame)

        if f % 90 == 0:
            pct = (f / TOTAL_FRAMES) * 100
            print(f"Progress: frame {f}/{TOTAL_FRAMES} ({pct:.1f}%) - {f/FPS:.1f}s")

    writer.close()
    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"SUCCESS! Video written to: {output_path} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    main()
