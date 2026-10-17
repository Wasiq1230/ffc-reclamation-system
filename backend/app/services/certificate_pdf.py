import os
import base64
from pathlib import Path
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
import qrcode

def draw_checkbox(c, x, y, size=9, checked=False, label=""):
    """Draws a crisp engineering form checkbox with optional checkmark."""
    c.setLineWidth(0.8)
    c.setStrokeColor(colors.black)
    c.setFillColor(colors.white)
    c.rect(x, y, size, size, fill=1, stroke=1)
    
    if checked:
        c.setLineWidth(1.2)
        # Draw checkmark
        c.line(x + 1.5, y + 4.5, x + 3.5, y + 1.5)
        c.line(x + 3.5, y + 1.5, x + 7.5, y + 7.5)
        c.setLineWidth(0.8)
        
    if label:
        c.setFillColor(colors.black)
        c.setFont("Helvetica", 8)
        c.drawString(x + size + 4, y + 1.5, label)

def generate_ffc_certificate_pdf(cert_data: dict, output_path: str = None) -> bytes:
    """
    Renders an exact vector A4 portrait reproduction of FFC Form QF-003-05-307 (ANNEXURE-III).
    Matches engineering form styling with precise borders, checkboxes, and alignment.
    """
    buffer = BytesIO()
    # A4 Dimensions: 595.27 x 841.89 points
    width, height = A4
    c = canvas.Canvas(output_path if output_path else buffer, pagesize=A4)
    
    # Page Margins
    margin_x = 32
    margin_y = 30
    content_width = width - (2 * margin_x)
    content_top = height - margin_y
    
    # Outer Main Border Box
    c.setLineWidth(1.2)
    c.setStrokeColor(colors.black)
    c.rect(margin_x, margin_y, content_width, content_top - margin_y)
    
    # ----------------------------------------------------
    # HEADER SECTION
    # ----------------------------------------------------
    # Upper-Left: Annexure & Reference Date
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin_x + 10, content_top - 20, cert_data.get("annexure", "ANNEXURE-III"))
    c.setFont("Helvetica", 8.5)
    c.drawString(margin_x + 10, content_top - 32, f"Date: {cert_data.get('form_ref_date', '13-05-2025')}")
    
    # Upper-Right: Organization details
    c.setFont("Helvetica-Bold", 9)
    c.drawRightString(margin_x + content_width - 10, content_top - 18, "FAUJI FERTILIZER COMPANY LTD.")
    c.setFont("Helvetica", 8)
    c.drawRightString(margin_x + content_width - 10, content_top - 29, "Fabrication Shop — Goth Machhi")
    c.setFont("Helvetica-Bold", 8)
    c.drawRightString(margin_x + content_width - 10, content_top - 40, f"Ref: {cert_data.get('form_reference', 'QF-003-05-307')}")

    # Center Title
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(width / 2, content_top - 45, "VALVE RECLAMATION TEST CERTIFICATE")
    
    # Horizontal divider below header
    c.setLineWidth(1.0)
    header_bottom = content_top - 58
    c.line(margin_x, header_bottom, margin_x + content_width, header_bottom)
    
    # ----------------------------------------------------
    # IDENTIFICATION FIELDS
    # ----------------------------------------------------
    id_box_height = 56
    id_box_bottom = header_bottom - id_box_height
    c.setLineWidth(0.8)
    
    # Line 1: Identification No. & Date
    y_row1 = header_bottom - 16
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(margin_x + 8, y_row1, "IDENTIFICATION NO:")
    c.setFont("Helvetica", 8.5)
    c.drawString(margin_x + 115, y_row1, str(cert_data.get("identification_no", "")))
    
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(margin_x + 330, y_row1, "DATE:")
    c.setFont("Helvetica", 8.5)
    c.drawString(margin_x + 375, y_row1, str(cert_data.get("certificate_date", "")))
    
    # Line 2: Area & Notification No.
    y_row2 = header_bottom - 32
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(margin_x + 8, y_row2, "AREA:")
    c.setFont("Helvetica", 8.5)
    c.drawString(margin_x + 115, y_row2, str(cert_data.get("area", "")))
    
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(margin_x + 330, y_row2, "Notification No:")
    c.setFont("Helvetica", 8.5)
    c.drawString(margin_x + 415, y_row2, str(cert_data.get("notification_no", "")))
    
    # Line 3: Valve Description
    y_row3 = header_bottom - 48
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(margin_x + 8, y_row3, "VALVE DESCRIPTION:")
    c.setFont("Helvetica", 8.5)
    desc = str(cert_data.get("valve_description", ""))[:75]
    c.drawString(margin_x + 125, y_row3, desc)
    
    # Divider below Identification
    c.line(margin_x, id_box_bottom, margin_x + content_width, id_box_bottom)
    
    # ----------------------------------------------------
    # SECTION: RECLAMATION STATUS
    # ----------------------------------------------------
    status_header_y = id_box_bottom - 16
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(margin_x + 8, status_header_y, "RECLAMATION STATUS:")
    c.setLineWidth(0.6)
    c.line(margin_x, status_header_y - 5, margin_x + content_width, status_header_y - 5)
    
    curr_y = status_header_y - 20
    row_height = 23
    
    # 01. Body Seat
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(margin_x + 10, curr_y, "01. Body Seat")
    draw_checkbox(c, margin_x + 140, curr_y - 1, checked=bool(cert_data.get("body_seat_stellited")), label="Stellited")
    draw_checkbox(c, margin_x + 230, curr_y - 1, checked=bool(cert_data.get("body_seat_machined")), label="Machined")
    draw_checkbox(c, margin_x + 320, curr_y - 1, checked=bool(cert_data.get("body_seat_lapped")), label="Lapped")
    c.line(margin_x, curr_y - 6, margin_x + content_width, curr_y - 6)
    
    # 02. Gate / Disc / Plug (Replaced Warehouse Code with Stellite, Machined, Lapped condition checkboxes)
    curr_y -= row_height
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(margin_x + 10, curr_y, "02. Gate / Disc / Plug")
    draw_checkbox(c, margin_x + 140, curr_y - 1, checked=bool(cert_data.get("gate_disc_plug_stellited")), label="Stellite")
    draw_checkbox(c, margin_x + 230, curr_y - 1, checked=bool(cert_data.get("gate_disc_plug_machined")), label="Machined")
    draw_checkbox(c, margin_x + 320, curr_y - 1, checked=bool(cert_data.get("gate_disc_plug_lapped")), label="Lapped")
    c.line(margin_x, curr_y - 6, margin_x + content_width, curr_y - 6)
    
    # 03. Back Seat (Stem Bushing)
    curr_y -= row_height
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(margin_x + 10, curr_y, "03. Back Seat (Stem Bushing)")
    draw_checkbox(c, margin_x + 160, curr_y - 1, checked=bool(cert_data.get("back_seat_bushing_stellited")), label="Stellited")
    draw_checkbox(c, margin_x + 250, curr_y - 1, checked=bool(cert_data.get("back_seat_bushing_machined")), label="Machined")
    draw_checkbox(c, margin_x + 340, curr_y - 1, checked=bool(cert_data.get("back_seat_bushing_lapped")), label="Lapped")
    c.line(margin_x, curr_y - 6, margin_x + content_width, curr_y - 6)
    
    # 04. Back Seat (Stem)
    curr_y -= row_height
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(margin_x + 10, curr_y, "04. Back Seat (Stem)")
    draw_checkbox(c, margin_x + 160, curr_y - 1, checked=bool(cert_data.get("back_seat_stem_stellited")), label="Stellited")
    draw_checkbox(c, margin_x + 250, curr_y - 1, checked=bool(cert_data.get("back_seat_stem_machined")), label="Machined")
    draw_checkbox(c, margin_x + 340, curr_y - 1, checked=bool(cert_data.get("back_seat_stem_lapped")), label="Lapped")
    c.line(margin_x, curr_y - 6, margin_x + content_width, curr_y - 6)
    
    # 05. Stem
    curr_y -= row_height
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(margin_x + 10, curr_y, "05. Stem")
    draw_checkbox(c, margin_x + 140, curr_y - 1, checked=bool(cert_data.get("stem_built_up")), label="Built-up")
    draw_checkbox(c, margin_x + 230, curr_y - 1, checked=bool(cert_data.get("stem_machined")), label="Machined")
    draw_checkbox(c, margin_x + 320, curr_y - 1, checked=bool(cert_data.get("stem_polish")), label="Polish")
    c.line(margin_x, curr_y - 6, margin_x + content_width, curr_y - 6)
    
    # 06. Gland Packing (Preserves W.Code + manual specification entry + checkboxes)
    curr_y -= row_height
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(margin_x + 10, curr_y, "06. Gland Packing")
    c.setFont("Helvetica", 8)
    w_code = cert_data.get('gland_packing_warehouse_code', '') or '—'
    gp_spec = cert_data.get('gland_packing_specification', '') or ''
    c.drawString(margin_x + 115, curr_y, f"W.Code: {w_code}")
    if gp_spec:
        c.drawString(margin_x + 195, curr_y, f"Spec: {gp_spec[:18]}")
    else:
        c.drawString(margin_x + 210, curr_y, "Material:")
    draw_checkbox(c, margin_x + 300, curr_y - 1, checked=bool(cert_data.get("gland_packing_comp_rpr")), label="Comp. Rpr")
    draw_checkbox(c, margin_x + 390, curr_y - 1, checked=bool(cert_data.get("gland_packing_partl_rpr")), label="Part'l Rpr")
    c.line(margin_x, curr_y - 6, margin_x + content_width, curr_y - 6)
    
    # 07. Bonnet Gasket (Preserves W.Code + manual specification entry + checkboxes)
    curr_y -= row_height
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(margin_x + 10, curr_y, "07. Bonnet Gasket")
    c.setFont("Helvetica", 8)
    bg_wcode = cert_data.get('bonnet_gasket_warehouse_code', '') or '—'
    bg_spec = cert_data.get('bonnet_gasket_specification', '') or ''
    c.drawString(margin_x + 115, curr_y, f"W.Code: {bg_wcode}")
    if bg_spec:
        c.drawString(margin_x + 195, curr_y, f"Spec: {bg_spec[:14]}")
        draw_checkbox(c, margin_x + 270, curr_y - 1, checked=bool(cert_data.get("bonnet_gasket_new")), label="New")
        draw_checkbox(c, margin_x + 325, curr_y - 1, checked=bool(cert_data.get("bonnet_gasket_old")), label="Old")
        draw_checkbox(c, margin_x + 375, curr_y - 1, checked=bool(cert_data.get("bonnet_gasket_shop_fab")), label="Shop Fabricated")
    else:
        draw_checkbox(c, margin_x + 250, curr_y - 1, checked=bool(cert_data.get("bonnet_gasket_new")), label="New")
        draw_checkbox(c, margin_x + 320, curr_y - 1, checked=bool(cert_data.get("bonnet_gasket_old")), label="Old")
        draw_checkbox(c, margin_x + 380, curr_y - 1, checked=bool(cert_data.get("bonnet_gasket_shop_fab")), label="Shop Fabricated")
    c.line(margin_x, curr_y - 6, margin_x + content_width, curr_y - 6)
    
    # ----------------------------------------------------
    # SECTION: 08. PRESSURE TESTING
    # ----------------------------------------------------
    curr_y -= 18
    c.setFont("Helvetica-Bold", 9)
    c.drawString(margin_x + 10, curr_y, "08. PRESSURE TESTING")
    c.setLineWidth(0.8)
    c.line(margin_x, curr_y - 4, margin_x + content_width, curr_y - 4)
    
    # Pressure testing table header
    curr_y -= 16
    c.setFont("Helvetica-Bold", 8)
    c.drawString(margin_x + 15, curr_y, "TEST CATEGORY")
    c.drawString(margin_x + 150, curr_y, "METHOD")
    c.drawString(margin_x + 270, curr_y, "TEST PRESSURE")
    c.drawString(margin_x + 400, curr_y, "ACTUAL RESULT")
    c.setLineWidth(0.5)
    c.line(margin_x, curr_y - 4, margin_x + content_width, curr_y - 4)
    
    # Test 1: Seat Test U/S
    curr_y -= 18
    c.setFont("Helvetica", 8)
    c.drawString(margin_x + 15, curr_y, "Seat Test U/S")
    draw_checkbox(c, margin_x + 140, curr_y - 1, checked=bool(cert_data.get("seat_test_us_hyd")), label="Hyd.")
    draw_checkbox(c, margin_x + 195, curr_y - 1, checked=bool(cert_data.get("seat_test_us_pneumatic")), label="Pneumatic")
    c.drawString(margin_x + 270, curr_y, str(cert_data.get("seat_test_us_pressure", "") or "—"))
    c.drawString(margin_x + 400, curr_y, str(cert_data.get("seat_test_us_result", "") or "—"))
    c.line(margin_x, curr_y - 5, margin_x + content_width, curr_y - 5)
    
    # Test 2: Seat Test D/S
    curr_y -= 18
    c.setFont("Helvetica", 8)
    c.drawString(margin_x + 15, curr_y, "Seat Test D/S")
    draw_checkbox(c, margin_x + 140, curr_y - 1, checked=bool(cert_data.get("seat_test_ds_hyd")), label="Hyd.")
    draw_checkbox(c, margin_x + 195, curr_y - 1, checked=bool(cert_data.get("seat_test_ds_pneumatic")), label="Pneumatic")
    c.drawString(margin_x + 270, curr_y, str(cert_data.get("seat_test_ds_pressure", "") or "—"))
    c.drawString(margin_x + 400, curr_y, str(cert_data.get("seat_test_ds_result", "") or "—"))
    c.line(margin_x, curr_y - 5, margin_x + content_width, curr_y - 5)
    
    # Test 3: Body Test
    curr_y -= 18
    c.setFont("Helvetica", 8)
    c.drawString(margin_x + 15, curr_y, "Body Test")
    draw_checkbox(c, margin_x + 140, curr_y - 1, checked=bool(cert_data.get("body_test_hyd")), label="Hyd.")
    draw_checkbox(c, margin_x + 195, curr_y - 1, checked=bool(cert_data.get("body_test_pneumatic")), label="Pneumatic")
    c.drawString(margin_x + 270, curr_y, str(cert_data.get("body_test_pressure", "") or "—"))
    c.drawString(margin_x + 400, curr_y, str(cert_data.get("body_test_result", "") or "—"))
    c.line(margin_x, curr_y - 5, margin_x + content_width, curr_y - 5)
    
    # ----------------------------------------------------
    # SECTION: 09. Ends
    # ----------------------------------------------------
    curr_y -= 18
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(margin_x + 10, curr_y, "09. Ends")
    draw_checkbox(c, margin_x + 140, curr_y - 1, checked=bool(cert_data.get("ends_distance")), label="Distance")
    draw_checkbox(c, margin_x + 240, curr_y - 1, checked=bool(cert_data.get("ends_built_up")), label="Built-up")
    draw_checkbox(c, margin_x + 340, curr_y - 1, checked=bool(cert_data.get("ends_machined")), label="Machined")
    c.setLineWidth(0.8)
    c.line(margin_x, curr_y - 6, margin_x + content_width, curr_y - 6)
    
    # ----------------------------------------------------
    # SECTION: RECLAIMED BY & CHECKED BY (Two Adjacent Columns)
    # ----------------------------------------------------
    col_width = content_width / 2
    col_mid_x = margin_x + col_width
    curr_y -= 8
    exec_box_height = 68
    exec_bottom = curr_y - exec_box_height
    
    # Vertical divider between columns
    c.line(col_mid_x, curr_y, col_mid_x, exec_bottom)
    
    # Left Column: RECLAIMED BY
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(margin_x + 15, curr_y - 12, "RECLAIMED BY:")
    c.setFont("Helvetica", 8)
    c.drawString(margin_x + 15, curr_y - 28, f"Name: {cert_data.get('reclaimed_by_name', '') or '___________________'}")
    c.drawString(margin_x + 15, curr_y - 44, f"P.No.: {cert_data.get('reclaimed_by_pno', '') or '___________________'}")
    c.drawString(margin_x + 15, curr_y - 58, "Sign: ___________________")
    
    # Right Column: CHECKED BY
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(col_mid_x + 15, curr_y - 12, "CHECKED BY:")
    c.setFont("Helvetica", 8)
    c.drawString(col_mid_x + 15, curr_y - 28, f"Name: {cert_data.get('checked_by_name', '') or '___________________'}")
    c.drawString(col_mid_x + 15, curr_y - 44, f"P.No.: {cert_data.get('checked_by_pno', '') or '___________________'}")
    c.drawString(col_mid_x + 15, curr_y - 58, "Sign: ___________________")

    # If digital signature is provided, draw signature image
    sig_data = cert_data.get("digital_signature")
    if sig_data and "base64," in str(sig_data):
        try:
            b64_str = str(sig_data).split("base64,", 1)[1]
            sig_bytes = base64.b64decode(b64_str)
            sig_reader = ImageReader(BytesIO(sig_bytes))
            c.drawImage(sig_reader, col_mid_x + 45, curr_y - 62, width=95, height=28, mask='auto', preserveAspectRatio=True)
        except Exception as e:
            print("Notice: could not render digital signature in PDF:", e)
    
    c.setLineWidth(0.8)
    c.line(margin_x, exec_bottom, margin_x + content_width, exec_bottom)
    
    # ----------------------------------------------------
    # SECTION: WITNESS from Inspection Section
    # ----------------------------------------------------
    curr_y = exec_bottom
    witness_height = 36
    witness_bottom = curr_y - witness_height
    
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(margin_x + 10, curr_y - 14, "WITNESS from Inspection Section:")
    
    c.setFont("Helvetica-Bold", 8)
    c.drawString(margin_x + 15, curr_y - 26, "Comments:")
    c.setFont("Helvetica", 8)
    comments = str(cert_data.get("witness_comments", "") or "")
    if comments:
        c.drawString(margin_x + 75, curr_y - 26, comments[:100])
    
    # Bottom metadata / Verification Bar
    c.setFont("Helvetica", 7)
    c.setFillColor(colors.HexColor("#444444"))
    c.drawString(margin_x + 10, margin_y + 8, f"Certificate No: {cert_data.get('certificate_number', '')} | Rev: {cert_data.get('revision_number', 0)} | Ident ID: {cert_data.get('identification_no', '')} | Status: {cert_data.get('status', 'DRAFT')}")
    c.drawRightString(margin_x + content_width - 10, margin_y + 8, "Generated by FFC Fabrication Shop Valve Reclamation System")
    
    c.showPage()
    c.save()
    
    if output_path:
        with open(output_path, "rb") as f:
            return f.read()
    else:
        return buffer.getvalue()
