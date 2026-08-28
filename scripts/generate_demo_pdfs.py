from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf"
PUBLIC = ROOT / "public" / "demo"

INK = colors.HexColor("#17221C")
ACID = colors.HexColor("#D7FF52")
PAPER = colors.HexColor("#F5F3EB")
MUTED = colors.HexColor("#667169")
CLAY = colors.HexColor("#F3AD82")
BLUE = colors.HexColor("#9BC8FF")


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="Brand", fontName="Helvetica-Bold", fontSize=10, leading=12, textColor=INK, spaceAfter=2))
styles.add(ParagraphStyle(name="DocTitle", fontName="Helvetica-Bold", fontSize=26, leading=30, textColor=INK, spaceAfter=5))
styles.add(ParagraphStyle(name="Small", fontName="Helvetica", fontSize=8.5, leading=11, textColor=MUTED))
styles.add(ParagraphStyle(name="BodyStrong", fontName="Helvetica-Bold", fontSize=9.5, leading=12, textColor=INK))
styles.add(ParagraphStyle(name="Body", fontName="Helvetica", fontSize=9.5, leading=12, textColor=INK))


def money(value: float) -> str:
    return f"${value:,.2f}"


def header(title: str, number: str, accent: colors.Color):
    meta = Table(
        [
            [Paragraph("APEX INDUSTRIAL SUPPLY", styles["Brand"]), Paragraph(number, styles["BodyStrong"])],
            [Paragraph(title, styles["DocTitle"]), Paragraph("CLEARPACKET DEMO", styles["Small"])],
        ],
        colWidths=[5.4 * inch, 1.3 * inch],
    )
    meta.setStyle(TableStyle([
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LINEBELOW", (0, -1), (-1, -1), 2, accent),
    ]))
    return meta


def info_grid(rows):
    data = []
    for left_label, left_value, right_label, right_value in rows:
        data.append([
            Paragraph(left_label.upper(), styles["Small"]),
            Paragraph(left_value, styles["BodyStrong"]),
            Paragraph(right_label.upper(), styles["Small"]),
            Paragraph(right_value, styles["BodyStrong"]),
        ])
    table = Table(data, colWidths=[0.9 * inch, 2.15 * inch, 0.9 * inch, 2.15 * inch], rowHeights=0.34 * inch)
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#D8D5C9")),
    ]))
    return table


def items_table(items, accent, qty_label="QTY"):
    data = [["ITEM", "DESCRIPTION", qty_label, "UNIT PRICE", "AMOUNT"]]
    for sku, description, qty, unit in items:
        data.append([sku, description, str(qty), money(unit), money(qty * unit)])
    table = Table(data, colWidths=[0.85 * inch, 2.7 * inch, 0.75 * inch, 1.0 * inch, 1.05 * inch], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), accent),
        ("TEXTCOLOR", (0, 0), (-1, 0), INK),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
        ("ALIGN", (2, 0), (-1, 0), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PAPER]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D8D5C9")),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    return table


def totals(items, label="TOTAL"):
    subtotal = sum(qty * unit for _, _, qty, unit in items)
    table = Table(
        [
            ["Subtotal", money(subtotal)],
            ["Tax", "$0.00"],
            [label, money(subtotal)],
        ],
        colWidths=[1.4 * inch, 1.15 * inch],
        hAlign="RIGHT",
    )
    table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 1), "Helvetica"),
        ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("LINEABOVE", (0, 2), (-1, 2), 1.5, INK),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def build_pdf(filename, title, number, accent, info_rows, items, footer_note, qty_label="QTY", total_label="TOTAL"):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    path = OUTPUT / filename
    doc = SimpleDocTemplate(
        str(path), pagesize=LETTER, rightMargin=0.65 * inch, leftMargin=0.65 * inch,
        topMargin=0.58 * inch, bottomMargin=0.58 * inch,
        title=f"{title} {number}", author="ClearPacket",
    )
    story = [
        header(title, number, accent), Spacer(1, 0.28 * inch),
        info_grid(info_rows), Spacer(1, 0.3 * inch),
        items_table(items, accent, qty_label=qty_label), Spacer(1, 0.22 * inch),
        totals(items, label=total_label), Spacer(1, 0.35 * inch),
        Table(
            [[Paragraph("DOCUMENT NOTE", styles["Small"]), Paragraph(footer_note, styles["Body"]) ]],
            colWidths=[1.25 * inch, 5.1 * inch],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EBE8DC")),
                ("BOX", (0, 0), (-1, -1), 0.75, INK),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ]),
        ),
        Spacer(1, 0.28 * inch),
        Paragraph("Generated for the ClearPacket verification demo. All company and transaction details are fictional.", styles["Small"]),
    ]
    doc.build(story)
    (PUBLIC / filename).write_bytes(path.read_bytes())


def main():
    po_items = [
        ("CL-210", "Rechargeable inspection lights", 4, 118.00),
        ("SF-108", "Industrial filter cartridges", 8, 76.50),
        ("PS-092", "Heat-resistant protective sleeves", 10, 9.20),
    ]
    invoice_items = [
        ("CL-210", "Rechargeable inspection lights", 4, 118.00),
        ("SF-108", "Industrial filter cartridges", 8, 76.50),
        ("PS-092", "Heat-resistant protective sleeves", 12, 9.20),
    ]

    build_pdf(
        "PO-1048.pdf", "PURCHASE ORDER", "PO-1048", ACID,
        [
            ("Buyer", "Northwind Fabrication", "Supplier", "Apex Industrial Supply"),
            ("Order date", "August 20, 2026", "Terms", "Net 30"),
            ("Ship to", "88 Foundry Road, Hamilton, ON", "Currency", "USD"),
        ],
        po_items,
        "Authorized order for the quantities and prices listed above. Purchase is tax exempt.",
        total_label="PO TOTAL",
    )
    build_pdf(
        "INV-7782.pdf", "SUPPLIER INVOICE", "INV-7782", CLAY,
        [
            ("Bill to", "Northwind Fabrication", "Supplier", "Apex Industrial Supply"),
            ("Invoice date", "August 26, 2026", "PO reference", "PO-1048"),
            ("Payment terms", "Net 30", "Currency", "USD"),
        ],
        invoice_items,
        "Please remit the invoice total by September 25, 2026. Reference INV-7782 with payment.",
        total_label="AMOUNT DUE",
    )
    build_pdf(
        "RECEIPT-592.pdf", "DELIVERY RECEIPT", "RECEIPT-592", BLUE,
        [
            ("Received by", "Northwind Fabrication", "Supplier", "Apex Industrial Supply"),
            ("Received date", "August 25, 2026", "PO reference", "PO-1048"),
            ("Location", "Hamilton Receiving Bay 2", "Condition", "Accepted"),
        ],
        po_items,
        "All listed goods were counted at receipt. No damage or backorder was recorded.",
        qty_label="RECEIVED",
        total_label="REFERENCE VALUE",
    )


if __name__ == "__main__":
    main()
