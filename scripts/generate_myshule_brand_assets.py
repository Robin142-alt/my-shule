"""Generate MyShule web icons from the approved source artwork.

The supplied artwork is a stacked lockup whose lower wordmark touches the image
edge.  Runtime surfaces therefore use the intact cloud-and-M emblem, paired with
accessible HTML text where the MyShule name is needed.

Developer tool requirement: Pillow 12 or newer. Generated assets are committed,
and neither the web build nor the production runtime executes this script.
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
WEB_ROOT = ROOT / "apps" / "web"
SOURCE = WEB_ROOT / "assets" / "brand" / "myshule-logo-source.png"
PUBLIC_BRAND = WEB_ROOT / "public" / "brand"
APP_ROOT = WEB_ROOT / "src" / "app"

# This crop keeps the supplied emblem unchanged and excludes the clipped
# wordmark.  Its ink remains inside the central safe area after placement.
EMBLEM_CROP = (96, 8, 518, 350)
MASTER_SIZE = 512
MASTER_OFFSET = (45, 85)


def resize(master: Image.Image, size: int) -> Image.Image:
    return master.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    PUBLIC_BRAND.mkdir(parents=True, exist_ok=True)

    with Image.open(SOURCE) as source_image:
        source = source_image.convert("RGBA")

    if source.size != (585, 484):
        raise ValueError(
            f"Unexpected MyShule source size {source.size}; expected (585, 484)."
        )

    emblem = source.crop(EMBLEM_CROP)
    master = Image.new("RGBA", (MASTER_SIZE, MASTER_SIZE), (255, 255, 255, 255))
    master.paste(emblem, MASTER_OFFSET)

    master.save(PUBLIC_BRAND / "myshule-mark-512.png")
    resize(master, 192).save(PUBLIC_BRAND / "myshule-mark-192.png")
    master.save(PUBLIC_BRAND / "myshule-mark-maskable-512.png")

    apple_icon = resize(master, 180)
    apple_icon.save(PUBLIC_BRAND / "myshule-apple-touch-icon.png")
    master.save(APP_ROOT / "icon.png")
    apple_icon.save(APP_ROOT / "apple-icon.png")
    master.save(
        APP_ROOT / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (256, 256)],
    )


if __name__ == "__main__":
    main()
