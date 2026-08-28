from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "output" / "devpost"
FRAME_DIR = ASSET_DIR / "video-frames"
SIZE = (1920, 1080)

INK = "#13211A"
CREAM = "#F5F2EA"
LIME = "#D9FF62"
PEACH = "#F2B28A"
BLUE = "#BFD3F5"
MUTED = "#657068"

FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def centered(draw: ImageDraw.ImageDraw, text: str, y: int, style: ImageFont.FreeTypeFont, fill: str) -> None:
    box = draw.textbbox((0, 0), text, font=style)
    x = (SIZE[0] - (box[2] - box[0])) // 2
    draw.text((x, y), text, font=style, fill=fill)


def pill(draw: ImageDraw.ImageDraw, text: str, x: int, y: int, color: str) -> None:
    style = font(25, bold=True)
    box = draw.textbbox((0, 0), text, font=style)
    width = box[2] - box[0] + 42
    draw.rounded_rectangle((x - width, y, x, y + 48), radius=24, fill=color)
    draw.text((x - width + 21, y + 9), text, font=style, fill=INK)


def intro() -> Image.Image:
    image = Image.new("RGB", SIZE, CREAM)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((110, 100, 1810, 980), radius=44, fill=INK)
    draw.rounded_rectangle((155, 145, 270, 260), radius=24, fill=LIME)
    draw.text((188, 155), "C", font=font(78, bold=True), fill=INK)
    centered(draw, "ClearPacket", 320, font(128, bold=True), CREAM)
    centered(draw, "Catch invoice mismatches before money moves.", 485, font(48), CREAM)
    draw.rounded_rectangle((600, 625, 1320, 705), radius=40, fill=LIME)
    centered(draw, "LIVE NUTRIENT DWS VERIFICATION", 646, font(31, bold=True), INK)
    centered(draw, "Purchase order  +  invoice  +  delivery receipt", 790, font(31), "#CAD3CD")
    return image


def workflow_scene(
    asset_name: str,
    step: str,
    title: str,
    caption: str,
    color: str,
    crop_box: tuple[float, float, float, float] | None = None,
) -> Image.Image:
    image = Image.new("RGB", SIZE, CREAM)
    draw = ImageDraw.Draw(image)
    draw.text((70, 30), "ClearPacket", font=font(38, bold=True), fill=INK)
    draw.text((70, 78), title, font=font(25), fill=MUTED)
    pill(draw, step, 1850, 35, color)

    source = Image.open(ASSET_DIR / asset_name).convert("RGB")
    if crop_box:
        source = source.crop(
            (
                int(source.width * crop_box[0]),
                int(source.height * crop_box[1]),
                int(source.width * crop_box[2]),
                int(source.height * crop_box[3]),
            )
        )
    fitted = ImageOps.contain(source, (1680, 850), Image.Resampling.LANCZOS)
    x = (SIZE[0] - fitted.width) // 2
    y = 135 + (850 - fitted.height) // 2
    draw.rounded_rectangle((x - 8, y - 8, x + fitted.width + 8, y + fitted.height + 8), radius=20, fill="#D4D0C5")
    image.paste(fitted, (x, y))

    centered(draw, caption, 1018, font(30, bold=True), INK)
    return image


def architecture_scene() -> Image.Image:
    image = Image.new("RGB", SIZE, CREAM)
    draw = ImageDraw.Draw(image)
    draw.text((70, 30), "ClearPacket", font=font(38, bold=True), fill=INK)
    draw.text((70, 78), "One replayable document pipeline", font=font(25), fill=MUTED)
    pill(draw, "06  AUDITABLE PIPELINE", 1850, 35, BLUE)

    labels = [
        ("SOURCE PDFs", "PO + invoice + receipt", PEACH),
        ("NUTRIENT DWS", "Extract structured evidence", LIME),
        ("CLEARPACKET", "Run deterministic checks", BLUE),
        ("HUMAN REVIEW", "Resolve only the exception", PEACH),
        ("NUTRIENT DWS", "Export the audit PDF", LIME),
    ]
    box_width = 295
    gap = 42
    start_x = (SIZE[0] - (len(labels) * box_width + (len(labels) - 1) * gap)) // 2
    y = 365

    for index, (label, detail, color) in enumerate(labels):
        x = start_x + index * (box_width + gap)
        draw.rounded_rectangle((x, y, x + box_width, y + 245), radius=28, fill=color, outline=INK, width=2)
        draw.text((x + 24, y + 35), f"0{index + 1}", font=font(24, bold=True), fill=INK)
        draw.text((x + 24, y + 92), label, font=font(25, bold=True), fill=INK)
        draw.multiline_text((x + 24, y + 142), detail, font=font(21), fill=INK, spacing=7)
        if index < len(labels) - 1:
            arrow_x = x + box_width + 10
            draw.line((arrow_x, y + 122, arrow_x + 22, y + 122), fill=INK, width=4)
            draw.polygon(
                [(arrow_x + 22, y + 113), (arrow_x + 36, y + 122), (arrow_x + 22, y + 131)],
                fill=INK,
            )

    centered(draw, "DWS reads the evidence and builds the final PDF. Code owns every financial fact.", 810, font(34, bold=True), INK)
    centered(draw, "A person stays in control of the payment decision.", 872, font(29), MUTED)
    return image


def outro() -> Image.Image:
    image = Image.new("RGB", SIZE, INK)
    draw = ImageDraw.Draw(image)
    centered(draw, "Every mismatch. Before you pay.", 245, font(82, bold=True), CREAM)
    centered(draw, "The evidence, the decision, and the audit trail stay together.", 390, font(38), "#D8DFDA")
    draw.rounded_rectangle((490, 545, 1430, 650), radius=52, fill=LIME)
    centered(draw, "clearpacket.hdjskndf.chatgpt.site", 574, font(35, bold=True), INK)
    centered(draw, "Built with Nutrient DWS", 745, font(34, bold=True), PEACH)
    centered(draw, "Source: github.com/Jonny7171/clearpacket", 805, font(28), "#B8C2BC")
    return image


def main() -> None:
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    scenes = [
        intro(),
        workflow_scene(
            "live-start.jpg",
            "01  SOURCE PACKET",
            "Three source PDFs become one verification packet",
            "Purchase order, supplier invoice, and delivery receipt. 73 fields and one decision.",
            LIME,
        ),
        workflow_scene(
            "live-processing.jpg",
            "02  LIVE DWS RUN",
            "Nutrient DWS extracts the packet",
            "Plain text, structured text, key-value pairs, and tables are extracted server-side.",
            LIME,
            (0.02, 0.31, 0.98, 0.95),
        ),
        workflow_scene(
            "live-verified.jpg",
            "03  VERIFIED EXCEPTION",
            "Deterministic checks find the mismatch",
            "The live Nutrient DWS result exposes a two-unit, $18.40 invoice overbill.",
            BLUE,
            (0.02, 0.31, 0.98, 0.95),
        ),
        workflow_scene(
            "live-review.jpg",
            "04  HUMAN REVIEW",
            "Only judgment reaches a person",
            "10 ordered. 12 invoiced. 10 received. The reviewer chooses the payable quantity.",
            PEACH,
            (0.02, 0.12, 0.98, 0.92),
        ),
        workflow_scene(
            "live-resolved.jpg",
            "05  DECISION RECORDED",
            "The human decision closes the packet",
            "Open decisions drop from 1 to 0 and the $18.40 adjustment stays with the evidence.",
            BLUE,
            (0.02, 0.31, 0.98, 0.95),
        ),
        architecture_scene(),
        outro(),
    ]
    for index, scene in enumerate(scenes, start=1):
        scene.save(FRAME_DIR / f"scene-{index}.png", optimize=True)


if __name__ == "__main__":
    main()
