from pathlib import Path

from converter import build_markdown_document, unzip_repository


def main() -> None:
    current_dir = Path(__file__).resolve().parent
    zip_files = sorted(current_dir.glob("*.zip"))

    for zip_path in zip_files:
        extract_path = current_dir / f"{zip_path.stem}_extracted"
        extract_path.mkdir(exist_ok=True)
        unzip_repository(zip_path, extract_path)

        extracted_roots = [path for path in extract_path.iterdir() if path.is_dir()]
        project_root = extracted_roots[0] if extracted_roots else extract_path

        markdown = build_markdown_document(project_root, zip_path.name)
        output_path = current_dir / f"{zip_path.stem}_overview.md"
        output_path.write_text(markdown, encoding="utf-8")
        print(f"Created {output_path.name}")


if __name__ == "__main__":
    main()
