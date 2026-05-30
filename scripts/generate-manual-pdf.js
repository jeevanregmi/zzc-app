/**
 * Generates docs/FOUNDER_OPERATING_MANUAL.pdf from the Markdown source.
 * Uses: marked (MD→HTML) + Chrome headless (HTML→PDF)
 * Run: node scripts/generate-manual-pdf.js
 */

const fs   = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ── 1. Read Markdown ──────────────────────────────────────────────────────────

const mdPath  = path.join(__dirname, "../docs/FOUNDER_OPERATING_MANUAL.md");
const md      = fs.readFileSync(mdPath, "utf8").replace(/\r\n/g, "\n");

// ── 2. Minimal Markdown → HTML (no external deps needed) ─────────────────────

function mdToHtml(src) {
  // Fenced code blocks FIRST — before any inline substitution touches the backticks
  let h = src.replace(/```[\w]*\n([\s\S]*?)```/g, (_, code) => {
    const escaped = code.trim()
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<pre><code>${escaped}</code></pre>`;
  });

  h = h
    // Escape HTML chars in remaining (non-code-block) text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    // Restore pre blocks that got double-escaped
    .replace(/&lt;pre&gt;&lt;code&gt;/g, "<pre><code>")
    .replace(/&lt;\/code&gt;&lt;\/pre&gt;/g, "</code></pre>")
    // Headings
    .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Horizontal rule
    .replace(/^---+$/gm, "<hr>")
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code (safe — fenced blocks already replaced above)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Blockquote
    .replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

  // Tables
  h = h.replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/g, (_, header, rows) => {
    const ths  = header.split("|").filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join("");
    const trs  = rows.trim().split("\n").map(row => {
      const tds = row.split("|").filter(c => c.trim() !== "" || row.indexOf(c) > 0).filter((_, i, a) => i < a.length - 1 && i > 0 || a.length <= 2).join("");
      // simpler: split by | and filter empties at edges
      const cells = row.split("|").slice(1, -1).map(c => `<td>${c.trim()}</td>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");
    return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  });

  // Unordered lists
  h = h.replace(/^([ \t]*)[-*] (.+)$/gm, (_, indent, text) =>
    `<li class="li-${indent.length}">${text}</li>`
  );
  h = h.replace(/(<li[^>]*>.*<\/li>\n?)+/gs, match => `<ul>${match}</ul>`);

  // Ordered lists
  h = h.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Checkboxes
  h = h.replace(/\[ \]/g, "☐").replace(/\[x\]/gi, "☑");

  // Paragraphs — split on double newlines
  const parts = h.split(/\n\n+/);
  const result = parts.map(p => {
    p = p.trim();
    if (!p) return "";
    if (/^<(h[1-6]|ul|ol|li|table|pre|blockquote|hr)/.test(p)) return p;
    return `<p>${p.replace(/\n/g, "<br>")}</p>`;
  });

  return result.join("\n");
}

// ── 3. Build full HTML with styling ──────────────────────────────────────────

const body = mdToHtml(md);

const html = `<!DOCTYPE html>
<html lang="ne">
<head>
<meta charset="UTF-8">
<title>ZZC Founder Operating Manual</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  @page {
    size: A4;
    margin: 20mm 18mm 22mm 18mm;
  }

  body {
    font-family: "Segoe UI", "Noto Sans Devanagari", Arial, sans-serif;
    font-size: 9.5pt;
    line-height: 1.55;
    color: #1a1a1a;
    background: #fff;
  }

  /* ── Cover ── */
  .cover {
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    min-height: 240mm;
    padding: 20mm 10mm;
    border-left: 6px solid #0ea5e9;
  }
  .cover h1 { font-size: 26pt; font-weight: 900; color: #0c1a2e; margin-bottom: 6mm; }
  .cover .sub { font-size: 13pt; color: #475569; margin-bottom: 12mm; }
  .cover .meta { font-size: 9pt; color: #94a3b8; line-height: 2; }

  /* ── Headings ── */
  h1 { font-size: 17pt; font-weight: 900; color: #0c1a2e; margin: 10mm 0 3mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm; page-break-before: always; }
  h1:first-of-type { page-break-before: avoid; }
  h2 { font-size: 13pt; font-weight: 700; color: #0ea5e9; margin: 7mm 0 2mm; }
  h3 { font-size: 11pt; font-weight: 700; color: #1e3a5f; margin: 5mm 0 2mm; border-left: 3px solid #0ea5e9; padding-left: 3mm; }
  h4 { font-size: 10pt; font-weight: 700; color: #334155; margin: 4mm 0 1mm; }

  /* ── Body text ── */
  p  { margin: 0 0 2.5mm; }
  br { display: block; margin-bottom: 1mm; }
  strong { font-weight: 700; }
  em { font-style: italic; color: #475569; }

  /* ── Blockquote ── */
  blockquote {
    border-left: 4px solid #0ea5e9;
    background: #f0f9ff;
    padding: 3mm 5mm;
    margin: 3mm 0;
    font-style: italic;
    color: #1e3a5f;
    font-size: 9pt;
  }

  /* ── Lists ── */
  ul, ol { margin: 1.5mm 0 2.5mm 5mm; padding-left: 4mm; }
  li { margin-bottom: 1mm; }
  li strong { color: #0c1a2e; }

  /* ── Code ── */
  code {
    font-family: "Consolas", "Courier New", monospace;
    font-size: 8.5pt;
    background: #f1f5f9;
    color: #0f172a;
    padding: 0.5px 3px;
    border-radius: 2px;
  }
  pre {
    background: #0f172a;
    color: #e2e8f0;
    padding: 4mm 5mm;
    border-radius: 4px;
    font-size: 8pt;
    line-height: 1.6;
    margin: 3mm 0;
    white-space: pre-wrap;
    page-break-inside: avoid;
  }
  pre code {
    background: none;
    color: #e2e8f0;
    padding: 0;
  }

  /* ── Tables ── */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 3mm 0;
    font-size: 8.5pt;
    page-break-inside: avoid;
  }
  th {
    background: #1e3a5f;
    color: #fff;
    padding: 2mm 3mm;
    text-align: left;
    font-weight: 700;
    font-size: 8pt;
  }
  td {
    padding: 1.8mm 3mm;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
  }
  tr:nth-child(even) td { background: #f8fafc; }
  tr:hover td { background: #f0f9ff; }

  /* ── HR ── */
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 5mm 0; }

  /* ── Utility ── */
  .page-break { page-break-before: always; }

  /* ── Print overrides ── */
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    h1 { page-break-before: always; }
    h1:first-child { page-break-before: avoid; }
    table, pre, blockquote { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="cover">
  <h1>ZZC Founder Operating Manual</h1>
  <div class="sub">Vault Backend — Complete Guide for Non-Technical Founder</div>
  <div class="meta">
    Version 1.0 · May 2026<br>
    Owner: Jeevan Regmi<br>
    Vault: zzc.jeevanregmi.com.np/vault<br>
    Language: Nepali + light English
  </div>
</div>

${body}

</body>
</html>`;

// ── 4. Write temp HTML ────────────────────────────────────────────────────────

const htmlPath = path.join(__dirname, "../docs/FOUNDER_OPERATING_MANUAL.html");
const pdfPath  = path.join(__dirname, "../docs/FOUNDER_OPERATING_MANUAL.pdf");

fs.writeFileSync(htmlPath, html, "utf8");
console.log("✓ HTML written:", htmlPath);

// ── 5. Chrome headless → PDF ──────────────────────────────────────────────────

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const cmd = [
  `"${chrome}"`,
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--disable-extensions",
  `--print-to-pdf="${pdfPath}"`,
  "--print-to-pdf-no-header",
  "--no-pdf-header-footer",
  `"file:///${htmlPath.replace(/\\/g, "/")}"`,
].join(" ");

console.log("⏳ Chrome headless rendering PDF…");
try {
  execSync(cmd, { timeout: 60000, stdio: "pipe" });
  console.log("✓ PDF saved:", pdfPath);

  // Mirror to public/ so the vault /vault/manual page can serve it statically
  const publicDir = path.join(__dirname, "../public/vault-manual");
  const publicPdf = path.join(publicDir, "FOUNDER_OPERATING_MANUAL.pdf");
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  fs.copyFileSync(pdfPath, publicPdf);
  console.log("✓ Copied to public:", publicPdf);
} catch (e) {
  console.error("Chrome error:", e.message);
  process.exit(1);
} finally {
  // Clean up temp HTML
  fs.unlinkSync(htmlPath);
}
