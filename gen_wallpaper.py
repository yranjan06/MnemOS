from PIL import Image, ImageDraw
import os

w, h = 1920, 1080
img = Image.new('RGB', (w, h), (15, 15, 15))  # #0f0f0f
draw = ImageDraw.Draw(img)

# Subtle dot grid matching ReactFlow canvas
spacing = 24
dot_r = 1
for x in range(0, w, spacing):
    for y in range(0, h, spacing):
        draw.ellipse([x-dot_r, y-dot_r, x+dot_r, y+dot_r], fill=(42, 42, 40))  # #2a2a28

os.makedirs('/usr/share/backgrounds/mnemos', exist_ok=True)
img.save('/usr/share/backgrounds/mnemos/dark.png')
print('done')
