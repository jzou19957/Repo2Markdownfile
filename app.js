const TEXT_EXTENSIONS = new Set([
  ".c", ".cpp", ".cs", ".css", ".env", ".go", ".graphql", ".h", ".hpp",
  ".html", ".java", ".js", ".json", ".jsx", ".md", ".mjs", ".php", ".py",
  ".rb", ".rs", ".sh", ".sql", ".svg", ".toml", ".ts", ".tsx", ".txt",
  ".xml", ".yaml", ".yml"
]);

const EXCLUDED_SEGMENTS = new Set([
  ".git", ".github", ".next", ".venv", "__pycache__", "build", "coverage", "dist", "node_modules", "venv"
]);

const BATCH_SIZE = 40;

const form = document.querySelector("#generator-form");
const input = document.querySelector("#github-url");
const submitButton = document.querySelector("#submit-button");
const errorBanner = document.querySelector("#error-banner");
const statusPanel = document.querySelector("#status-panel");
const statusLabel = document.querySelector("#status-label");
const statusDetail = document.querySelector("#status-detail");
const progressBar = document.querySelector("#progress-bar");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessages();
  setBusy(true);

  try {
    updateStatus("Parsing repository link", "Checking the GitHub URL and finding the repository details.", 8);
    const target = await parseGitHubUrl(input.value);

    updateStatus("Loading repository tree", `Reading file list from ${target.owner}/${target.repo}.`, 18);
    const tree = await fetchRepoTree(target);

    const filteredFiles = tree.filter((item) => shouldIncludePath(item.path));
    const scopedFiles = applyPathScope(filteredFiles, target.pathPrefix);
    const blobFiles = scopedFiles.filter((item) => item.type === "blob");

    if (!blobFiles.length) {
      throw new Error("No supported files were found for that repository or folder.");
    }

    const totalSize = blobFiles.reduce((sum, item) => sum + (item.size || 0), 0);
    const approxMb = (totalSize / 1_000_000).toFixed(2);

    const sectionCount = Math.max(1, Math.ceil(blobFiles.length / BATCH_SIZE));
    updateStatus(
      "Preparing sections",
      `This repository is being broken into ${sectionCount} manageable section${sectionCount === 1 ? "" : "s"} before merging into one markdown file.`,
      20
    );

    updateStatus(
      "Downloading file contents",
      `Processing ${blobFiles.length} files in your browser, about ${approxMb} MB of text content.`,
      28
    );
    const markdown = await buildMarkdown(target, blobFiles);

    updateStatus("Preparing download", "Your markdown file is ready.", 100);
    downloadMarkdown(markdown, target.outputFilename);
    statusDetail.textContent = `Downloaded ${target.outputFilename}`;
  } catch (error) {
    showError(error.message || "Something went wrong while generating the markdown file.");
  } finally {
    setBusy(false);
  }
});

function clearMessages() {
  errorBanner.hidden = true;
  errorBanner.textContent = "";
  statusPanel.hidden = true;
  statusLabel.textContent = "";
  statusDetail.textContent = "";
  progressBar.style.width = "0%";
}

function setBusy(isBusy) {
  submitButton.disabled = isBusy;
  submitButton.textContent = isBusy ? "Generating..." : "Generate Markdown";
}

function updateStatus(title, detail, percent) {
  statusPanel.hidden = false;
  statusLabel.textContent = title;
  statusDetail.textContent = detail;
  progressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function showError(message) {
  errorBanner.hidden = false;
  errorBanner.textContent = message;
}

async function parseGitHubUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error("Paste a full public GitHub URL.");
  }

  if (!["github.com", "www.github.com"].includes(parsed.hostname)) {
    throw new Error("This app only accepts links from github.com.");
  }

  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error("That URL does not include a repository path.");
  }

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, "");
  let ref = null;
  let pathPrefix = "";

  if (parts.length >= 4 && (parts[2] === "tree" || parts[2] === "blob")) {
    const resolved = await resolveRefFromPath(owner, repo, parts.slice(3));
    ref = resolved.ref;
    pathPrefix = resolved.pathPrefix;
  }

  if (!ref) {
    ref = await fetchDefaultBranch(owner, repo);
  }

  const scopeLabel = pathPrefix ? `${owner}-${repo}-${pathPrefix}` : `${owner}-${repo}`;
  return {
    owner,
    repo,
    ref,
    pathPrefix,
    sourceUrl: parsed.toString(),
    outputFilename: `${scopeLabel.replace(/[^a-zA-Z0-9._-]+/g, "-")}.md`
  };
}

async function resolveRefFromPath(owner, repo, pathParts) {
  const branches = await fetchJson(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`);
  const branchNames = branches.map((branch) => branch.name);

  let bestMatch = null;
  for (let i = 1; i <= pathParts.length; i += 1) {
    const candidate = decodeURIComponent(pathParts.slice(0, i).join("/"));
    if (branchNames.includes(candidate)) {
      bestMatch = {
        ref: candidate,
        pathPrefix: decodeURIComponent(pathParts.slice(i).join("/"))
      };
    }
  }

  if (bestMatch) {
    return bestMatch;
  }

  return {
    ref: decodeURIComponent(pathParts[0]),
    pathPrefix: decodeURIComponent(pathParts.slice(1).join("/"))
  };
}

async function fetchDefaultBranch(owner, repo) {
  const repoInfo = await fetchJson(`https://api.github.com/repos/${owner}/${repo}`);
  if (!repoInfo.default_branch) {
    throw new Error("Could not determine the default branch for that repository.");
  }
  return repoInfo.default_branch;
}

async function fetchRepoTree(target) {
  const treeResponse = await fetchJson(
    `https://api.github.com/repos/${target.owner}/${target.repo}/git/trees/${encodeURIComponent(target.ref)}?recursive=1`
  );

  if (!Array.isArray(treeResponse.tree)) {
    throw new Error("GitHub did not return a readable repository tree for that link.");
  }

  return treeResponse.tree;
}

function shouldIncludePath(filePath) {
  const segments = filePath.split("/");
  return !segments.some((segment) => EXCLUDED_SEGMENTS.has(segment));
}

function applyPathScope(files, pathPrefix) {
  if (!pathPrefix) {
    return files;
  }

  const normalizedPrefix = pathPrefix.replace(/^\/+|\/+$/g, "");
  return files.filter((file) => file.path === normalizedPrefix || file.path.startsWith(`${normalizedPrefix}/`));
}

async function buildMarkdown(target, files) {
  const lines = [
    `# Repository Snapshot: ${target.owner}/${target.repo}`,
    "",
    `Source URL: ${target.sourceUrl}`,
    "",
    "This markdown file was generated in the browser by Repo2Markdownfile for use with long-context LLM workflows.",
    ""
  ];

  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const batches = chunkFiles(sortedFiles, BATCH_SIZE);
  let processedCount = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    updateStatus(
      "Processing section",
      `Section ${batchIndex + 1} of ${batches.length}. Breaking the repository into manageable parts, then merging everything into one markdown file.`,
      28 + Math.round((processedCount / sortedFiles.length) * 64)
    );

    for (const file of batch) {
      processedCount += 1;
      const progress = 28 + Math.round((processedCount / sortedFiles.length) * 64);
      updateStatus(
        "Downloading file contents",
        `Section ${batchIndex + 1} of ${batches.length}. Processing ${processedCount} of ${sortedFiles.length}: ${file.path}`,
        progress
      );

      const extension = getExtension(file.path);
      if (!TEXT_EXTENSIONS.has(extension)) {
        lines.push(`## ${file.path}`, "", "_Skipped binary or unsupported file type._", "");
        continue;
      }

      const blob = await fetchJson(file.url);
      const decoded = decodeBase64Utf8(blob.content || "");

      lines.push(`## ${file.path}`, "");
      if (extension === ".md") {
        lines.push(decoded.trimEnd(), "");
      } else {
        lines.push(`\`\`\`${extension.slice(1) || "text"}`);
        lines.push(decoded.trimEnd());
        lines.push("```", "");
      }
    }
  }

  return `${lines.join("\n").trim()}\n`;
}

function chunkFiles(files, size) {
  const chunks = [];
  for (let index = 0; index < files.length; index += size) {
    chunks.push(files.slice(index, index + size));
  }
  return chunks;
}

function getExtension(filePath) {
  const fileName = filePath.split("/").pop() || "";
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

function decodeBase64Utf8(value) {
  const binary = atob(value.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function downloadMarkdown(markdown, filename) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json"
    }
  });

  if (response.status === 403) {
    throw new Error("GitHub rate limited this request. Please wait a bit and try again.");
  }

  if (response.status === 404) {
    throw new Error("That repository, branch, or folder could not be found. Make sure it is public.");
  }

  if (!response.ok) {
    throw new Error("GitHub returned an error while reading that repository.");
  }

  return response.json();
}
