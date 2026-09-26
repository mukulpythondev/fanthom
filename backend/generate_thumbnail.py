from PIL import Image, ImageDraw, ImageFont
import os

# Create a 1280x720 placeholder thumbnail (16:9 aspect ratio)
width, height = 1280, 720
img = Image.new('RGB', (width, height), color='#0c0c0f')
draw = ImageDraw.Draw(img)

# Draw a subtle gradient background
for y in range(height):
    r = int(12 + (y / height) * 8)
    g = int(12 + (y / height) * 6)
    b = int(15 + (y / height) * 12)
    draw.line([(0, y), (width, y)], fill=(r, g, b))

# Draw decorative elements - waveform-style bars
bar_width = 4
bar_gap = 8
bar_color = '#2d8cf0'
num_bars = 60
start_x = (width - num_bars * (bar_width + bar_gap)) // 2
center_y = height // 2

for i in range(num_bars):
    bar_height = 30 + (i % 5) * 20 + ((i * 7) % 40)
    x = start_x + i * (bar_width + bar_gap)
    draw.rectangle(
        [x, center_y - bar_height // 2, x + bar_width, center_y + bar_height // 2],
        fill=bar_color
    )

# Draw play button (circle with triangle)
play_center_x = width // 2
play_center_y = height // 2
radius = 60
draw.ellipse(
    [play_center_x - radius, play_center_y - radius, play_center_x + radius, play_center_y + radius],
    fill='white'
)
# Triangle
triangle = [
    (play_center_x - 18, play_center_y - 25),
    (play_center_x - 18, play_center_y + 25),
    (play_center_x + 22, play_center_y),
]
draw.polygon(triangle, fill='#2d8cf0')

# Draw title text
try:
    font_large = ImageFont.truetype("arial.ttf", 48)
    font_small = ImageFont.truetype("arial.ttf", 24)
except:
    font_large = ImageFont.load_default()
    font_small = ImageFont.load_default()

title = "Fathom Build"
subtitle = "AI-Powered Meeting Intelligence"

# Title shadow
draw.text((width // 2 - 1 + 2, 120 + 2), title, font=font_large, fill='#000000', anchor='mm')
draw.text((width // 2 - 1, 120), title, font=font_large, fill='#ffffff', anchor='mm')

# Subtitle
draw.text((width // 2, 185), subtitle, font=font_small, fill='#9090a0', anchor='mm')

# Bottom bar
draw.rectangle([0, height - 60, width, height], fill='#141418')
draw.text((40, height - 35), "00:00", font=font_small, fill='#9090a0', anchor='lm')
draw.text((width - 40, height - 35), "1:00", font=font_small, fill='#9090a0', anchor='rm')

# Save
output_dir = os.path.join(os.path.dirname(__file__), 'videos')
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, 'intro-thumbnail.jpg')
img.save(output_path, 'JPEG', quality=90)
print(f"Thumbnail saved to: {output_path}")
