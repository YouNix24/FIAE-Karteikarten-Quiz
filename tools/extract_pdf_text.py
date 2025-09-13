import sys
from pathlib import Path

try:
    from PyPDF2 import PdfReader
except Exception as e:
    print("ERR: PyPDF2 not available:", e, file=sys.stderr)
    sys.exit(2)


def extract_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    chunks = []
    for page in reader.pages:
        try:
            txt = page.extract_text() or ""
        except Exception:
            txt = ""
        chunks.append(txt)
    return "\n".join(chunks)


def main():
    if len(sys.argv) < 2:
        print("Usage: python tools/extract_pdf_text.py <pdf_path>", file=sys.stderr)
        sys.exit(1)
    pdf_path = Path(sys.argv[1])
    if not pdf_path.exists():
        print(f"ERR: File not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)
    text = extract_text(pdf_path)
    print(text)


if __name__ == "__main__":
    main()

