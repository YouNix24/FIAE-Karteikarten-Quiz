import sys
from pathlib import Path
try:
    from pdfminer.high_level import extract_text
except Exception as e:
    sys.stderr.write("pdfminer.six not available: %s\n" % (e,))
    raise

def main():
    if len(sys.argv) < 2:
        print("Usage: python tools/extract_pdf_text_pdfminer.py <pdf_path> [max_pages]", file=sys.stderr)
        return 1
    pdf_path = Path(sys.argv[1])
    max_pages = None
    if len(sys.argv) >= 3:
        try:
            max_pages = int(sys.argv[2])
        except:
            max_pages = None
    text = extract_text(str(pdf_path), maxpages=max_pages)
    print(text)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

