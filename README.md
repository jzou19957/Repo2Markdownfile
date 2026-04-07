# Repo2Markdownfile

Repo2Markdownfile is a public GitHub Pages web app that turns a public GitHub repository into one structured markdown file.

A visitor pastes a GitHub repository link, waits for processing, and downloads a single markdown document that can be uploaded into long-context LLM tools.

## What problem it solves

GitHub repositories are spread across many files and folders, which makes them awkward to drop into an LLM for a full-repository deep dive.

Repo2Markdownfile solves that by turning a repository into one clean document so a long-context model can read the codebase much more easily.

This is especially helpful for:

- quickly familiarizing yourself with a GitHub repository
- asking for a deep dive on architecture and important files
- creating a study plan for learning a new codebase
- making podcast prep notes or teaching material
- building onboarding notes before joining a project

## Great tools to use with the output

The generated markdown file can be uploaded into:

- NotebookLM
- Gemini
- ChatGPT projects or other long-context chats
- Claude
- other long-context LLM tools

Example prompts after upload:

- "Give me a beginner-friendly deep dive on this repository."
- "Help me quickly familiarize myself with this codebase."
- "Create a study plan so I can understand this repository in a few days."
- "Turn this repository into podcast talking points."
- "Explain the architecture, entry points, and key files."

## How the public app works

1. A user pastes a public GitHub repository URL.
2. The browser reads the public repository using the GitHub API.
3. The app collects supported text files.
4. It combines those files into one structured markdown document.
5. The browser downloads the markdown file directly.

No backend is required for the public site version.

## What URLs it supports

- `https://github.com/owner/repo`
- `https://github.com/owner/repo/tree/main`
- `https://github.com/owner/repo/tree/main/src`

## What the markdown output includes

- one combined markdown file
- file-by-file sections
- fenced code blocks for code files
- markdown files preserved as readable markdown
- notes for binary or unsupported files instead of broken output

## Current behavior for large repositories

Because this version runs entirely in the browser, very large repositories may take longer to process.

Current notes:

- public repositories only
- large repositories are allowed
- big repositories may take a while to finish
- GitHub API rate limits can still affect very large runs

If a very large repository is slow, users can still paste a smaller folder URL for a faster result.

## Publish it with GitHub Pages

This repository is set up so you can publish it as a GitHub Pages site.

Steps:

1. Push this repository to GitHub.
2. Open the repository on GitHub.
3. Go to `Settings`.
4. Open `Pages`.
5. Under `Build and deployment`, choose `Deploy from a branch`.
6. Select the main branch and the `/root` folder.
7. Save.

GitHub will then give you a public site URL like:

`https://yourusername.github.io/Repo2Markdownfile/`

## Local preview

Because this is now a static site, you can open `index.html` directly in a browser, or preview it with a simple static server.

Example:

```bash
python -m http.server
```

Then open `http://localhost:8000`.
