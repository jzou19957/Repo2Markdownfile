from __future__ import annotations

import io
import tempfile
from pathlib import Path

from flask import Flask, render_template, request, send_file

from converter import build_markdown_document, unzip_repository
from github_archive import GitHubUrlError, download_repo_archive, parse_github_url


app = Flask(__name__)


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/generate")
def generate():
    github_url = request.form.get("github_url", "").strip()
    if not github_url:
        return render_template(
            "index.html",
            error="Paste a GitHub repository URL to generate a markdown file.",
        ), 400

    try:
        target = parse_github_url(github_url)
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            zip_path = download_repo_archive(target, temp_path)
            extract_path = temp_path / "repo"
            unzip_repository(zip_path, extract_path)

            extracted_roots = [path for path in extract_path.iterdir() if path.is_dir()]
            project_root = extracted_roots[0] if extracted_roots else extract_path

            markdown = build_markdown_document(project_root, github_url)
            return send_file(
                io.BytesIO(markdown.encode("utf-8")),
                as_attachment=True,
                download_name=target.output_filename,
                mimetype="text/markdown",
            )
    except GitHubUrlError as error:
        return render_template("index.html", error=str(error), github_url=github_url), 400
    except Exception:
        return render_template(
            "index.html",
            error="Something went wrong while generating the markdown file. Please try another public GitHub URL.",
            github_url=github_url,
        ), 500


if __name__ == "__main__":
    app.run(debug=True)
