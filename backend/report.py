"""
SONARSHIELD - Inspection Report Generator
============================================
Builds a real PDF using reportlab summarizing a mission's analysis results.
"""
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)


def _styles():
    ss = getSampleStyleSheet()
    ss.add(ParagraphStyle(name="SSTitle", fontSize=22, textColor=colors.HexColor("#0b3d5c"),
                           spaceAfter=6, fontName="Helvetica-Bold"))
    ss.add(ParagraphStyle(name="SSSubtitle", fontSize=11, textColor=colors.HexColor("#4a6b7a"),
                           spaceAfter=18))
    ss.add(ParagraphStyle(name="SSHeading", fontSize=14, textColor=colors.HexColor("#0b3d5c"),
                           spaceBefore=14, spaceAfter=8, fontName="Helvetica-Bold"))
    ss.add(ParagraphStyle(name="SSBody", fontSize=9.5, textColor=colors.HexColor("#222222"),
                           leading=13))
    return ss


def generate_report(mission: dict, images: list, anomalies: list, output_path: str = None):
    """
    mission: {id, name, area_km2, operator, date}
    images: [{filename, path}]
    anomalies: [{id, location, class_name, confidence, risk, area_px, reasoning:[...], score, image_path, mask_path}]
    """
    if output_path is None:
        output_path = os.path.join(REPORTS_DIR, f"{mission['id']}_report.pdf")

    doc = SimpleDocTemplate(output_path, pagesize=A4,
                             leftMargin=18 * mm, rightMargin=18 * mm,
                             topMargin=16 * mm, bottomMargin=16 * mm)
    ss = _styles()
    story = []

    story.append(Paragraph("SONARSHIELD", ss["SSTitle"]))
    story.append(Paragraph("AI-Powered Underwater Sonar Intelligence Report", ss["SSSubtitle"]))

    meta_table = Table([
        ["Mission ID", mission.get("id", "-"), "Date", datetime.now().strftime("%Y-%m-%d %H:%M")],
        ["Mission Name", mission.get("name", "-"), "Operator", mission.get("operator", "-")],
        ["Survey Area", f"{mission.get('area_km2', '-')} km²", "Images Processed", str(len(images))],
    ], colWidths=[32 * mm, 55 * mm, 35 * mm, 45 * mm])
    meta_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#0b3d5c")),
        ("TEXTCOLOR", (2, 0), (2, -1), colors.HexColor("#0b3d5c")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Survey Summary", ss["SSHeading"]))
    high = len([a for a in anomalies if a["risk"] == "HIGH"])
    med = len([a for a in anomalies if a["risk"] == "MEDIUM"])
    low = len([a for a in anomalies if a["risk"] == "LOW"])
    summary_table = Table([
        ["Objects Detected", "Anomalies Flagged", "High Priority", "Medium", "Low"],
        [str(len(anomalies)), str(len(anomalies)), str(high), str(med), str(low)],
    ], colWidths=[33 * mm, 33 * mm, 33 * mm, 33 * mm, 33 * mm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0b3d5c")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("High Priority Findings", ss["SSHeading"]))
    if high == 0:
        story.append(Paragraph("No HIGH risk anomalies were flagged in this survey.", ss["SSBody"]))
    else:
        for a in [x for x in anomalies if x["risk"] == "HIGH"]:
            story.append(Paragraph(
                f"<b>{a['id']}</b> — {a.get('class_name','Anomaly')} — "
                f"Confidence {a['confidence']*100:.1f}% — Risk Score {a['score']}/100",
                ss["SSBody"]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Detailed Anomaly Log", ss["SSHeading"]))
    for a in anomalies:
        story.append(Paragraph(
            f"<b>{a['id']}</b> | Location: {a.get('location','-')} | "
            f"Class: {a.get('class_name','-')} | Confidence: {a['confidence']*100:.1f}% | "
            f"Risk: <b>{a['risk']}</b> | Area: {a.get('area_px','-')} px | Score: {a['score']}/100",
            ss["SSBody"]))
        reasoning = a.get("reasoning", [])
        if reasoning:
            story.append(Paragraph("Reasoning: " + "; ".join(reasoning), ss["SSBody"]))

        row_images = []
        if a.get("image_path") and os.path.exists(a["image_path"]):
            row_images.append(Image(a["image_path"], width=70 * mm, height=52 * mm))
        if a.get("mask_path") and os.path.exists(a["mask_path"]):
            row_images.append(Image(a["mask_path"], width=70 * mm, height=52 * mm))
        if row_images:
            img_table = Table([row_images])
            img_table.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0)]))
            story.append(img_table)
        story.append(Spacer(1, 10))

    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "Disclaimer: This report was generated by the SONARSHIELD prototype for demonstration "
        "purposes (Smart India Hackathon 2026, PS SIH26057). Risk scores use a transparent, "
        "hand-authored heuristic formula and are NOT scientifically validated maritime risk "
        "assessments. Detection results were produced in DEMO / heuristic-CV mode unless a "
        "trained model was explicitly loaded. Map coordinates, where shown, are simulated.",
        ss["SSBody"]))

    doc.build(story)
    return output_path
