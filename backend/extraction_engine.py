"""
OCR & Data Extraction Engine for RevRecog AI
Extracts invoice data from PDF/Image files automatically.
Uses free libraries: pdfplumber (PDF text), Pillow (image), regex (parsing)
"""
import re
import os
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List


class InvoiceExtractor:
    """Extract invoice data from text (PDF or OCR output)"""

    def extract_from_text(self, text: str) -> Dict[str, Any]:
        """Main extraction algorithm - parses invoice text into structured data"""
        result = {
            "invoice_number": self._extract_invoice_number(text),
            "date": self._extract_date(text),
            "due_date": self._extract_due_date(text),
            "client_name": self._extract_client_name(text),
            "amount": self._extract_amount(text),
            "tax_amount": self._extract_tax(text),
            "total_amount": self._extract_total(text),
            "po_number": self._extract_po_number(text),
            "items": self._extract_line_items(text),
            "payment_terms": self._extract_payment_terms(text),
            "gstin": self._extract_gstin(text),
            "confidence": 0.0,
            "raw_text": text[:2000],
        }
        # Calculate confidence score
        filled = sum(1 for v in result.values() if v and v != 0.0)
        result["confidence"] = round((filled / 12) * 100, 1)

        # Auto-calculate total if missing
        if not result["total_amount"] and result["amount"]:
            tax = result["tax_amount"] or (result["amount"] * 0.18)
            result["total_amount"] = round(result["amount"] + tax, 2)
            result["tax_amount"] = round(tax, 2)

        return result

    def _extract_invoice_number(self, text: str) -> Optional[str]:
        patterns = [
            r'(?:Invoice\s*(?:No|Number|#|Num)[\s.:]*)\s*([A-Z0-9\-/]+)',
            r'(?:INV[\s\-./]*\d+[\w\-]*)',
            r'(?:Bill\s*(?:No|Number|#)[\s.:]*)\s*([A-Z0-9\-/]+)',
        ]
        for p in patterns:
            m = re.search(p, text, re.IGNORECASE)
            if m:
                return m.group(1) if m.lastindex else m.group(0)
        return None

    def _extract_date(self, text: str) -> Optional[str]:
        patterns = [
            r'(?:Invoice\s*Date|Date|Dated)[\s.:]*(\d{1,2}[\s\-/]\w{3,9}[\s\-/]\d{2,4})',
            r'(?:Invoice\s*Date|Date|Dated)[\s.:]*(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})',
        ]
        for p in patterns:
            m = re.search(p, text, re.IGNORECASE)
            if m:
                return m.group(1).strip()
        return None

    def _extract_due_date(self, text: str) -> Optional[str]:
        patterns = [
            r'(?:Due\s*Date|Payment\s*Due|Due\s*By)[\s.:]*(\d{1,2}[\s\-/]\w{3,9}[\s\-/]\d{2,4})',
            r'(?:Due\s*Date|Payment\s*Due)[\s.:]*(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})',
        ]
        for p in patterns:
            m = re.search(p, text, re.IGNORECASE)
            if m:
                return m.group(1).strip()
        return None

    def _extract_client_name(self, text: str) -> Optional[str]:
        patterns = [
            r'(?:Bill\s*To|Billed\s*To|Client|Customer|To)[\s.:]*\n?\s*([A-Z][A-Za-z\s&.]+(?:Ltd|Pvt|Inc|Corp|LLP)?\.?)',
            r'(?:M/s|Messrs)[\s.:]*([A-Z][A-Za-z\s&.]+)',
        ]
        for p in patterns:
            m = re.search(p, text, re.IGNORECASE)
            if m:
                name = m.group(1).strip()
                # Clean up - take first 2-3 words
                words = name.split()[:4]
                return ' '.join(words)
        return None

    def _extract_amount(self, text: str) -> Optional[float]:
        patterns = [
            r'(?:Sub\s*Total|Subtotal|Base\s*Amount|Taxable\s*Value)[\s.:]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)',
            r'(?:Amount\s*Before\s*Tax)[\s.:]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)',
        ]
        for p in patterns:
            m = re.search(p, text, re.IGNORECASE)
            if m:
                return self._parse_amount(m.group(1))
        # Fallback: get total and subtract 18% tax
        total = self._extract_total(text)
        if total:
            return round(total / 1.18, 2)
        return None

    def _extract_tax(self, text: str) -> Optional[float]:
        patterns = [
            r'(?:GST|IGST|CGST\s*\+\s*SGST|Tax\s*Amount|Total\s*Tax)[\s.:]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)',
            r'(?:18%|@\s*18).*?(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)',
        ]
        for p in patterns:
            m = re.search(p, text, re.IGNORECASE)
            if m:
                return self._parse_amount(m.group(1))
        return None

    def _extract_total(self, text: str) -> Optional[float]:
        patterns = [
            r'(?:Grand\s*Total|Total\s*Amount|Net\s*Payable|Amount\s*Payable|Total\s*Due)[\s.:]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)',
            r'(?:Total)[\s.:]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)',
        ]
        for p in patterns:
            m = re.search(p, text, re.IGNORECASE)
            if m:
                val = self._parse_amount(m.group(1))
                if val and val > 1000:  # Ignore small numbers
                    return val
        return None

    def _extract_po_number(self, text: str) -> Optional[str]:
        m = re.search(r'(?:PO|Purchase\s*Order)[\s.:#]*([A-Z0-9\-/]+)', text, re.IGNORECASE)
        return m.group(1) if m else None

    def _extract_payment_terms(self, text: str) -> Optional[str]:
        m = re.search(r'(?:Payment\s*Terms?|Net)\s*:?\s*(Net\s*\d+|\d+\s*days?)', text, re.IGNORECASE)
        return m.group(1) if m else None

    def _extract_gstin(self, text: str) -> Optional[str]:
        m = re.search(r'(?:GSTIN|GST\s*No)[\s.:]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9Z][A-Z0-9])', text, re.IGNORECASE)
        return m.group(1) if m else None

    def _extract_line_items(self, text: str) -> List[Dict]:
        """Try to extract line items from invoice"""
        items = []
        # Pattern: description followed by quantity, rate, amount
        pattern = r'([A-Za-z\s]+(?:hours?|days?|units?|services?))\s+(\d+\.?\d*)\s+(?:Rs\.?|₹)?\s*([\d,]+\.?\d*)\s+(?:Rs\.?|₹)?\s*([\d,]+\.?\d*)'
        for m in re.finditer(pattern, text, re.IGNORECASE):
            items.append({
                "description": m.group(1).strip(),
                "quantity": float(m.group(2)),
                "rate": self._parse_amount(m.group(3)) or 0,
                "amount": self._parse_amount(m.group(4)) or 0,
            })
        return items[:10]  # Max 10 items

    def _parse_amount(self, text: str) -> Optional[float]:
        if not text:
            return None
        cleaned = text.replace(',', '').replace(' ', '').strip()
        try:
            val = float(cleaned)
            return val if val > 0 else None
        except ValueError:
            return None


class ContractExtractor:
    """Extract contract terms from text"""

    def extract_from_text(self, text: str) -> Dict[str, Any]:
        return {
            "client_name": self._extract_party(text),
            "contract_value": self._extract_value(text),
            "billing_model": self._detect_billing_model(text),
            "start_date": self._extract_start_date(text),
            "end_date": self._extract_end_date(text),
            "payment_terms": self._extract_payment_terms(text),
            "escalation_clause": self._extract_escalation(text),
            "milestones": self._extract_milestones(text),
            "raw_text": text[:2000],
        }

    def _extract_party(self, text: str) -> Optional[str]:
        m = re.search(r'(?:between|party|client|company)[\s.:]*\n?\s*([A-Z][A-Za-z\s&.]+(?:Ltd|Pvt|Inc)?\.?)', text, re.IGNORECASE)
        return m.group(1).strip()[:50] if m else None

    def _extract_value(self, text: str) -> Optional[float]:
        m = re.search(r'(?:contract\s*value|total\s*value|amount)[\s.:]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)\s*(?:Cr|Lakh|L)?', text, re.IGNORECASE)
        if m:
            val = float(m.group(1).replace(',', ''))
            if 'Cr' in text[m.start():m.end()+5]:
                val *= 10000000
            elif 'L' in text[m.start():m.end()+5] or 'lakh' in text[m.start():m.end()+10].lower():
                val *= 100000
            return val
        return None

    def _detect_billing_model(self, text: str) -> str:
        text_lower = text.lower()
        if 'time and material' in text_lower or 't&m' in text_lower or 'hourly' in text_lower:
            return "T&M"
        elif 'milestone' in text_lower or 'deliverable' in text_lower:
            return "Milestone"
        elif 'retainer' in text_lower or 'monthly fee' in text_lower:
            return "Retainer"
        elif 'performance' in text_lower or 'per lead' in text_lower or 'per call' in text_lower:
            return "Performance"
        return "Hybrid"

    def _extract_start_date(self, text: str) -> Optional[str]:
        m = re.search(r'(?:start|effective|commencement)\s*(?:date)?[\s.:]*(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})', text, re.IGNORECASE)
        return m.group(1) if m else None

    def _extract_end_date(self, text: str) -> Optional[str]:
        m = re.search(r'(?:end|expiry|termination)\s*(?:date)?[\s.:]*(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})', text, re.IGNORECASE)
        return m.group(1) if m else None

    def _extract_payment_terms(self, text: str) -> Optional[str]:
        m = re.search(r'(?:payment\s*terms?|net)\s*:?\s*(Net\s*\d+|\d+\s*days?)', text, re.IGNORECASE)
        return m.group(1) if m else "Net 30"

    def _extract_escalation(self, text: str) -> Optional[str]:
        m = re.search(r'(?:escalation|rate\s*increase|annual\s*increment)[\s.:]*([^\n.]+)', text, re.IGNORECASE)
        return m.group(1).strip()[:100] if m else None

    def _extract_milestones(self, text: str) -> List[str]:
        milestones = []
        for m in re.finditer(r'(?:milestone|phase|deliverable)\s*\d*[\s.:]*([^\n]+)', text, re.IGNORECASE):
            milestones.append(m.group(1).strip()[:100])
        return milestones[:5]


class TimesheetExtractor:
    """Extract billable hours from CSV/text data"""

    def extract_from_csv_text(self, text: str) -> List[Dict]:
        """Parse CSV-style timesheet data"""
        items = []
        lines = text.strip().split('\n')
        if len(lines) < 2:
            return items

        # Try to detect header
        header = lines[0].lower()
        for line in lines[1:]:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 4:
                items.append({
                    "employee_name": parts[0] if len(parts) > 0 else "",
                    "activity_type": parts[1] if len(parts) > 1 else "hours",
                    "quantity": float(parts[2]) if len(parts) > 2 and parts[2].replace('.','').isdigit() else 0,
                    "rate": float(parts[3]) if len(parts) > 3 and parts[3].replace('.','').isdigit() else 0,
                    "description": parts[4] if len(parts) > 4 else "",
                    "date": parts[5] if len(parts) > 5 else datetime.now().strftime("%Y-%m-%d"),
                })
        return items


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF using pdfplumber (free)"""
    try:
        import pdfplumber
        import io
        text = ""
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text
    except Exception as e:
        return f"PDF_ERROR: {str(e)}"


def extract_text_from_image(file_bytes: bytes) -> str:
    """Extract text from image using basic pattern matching on filename/metadata.
    For production: integrate with Tesseract OCR or Google Vision API (free tier)"""
    # In production, this would use pytesseract or cloud OCR
    # For demo, we simulate OCR output
    return "IMAGE_REQUIRES_OCR_ENGINE"


# Singleton instances
invoice_extractor = InvoiceExtractor()
contract_extractor = ContractExtractor()
timesheet_extractor = TimesheetExtractor()
