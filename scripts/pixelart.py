"""
Pixel Art Generator
Usage: python pixelart.py <input_image> [options]

Options:
  --size N        Target pixel grid size (default: 64). Width of the pixel art in "pixels".
  --colors N      Number of colors in palette (default: 32, max: 256).
  --scale N       Output upscale factor — how many real pixels per art pixel (default: 8).
  --output FILE   Output file path (default: <input>_pixelart.png).
  --no-dither     Disable dithering during color quantization.
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow is required. Install it with:  pip install Pillow")
    sys.exit(1)


def to_pixel_art(
    input_path: str,
    pixel_size: int = 64,
    num_colors: int = 32,
    scale: int = 8,
    output_path: str | None = None,
    dither: bool = True,
) -> str:
    src = Path(input_path)
    if not src.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    img = Image.open(src).convert("RGBA")

    # Preserve aspect ratio
    w, h = img.size
    if w >= h:
        new_w = pixel_size
        new_h = max(1, round(h * pixel_size / w))
    else:
        new_h = pixel_size
        new_w = max(1, round(w * pixel_size / h))

    # Downsample with nearest-neighbor to get the blocky pixel look
    small = img.resize((new_w, new_h), Image.NEAREST)

    # Quantize to limited palette (work on RGB then reattach alpha)
    rgb = small.convert("RGB")
    dither_mode = Image.Dither.FLOYDSTEINBERG if dither else Image.Dither.NONE
    quantized = rgb.quantize(colors=num_colors, dither=dither_mode).convert("RGB")

    # Re-apply original alpha channel so transparency is preserved
    if small.mode == "RGBA":
        quantized = quantized.convert("RGBA")
        quantized.putalpha(small.split()[3])

    # Scale back up so each "pixel" is visible
    final = quantized.resize(
        (new_w * scale, new_h * scale), Image.NEAREST
    )

    if output_path is None:
        output_path = str(src.parent / (src.stem + "_pixelart.png"))

    final.save(output_path)
    print(f"Saved → {output_path}  ({new_w}×{new_h} art pixels, {scale}x scale)")
    return output_path


def main():
    parser = argparse.ArgumentParser(description="Convert an image to pixel art.")
    parser.add_argument("input", help="Path to the input image")
    parser.add_argument("--size", type=int, default=64, help="Pixel grid width (default: 64)")
    parser.add_argument("--colors", type=int, default=32, help="Palette size (default: 32)")
    parser.add_argument("--scale", type=int, default=8, help="Upscale factor (default: 8)")
    parser.add_argument("--output", default=None, help="Output file path")
    parser.add_argument("--no-dither", action="store_true", help="Disable dithering")
    args = parser.parse_args()

    try:
        to_pixel_art(
            input_path=args.input,
            pixel_size=args.size,
            num_colors=args.colors,
            scale=args.scale,
            output_path=args.output,
            dither=not args.no_dither,
        )
    except FileNotFoundError as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
