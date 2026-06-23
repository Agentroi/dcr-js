/**
 * Inline document attachments.
 *
 * Small text/PDF files dropped into the chat and injected one-shot into the LLM
 * context. The content stays in the browser; only the extracted text is sent.
 * For anything larger than the cap, the right answer is an ingestion + retrieval
 * (RAG) pipeline, not inlining — see the knowledge base.
 */

// Cap on extracted text. ~32 KB ≈ ~8k tokens (chars/4) ≈ ~10 pages (~3 KB/page).
export const MAX_DOC_CHARS = 32_000;

export const approxTokens = (chars: number) => Math.round(chars / 4);
export const approxPages = (chars: number) => Math.max(1, Math.round(chars / 3000));

export const DOC_LIMIT_LABEL =
  `~${approxTokens(MAX_DOC_CHARS).toLocaleString()} tokens (~${approxPages(MAX_DOC_CHARS)} pages)`;

const TEXT_EXTENSIONS = ["txt", "md", "json"];
export const DOC_ACCEPT = ".txt,.md,.json,.pdf";
export const LOG_ACCEPT = ".xes,.xes.gz,.gz";

/** An event log file (XES, optionally gzipped) routed to the engine. */
export function isLogFile(filename: string): boolean {
  const n = filename.toLowerCase();
  return n.endsWith(".xes") || n.endsWith(".xes.gz") || n.endsWith(".gz");
}

/** Read an event log as text, transparently gunzipping .gz files in the browser. */
export async function readLogText(file: File): Promise<string> {
  if (file.name.toLowerCase().endsWith(".gz")) {
    const stream = file.stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }
  return file.text();
}

export interface AttachedDoc {
  name: string;
  content: string;
}

/** Raised with a human-readable reason when a document can't be attached. */
export class DocError extends Error {}

function extensionOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i + 1).toLowerCase() : "";
}

export function isSupportedDoc(filename: string): boolean {
  const ext = extensionOf(filename);
  return ext === "pdf" || TEXT_EXTENSIONS.includes(ext);
}

/**
 * Read a supported document and return its extracted text, or throw DocError
 * with a reason (unsupported type, nothing extractable, or over the limit).
 */
export async function extractDocText(file: File): Promise<AttachedDoc> {
  const ext = extensionOf(file.name);

  let text: string;
  if (ext === "pdf") {
    text = await extractPdfText(file);
  } else if (TEXT_EXTENSIONS.includes(ext)) {
    text = await file.text();
  } else {
    throw new DocError(`Unsupported file type ".${ext}". Allowed: ${DOC_ACCEPT}`);
  }

  text = text.trim();
  if (!text) {
    throw new DocError(`No extractable text in "${file.name}" (scanned/image PDFs aren't supported).`);
  }
  if (text.length > MAX_DOC_CHARS) {
    throw new DocError(
      `"${file.name}" is ~${approxTokens(text.length).toLocaleString()} tokens ` +
      `(~${approxPages(text.length)} pages), over the ${DOC_LIMIT_LABEL} limit.`,
    );
  }
  return { name: file.name, content: text };
}

/** Extract text from a PDF in the browser via pdf.js (loaded on demand). */
async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = (
    await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
  ).default;

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;

  const pages: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    pages.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
    // Stop once clearly over the cap — no point parsing a huge PDF in full.
    if (pages.join("\n").length > MAX_DOC_CHARS * 1.2) break;
  }
  return pages.join("\n");
}
