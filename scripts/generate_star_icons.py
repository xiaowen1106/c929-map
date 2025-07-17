#!/usr/bin/env python3
"""
Generate star icons for the fan wishes layer.
This script creates PNG files for normal and highlighted star icons.
"""

from PIL import Image, ImageDraw
import math
import os

def create_star_icon(size=45, fill_color=(255, 203, 113, 230), stroke_color=(226, 155, 5), line_width=0.8):
    """Create a star icon with the given parameters."""
    # Create a new image with alpha channel
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Star parameters
    center_x = size / 2
    center_y = size / 2
    outer_radius = size / 2 - 2
    inner_radius = outer_radius * 0.4
    spikes = 5
    
    # Generate star points
    points = []
    for i in range(spikes * 2):
        radius = outer_radius if i % 2 == 0 else inner_radius
        angle = (i * math.pi) / spikes - math.pi / 2
        x = center_x + radius * math.cos(angle)
        y = center_y + radius * math.sin(angle)
        points.append((x, y))
    
    # Draw the star
    if len(points) > 2:
        # Fill the star
        draw.polygon(points, fill=fill_color)
        
        # Draw the border
        # For thin borders, we need to draw multiple lines
        for i in range(len(points)):
            start_point = points[i]
            end_point = points[(i + 1) % len(points)]
            draw.line([start_point, end_point], fill=stroke_color, width=max(1, int(line_width)))
    
    return img

def main():
    """Generate star icons and save them."""
    # Create output directory if it doesn't exist
    output_dir = "docs/img/stars"
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate normal star icon
    normal_star = create_star_icon(
        size=45,
        fill_color=(255, 203, 113, 230),  # #FFCB71E6
        stroke_color=(226, 155, 5),       # #E29B05
        line_width=0.8
    )
    normal_star.save(f"{output_dir}/star_normal.png")
    print(f"Generated normal star icon: {output_dir}/star_normal.png")
    
    # Generate highlighted star icon
    highlighted_star = create_star_icon(
        size=45,
        fill_color=(255, 247, 13, 255),   # #FFF70DFF
        stroke_color=(255, 176, 10, 255), # #FFB00AFF
        line_width=2.0
    )
    highlighted_star.save(f"{output_dir}/star_highlighted.png")
    print(f"Generated highlighted star icon: {output_dir}/star_highlighted.png")
    
    print("Star icons generated successfully!")

if __name__ == "__main__":
    main() 