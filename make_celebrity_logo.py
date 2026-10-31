import os
from PIL import Image, ImageDraw, ImageFont

out_dir = r"C:\Users\saad7\.gemini\antigravity\scratch\saad_amil_lawyer_site"

def create_celebrity_logo():
    img = Image.new("RGBA", (512, 512), (7, 13, 24, 255)) # Deepest midnight navy
    draw = ImageDraw.Draw(img)
    
    # Octagon / Shield luxury frame
    gold = (212, 175, 55, 255)
    gold_glow = (245, 215, 110, 255)
    
    # Outer circle
    draw.ellipse([(16, 16), (496, 496)], outline=gold, width=6)
    draw.ellipse([(28, 28), (484, 484)], outline=(180, 140, 35, 120), width=2)
    
    # Stylized SA Monogram & Scales
    cx, cy = 256, 256
    
    # Pillar
    draw.line([(cx, 100), (cx, 400)], fill=gold_glow, width=8)
    # Top finial
    draw.ellipse([(cx-14, 86), (cx+14, 114)], fill=gold_glow)
    # Base
    draw.rectangle([(cx-55, 400), (cx+55, 414)], fill=gold)
    draw.rectangle([(cx-80, 414), (cx+80, 428)], fill=gold_glow)
    
    # Crossbeam
    draw.line([(cx-140, 160), (cx+140, 160)], fill=gold_glow, width=7)
    draw.ellipse([(cx-10, 150), (cx+10, 170)], fill=gold, outline=gold_glow, width=2)
    
    # Balanced Pans
    for s in [-1, 1]:
        px = cx + s * 140
        draw.line([(px, 160), (px-45, 250)], fill=gold, width=3)
        draw.line([(px, 160), (px+45, 250)], fill=gold, width=3)
        draw.chord([(px-45, 240), (px+45, 270)], start=0, end=180, fill=gold_glow, outline=gold)
        
    img.save(os.path.join(out_dir, "logo.png"))
    img.resize((64, 64), Image.Resampling.LANCZOS).save(os.path.join(out_dir, "favicon.png"))
    print("Celebrity logo updated successfully!")

create_celebrity_logo()
