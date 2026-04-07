from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

import requests


class GitHubUrlError(ValueError):
    pass


@dataclass(frozen=True)
class GitHubArchiveTarget:
    owner: str
    repo: str
    ref: str
    display_name: str

    @property
    def archive_url(self) -> str:
        return (
            f"https://codeload.github.com/{self.owner}/{self.repo}/zip/refs/heads/{self.ref}"
        )

    @property
    def output_filename(self) -> str:
        safe_name = re.sub(r"[^a-zA-Z0-9._-]+", "-", self.display_name).strip("-")
        return f"{safe_name or self.repo}.md"


def parse_github_url(raw_url: str) -> GitHubArchiveTarget:
    parsed = urlparse(raw_url.strip())
    if parsed.netloc not in {"github.com", "www.github.com"}:
        raise GitHubUrlError("Please paste a full GitHub URL from github.com.")

    parts = [part for part in parsed.path.split("/") if part]
    if len(parts) < 2:
        raise GitHubUrlError("That URL does not include a repository path.")

    owner, repo = parts[0], parts[1].removesuffix(".git")
    ref = "main"
    display_name = f"{owner}-{repo}"

    if len(parts) >= 4 and parts[2] in {"tree", "blob"}:
        ref = parts[3]
        display_name = f"{owner}-{repo}-{ref}"

    return GitHubArchiveTarget(owner=owner, repo=repo, ref=ref, display_name=display_name)


def download_repo_archive(target: GitHubArchiveTarget, destination: Path) -> Path:
    response = requests.get(target.archive_url, stream=True, timeout=60)

    if response.status_code == 404 and target.ref == "main":
        fallback_target = GitHubArchiveTarget(
            owner=target.owner,
            repo=target.repo,
            ref="master",
            display_name=f"{target.owner}-{target.repo}-master",
        )
        response = requests.get(fallback_target.archive_url, stream=True, timeout=60)
        target = fallback_target

    if response.status_code >= 400:
        raise GitHubUrlError(
            "GitHub archive download failed. Check that the repo is public and the URL is correct."
        )

    zip_path = destination / f"{target.display_name}.zip"
    with zip_path.open("wb") as file_handle:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                file_handle.write(chunk)

    return zip_path
