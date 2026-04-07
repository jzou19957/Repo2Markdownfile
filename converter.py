from __future__ import annotations

import os
import zipfile
from pathlib import Path
from typing import Iterable


TEXT_EXTENSIONS = {
    ".c",
    ".cpp",
    ".cs",
    ".css",
    ".env",
    ".go",
    ".graphql",
    ".h",
    ".hpp",
    ".html",
    ".java",
    ".js",
    ".json",
    ".jsx",
    ".md",
    ".mjs",
    ".php",
    ".py",
    ".rb",
    ".rs",
    ".sh",
    ".sql",
    ".svg",
    ".toml",
    ".ts",
    ".tsx",
    ".txt",
    ".xml",
    ".yaml",
    ".yml",
}

EXCLUDED_DIRECTORIES = {
    ".git",
    ".github",
    ".next",
    ".venv",
    "__pycache__",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "venv",
}


def unzip_repository(zip_path: Path, extract_path: Path) -> None:
    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(extract_path)


def iter_project_files(start_path: Path) -> Iterable[Path]:
    for root, dirs, files in os.walk(start_path):
        dirs[:] = sorted(
            directory
            for directory in dirs
            if directory not in EXCLUDED_DIRECTORIES
        )
        for file_name in sorted(files):
            yield Path(root) / file_name


def detect_language(file_path: Path) -> str:
    extension = file_path.suffix.lower().lstrip(".")
    return extension or "text"


def file_to_markdown(file_path: Path, project_root: Path) -> str:
    relative_path = file_path.relative_to(project_root).as_posix()
    extension = file_path.suffix.lower()

    if extension not in TEXT_EXTENSIONS:
        return (
            f"### {relative_path}\n\n"
            "_Skipped binary or unsupported file type._\n"
        )

    try:
        content = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return (
            f"### {relative_path}\n\n"
            "_Skipped file because it is not UTF-8 text._\n"
        )

    if extension == ".md":
        return f"### {relative_path}\n\n{content.strip()}\n"

    language = detect_language(file_path)
    return (
        f"### {relative_path}\n\n"
        f"```{language}\n{content.rstrip()}\n```\n"
    )


def build_markdown_document(project_root: Path, source_label: str) -> str:
    lines = [
        f"# Repository Snapshot: {source_label}",
        "",
        "This markdown file was generated from a GitHub archive and is designed for use with large-context LLM workflows.",
        "",
    ]

    files = list(iter_project_files(project_root))
    if not files:
        lines.extend(["_No supported files were found in the archive._", ""])
        return "\n".join(lines)

    for file_path in files:
        lines.append(file_to_markdown(file_path, project_root).rstrip())
        lines.append("")

    return "\n".join(lines).strip() + "\n"
