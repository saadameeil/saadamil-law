import os
from PIL import Image, ImageDraw, ImageFont

out_dir = r"C:\Users\saad7\.gemini\antigravity\scratch\saad_amil_lawyer_site"
os.makedirs(out_dir, exist_ok=True)

# 1. Main Legal Brand Logo (512x512)
def create_brand_logo():
    img = Image.new("RGBA", (512, 512), (11, 17, 32, 255)) # Dark navy #0b1120
    draw = ImageDraw.Draw(img)
    
    # Outer luxury gold ring
    draw.ellipse([(20, 20), (492, 492)], outline=(212, 175, 55, 255), width=8) # Gold
    draw.ellipse([(34, 34), (478, 478)], outline=(184, 150, 40, 180), width=2)
    
    # Scales of Justice center
    cx, cy = 256, 256
    # Pillar
    draw.line([(cx, 130), (cx, 390)], fill=(245, 215, 110, 255), width=10)
    # Finial top
    draw.ellipse([(cx-16, 114), (cx+16, 146)], fill=(245, 215, 110, 255))
    # Pedestal base
    draw.rectangle([(cx-60, 390), (cx+60, 405)], fill=(212, 175, 55, 255))
    draw.rectangle([(cx-90, 405), (cx+90, 422)], fill=(245, 215, 110, 255))
    # Crossbeam
    draw.line([(cx-140, 175), (cx+140, 175)], fill=(245, 215, 110, 255), width=8)
    # Pivot center
    draw.ellipse([(cx-12, 163), (cx+12, 187)], fill=(212, 175, 55, 255), outline=(245, 215, 110, 255), width=3)
    
    # Left and Right Pans
    for sign in [-1, 1]:
        px = cx + sign * 140
        py = 175
        pan_y = 280
        draw.line([(px, py), (px-50, pan_y)], fill=(212, 175, 55, 255), width=4)
        draw.line([(px, py), (px+50, pan_y)], fill=(212, 175, 55, 255), width=4)
        draw.chord([(px-50, pan_y-10), (px+50, pan_y+25)], start=0, end=180, fill=(245, 215, 110, 255), outline=(212, 175, 55, 255))

    img.save(os.path.join(out_dir, "logo.png"))
    img.resize((64, 64), Image.Resampling.LANCZOS).save(os.path.join(out_dir, "favicon.png"))
    img.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(out_dir, "icon-192.png"))

# 2. Super App QR Code Placeholder
def create_super_qr():
    img = Image.new("RGBA", (300, 300), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)
    # Border
    draw.rectangle([(10, 10), (290, 290)], outline=(15, 23, 42, 255), width=4)
    # Stylized QR corners
    for (x1, y1, x2, y2) in [
        (25, 25, 95, 95), (205, 25, 275, 95), (25, 205, 95, 275)
    ]:
        draw.rectangle([(x1, y1), (x2, y2)], outline=(15, 23, 42, 255), width=12)
        draw.rectangle([(x1+20, y1+20), (x2-20, y2-20)], fill=(15, 23, 42, 255))
    
    # Grid dots
    import random
    random.seed(42)
    for r in range(12):
        for c in range(12):
            if (r < 4 and c < 4) or (r < 4 and c > 7) or (r > 7 and c < 4):
                continue
            if random.random() > 0.45:
                bx = 50 + c * 17
                by = 50 + r * 17
                draw.rectangle([(bx, by), (bx+12, by+12)], fill=(30, 41, 59, 255))

    # Center Badge
    draw.rectangle([(110, 110), (190, 190)], fill=(212, 175, 55, 255), outline=(15, 23, 42, 255), width=3)
    img.save(os.path.join(out_dir, "super_qr_mock.png"))

create_brand_logo()
create_super_qr()
print("Images created successfully!")
