"""Read-only PDF verification for the isolated library browser fixture."""
import json
import re
from pathlib import Path

import pypdfium2 as pdfium
from pypdf import PdfReader
from PIL import Image, ImageOps, ImageDraw

root = Path(__file__).resolve().parents[1] / "output" / "library-desk"
results = []
documents = sorted(root.glob("outstanding-*.pdf"))
assert len(documents) == 8, f"Expected eight generated PDF variants, found {len(documents)}"
for path in documents:
    count = int(path.stem.split("-")[1])
    reader = PdfReader(path)
    width, height = float(reader.pages[0].mediabox.width), float(reader.pages[0].mediabox.height)
    assert abs(min(width, height) - 595.28) < 2 and abs(max(width, height) - 841.89) < 2, path.name
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    codes = re.findall(r"LIBRARY-COPY-(\d{5})", re.sub(r"\s+", "", text))
    assert len(codes) == count and len(set(codes)) == count, (path.name, len(codes), count)
    assert "Library Verification School" in text
    assert "Robin Project" not in text
    assert "\u00c2" not in text and "\u00e2" not in text
    assert "Page 1" in text
    if count:
        for page in reader.pages:
            assert "LIBRARY-COPY-" in re.sub(r"\s+", "", page.extract_text() or ""), (path.name, "Page without copy rows")
    else:
        assert len(reader.pages) == 1 and "Amina Otieno" in text and "ADM001" in text
    pdf = pdfium.PdfDocument(str(path))
    thumbnails = []
    for index in range(len(pdf)):
        page = pdf[index]
        rendered = page.render(scale=1.35).to_pil().convert("RGB")
        rendered.save(root / f"{path.stem}-page-{index+1}.png")
        thumb = ImageOps.contain(rendered, (280, 380))
        tile = Image.new("RGB", (300, 410), "#d9dfe8")
        tile.paste(thumb, ((300-thumb.width)//2, 12))
        ImageDraw.Draw(tile).text((10,392), f"Page {index+1}", fill="black")
        thumbnails.append(tile)
        page.close()
    pdf.close()
    sheet = Image.new("RGB", (300 * min(4,len(thumbnails)), 410 * ((len(thumbnails)+3)//4)), "white")
    for index, tile in enumerate(thumbnails):
        sheet.paste(tile, ((index%4)*300, (index//4)*410))
    sheet.save(root / f"{path.stem}-pages.png")
    results.append({"file":path.name,"pages":len(reader.pages),"distinctCopies":count,
                    "a4WidthPoints":float(reader.pages[0].mediabox.width),"a4HeightPoints":float(reader.pages[0].mediabox.height)})
(root / "pdf-verification.json").write_text(json.dumps(results,indent=2),encoding="utf-8")
print(json.dumps(results))
