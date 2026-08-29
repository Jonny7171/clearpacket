from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "output" / "devpost"
FRAME_DIR = ASSET_DIR / "video-frames"
SIZE = (1920, 1080)

INK = "#14223D"
PAPER = "#F7F8FA"
AMBER = "#C98A21"
GREEN = "#326A53"
RULE = "#CCD2DC"
MUTED = "#5E6675"

FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_MONO = "/System/Library/Fonts/Supplemental/Courier New.ttf"


def font(size: int, bold: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_MONO if mono else (FONT_BOLD if bold else FONT_REGULAR)
    return ImageFont.truetype(path, size)


def header(draw: ImageDraw.ImageDraw, step: str, note: str) -> None:
    draw.text((76, 48), "ClearPacket", font=font(38, bold=True), fill=INK)
    draw.text((76, 98), note, font=font(24), fill=MUTED)
    draw.text((1804, 58), step, anchor="ra", font=font(23, mono=True), fill=MUTED)
    draw.line((76, 140, 1844, 140), fill=RULE, width=2)


def intro() -> Image.Image:
    image = Image.new("RGB", SIZE, PAPER)
    draw = ImageDraw.Draw(image)
    draw.text((112, 90), "ClearPacket", font=font(42, bold=True), fill=INK)
    draw.text((112, 158), "DEMO NOTE / PACKET CP-1048", font=font(24, mono=True), fill=MUTED)
    draw.line((112, 215, 1808, 215), fill=INK, width=3)
    draw.text((112, 270), "INV-7782 needs a quantity decision", font=font(68, bold=True), fill=INK)

    rows = [
        ("SOURCE DOCUMENTS", "PO-1048, INV-7782, RECEIPT-592"),
        ("EVIDENCE", "10 ordered / 12 billed / 10 received"),
        ("VALUE AT ISSUE", "$18.40"),
        ("REVIEW CHOICE", "Pay for 10 received units"),
    ]
    top = 430
    for index, (label, value) in enumerate(rows):
        y = top + index * 120
        draw.line((112, y, 1808, y), fill=RULE, width=2)
        draw.text((112, y + 32), label, font=font(22, mono=True), fill=MUTED)
        draw.text((580, y + 24), value, font=font(35, bold=True), fill=INK if index != 2 else AMBER)
    draw.line((112, top + len(rows) * 120, 1808, top + len(rows) * 120), fill=RULE, width=2)
    return image


def screenshot_scene(asset_name: str, step: str, note: str, caption: str) -> Image.Image:
    image = Image.new("RGB", SIZE, PAPER)
    draw = ImageDraw.Draw(image)
    header(draw, step, note)

    source = Image.open(ASSET_DIR / asset_name).convert("RGB")
    fitted = ImageOps.contain(source, (1760, 820), Image.Resampling.LANCZOS)
    x = (SIZE[0] - fitted.width) // 2
    y = 165 + (820 - fitted.height) // 2
    draw.rectangle((x - 2, y - 2, x + fitted.width + 2, y + fitted.height + 2), outline=RULE, width=2)
    image.paste(fitted, (x, y))
    draw.text((76, 1016), caption, font=font(27, bold=True), fill=INK)
    return image


def implementation_scene() -> Image.Image:
    image = Image.new("RGB", SIZE, PAPER)
    draw = ImageDraw.Draw(image)
    header(draw, "05 / 05", "What is running behind the screen")
    rows = [
        ("EXTRACT", "Nutrient DWS Processor API reads all three PDFs"),
        ("COMPARE", "TypeScript checks supplier, PO reference, quantity, and total"),
        ("REVIEW", "A person chooses the payable quantity"),
        ("EXPORT", "Nutrient DWS creates the final audit PDF"),
    ]
    top = 250
    for index, (label, value) in enumerate(rows):
        y = top + index * 142
        draw.line((92, y, 1828, y), fill=RULE, width=2)
        draw.text((112, y + 40), f"0{index + 1}", font=font(23, mono=True), fill=GREEN)
        draw.text((220, y + 40), label, font=font(27, bold=True), fill=INK)
        draw.text((570, y + 37), value, font=font(29), fill=INK)
    draw.line((92, top + len(rows) * 142, 1828, top + len(rows) * 142), fill=RULE, width=2)
    draw.text((112, 900), "LIVE", font=font(20, mono=True), fill=MUTED)
    draw.text((300, 894), "clearpacket.hdjskndf.chatgpt.site", font=font(29, bold=True), fill=INK)
    draw.text((112, 970), "SOURCE", font=font(20, mono=True), fill=MUTED)
    draw.text((300, 964), "github.com/Jonny7171/clearpacket", font=font(29, bold=True), fill=INK)
    return image


def main() -> None:
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    scenes = [
        intro(),
        screenshot_scene(
            "live-start.jpg",
            "02 / 05",
            "The three documents are shown beside the comparison result",
            "The source files and the exact mismatch stay on the same screen.",
        ),
        screenshot_scene(
            "live-review.jpg",
            "03 / 05",
            "The reviewer sees the three quantities before choosing",
            "10 ordered. 12 billed. 10 received. No payment action is automatic.",
        ),
        screenshot_scene(
            "live-resolved.jpg",
            "04 / 05",
            "The selected quantity is recorded with the packet",
            "The $18.40 adjustment remains attached to the evidence and audit export.",
        ),
        implementation_scene(),
    ]
    for index, scene in enumerate(scenes, start=1):
        scene.save(FRAME_DIR / f"scene-{index}.png", optimize=True)


if __name__ == "__main__":
    main()
