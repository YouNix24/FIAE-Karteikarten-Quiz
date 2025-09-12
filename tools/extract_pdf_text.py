import sys
from pathlib import Path

try:
    from PyPDF2 import PdfReader
except Exception as e:
    sys.stderr.write("PyPDF2 not available: %s\n" % (e,))
    sys.exit(2)

def main():
    if len(sys.argv) < 2:
        print("Usage: python tools/extract_pdf_text.py <pdf_path> [max_pages]", file=sys.stderr)
        return 1
    pdf_path = Path(sys.argv[1])
    max_pages = None
    if len(sys.argv) >= 3:
        try:
            max_pages = int(sys.argv[2])
        except:
            max_pages = None
    reader = PdfReader(str(pdf_path))
    n = len(reader.pages)
    if max_pages is None:
        max_pages = n
    out_lines = []
    for i in range(min(n, max_pages)):
        page = reader.pages[i]
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        out_lines.append(f"--- PAGE {i+1}/{n} ---\n{text}")
    print("\n".join(out_lines))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

