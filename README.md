# Repo2Markdownfile

Repo2Markdown turns a public GitHub repository into one clean markdown file that is easy to upload into long-context LLM tools.

The goal is simple: help someone understand a GitHub repository faster.

## Why this is useful

A lot of people want to paste a full repository into an LLM, but raw GitHub pages are fragmented and zip files are awkward. This app gives you one structured markdown document that is much easier to work with.

You can use the output with tools such as:

- NotebookLM
- Gemini with a long context window
- ChatGPT projects or long-context chats
- Claude or other long-context LLMs

That makes it useful for:

- getting a deep dive on what a repository does
- quickly familiarizing yourself with a codebase before an interview or project
- creating a study plan for learning a new repository
- generating podcast prep notes or teaching material
- summarizing architecture, important files, and likely entry points
- helping non-technical users explore what a GitHub repository contains

## What the app does

1. A user pastes a public GitHub repository URL, branch URL, or common folder URL.
2. The app downloads the GitHub archive automatically.
3. It extracts supported text files from the repository.
4. It combines those files into one structured markdown document.
5. The browser downloads that markdown file immediately.

## What the markdown output is good for

The generated markdown file is designed to be fed into a long-context LLM so the model can analyze the repository as a whole instead of one file at a time.

Good prompts after upload include:

- "Give me a beginner-friendly deep dive on this repository."
- "Create a study plan so I can understand this codebase in 3 days."
- "Turn this repository into podcast talking points."
- "Explain the architecture, main flows, and important files."
- "What should I read first if I want to contribute to this project?"

## Current capabilities

- Accepts public GitHub URLs
- Works with repo URLs and branch URLs
- Produces one markdown download
- Preserves markdown files when possible
- Wraps code files in fenced code blocks
- Skips common heavy folders like `node_modules`, `dist`, and `.git`
- Marks binary or unsupported files instead of trying to inline them

## Run locally

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Then open [http://127.0.0.1:5000](http://127.0.0.1:5000).

## Original zip workflow

If you still want to use local zip files, place one or more `.zip` files in the project folder and run:

```bash
python convert_github_to_md.py
```

## Deploy publicly

This app is a good fit for Render, Railway, or Fly.io.

Production start command:

```bash
gunicorn app:app
```

## Current limitation

- This version is for public repositories only.
