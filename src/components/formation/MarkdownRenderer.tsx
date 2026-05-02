// =============================================================================
// MarkdownRenderer — parser markdown leger pour les lecons Formation (Phase F-UI)
//
// Pas de dependance externe (react-markdown pese 30 KB). Parser maison qui
// gere uniquement ce que le contenu Notion utilise :
//   - ## h2 / ### h3
//   - **bold** / *italic*
//   - > blockquote
//   - - list / 1. ordered list
//   - | table | (markdown tables avec separator |---|)
//   - `code inline`
//   - ligne vide = nouveau paragraphe
//
// Theme-aware via var(--ls-*). Pas de HTML brut autorise (XSS-safe).
// =============================================================================

import { useMemo, type ReactNode } from "react";

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <div
      style={{
        fontFamily: "DM Sans, sans-serif",
        fontSize: 14,
        lineHeight: 1.65,
        color: "var(--ls-text)",
      }}
    >
      {blocks.map((block, idx) => (
        <BlockRenderer key={idx} block={block} />
      ))}
    </div>
  );
}

// ─── Types blocks ───────────────────────────────────────────────────────────

type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "quote"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

// ─── Parsing ────────────────────────────────────────────────────────────────

function parseBlocks(md: string): Block[] {
  const lines = md.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Ligne vide → skip
    if (!trimmed) {
      i++;
      continue;
    }

    // Heading
    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h3", text: trimmed.slice(4) });
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", text: trimmed.slice(3) });
      i++;
      continue;
    }

    // Blockquote (peut s etendre sur plusieurs lignes consecutives)
    if (trimmed.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        buf.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push({ type: "quote", text: buf.join("\n") });
      continue;
    }

    // Liste non ordonnee (- item) sur lignes consecutives
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Liste ordonnee (1. item)
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Table : ligne | ... | suivie d une ligne |---|
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const next = lines[i + 1]?.trim();
      if (next && /^\|[\s|:-]+\|$/.test(next)) {
        const headers = splitTableRow(trimmed);
        const rows: string[][] = [];
        i += 2;
        while (i < lines.length) {
          const t = lines[i].trim();
          if (t.startsWith("|") && t.endsWith("|")) {
            rows.push(splitTableRow(t));
            i++;
          } else {
            break;
          }
        }
        blocks.push({ type: "table", headers, rows });
        continue;
      }
    }

    // Paragraphe (peut s etendre sur plusieurs lignes jusqu a une ligne vide)
    const buf: string[] = [trimmed];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isBlockStart(lines[i])
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: "p", text: buf.join(" ") });
  }
  return blocks;
}

function isBlockStart(line: string): boolean {
  const t = line.trim();
  return (
    t.startsWith("##") ||
    t.startsWith("> ") ||
    /^[-*]\s+/.test(t) ||
    /^\d+\.\s+/.test(t) ||
    (t.startsWith("|") && t.endsWith("|"))
  );
}

function splitTableRow(line: string): string[] {
  return line
    .slice(1, -1)
    .split("|")
    .map((c) => c.trim());
}

// ─── Rendu inline (bold / italic / code) ────────────────────────────────────

function renderInline(text: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  // Pattern : **bold** | *italic* | `code` | autre
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    const m = match[0];
    if (m.startsWith("**") && m.endsWith("**")) {
      tokens.push(
        <strong key={`b${key++}`} style={{ fontWeight: 700, color: "var(--ls-text)" }}>
          {m.slice(2, -2)}
        </strong>,
      );
    } else if (m.startsWith("*") && m.endsWith("*")) {
      tokens.push(
        <em key={`i${key++}`} style={{ fontStyle: "italic" }}>
          {m.slice(1, -1)}
        </em>,
      );
    } else if (m.startsWith("`") && m.endsWith("`")) {
      tokens.push(
        <code
          key={`c${key++}`}
          style={{
            fontFamily: "DM Mono, Courier New, monospace",
            fontSize: "0.92em",
            padding: "1px 6px",
            borderRadius: 4,
            background: "var(--ls-surface2)",
            color: "var(--ls-text)",
          }}
        >
          {m.slice(1, -1)}
        </code>,
      );
    }
    lastIndex = match.index + m.length;
  }
  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }
  return tokens;
}

// ─── BlockRenderer ──────────────────────────────────────────────────────────

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "h2":
      return (
        <h2
          style={{
            fontFamily: "Syne, serif",
            fontSize: 18,
            fontWeight: 800,
            color: "var(--ls-text)",
            letterSpacing: "-0.01em",
            margin: "20px 0 10px",
          }}
        >
          {renderInline(block.text)}
        </h2>
      );
    case "h3":
      return (
        <h3
          style={{
            fontFamily: "Syne, serif",
            fontSize: 15,
            fontWeight: 700,
            color: "var(--ls-text)",
            margin: "16px 0 8px",
          }}
        >
          {renderInline(block.text)}
        </h3>
      );
    case "p":
      return (
        <p style={{ margin: "0 0 12px" }}>
          {renderInline(block.text)}
        </p>
      );
    case "quote":
      return (
        <blockquote
          style={{
            margin: "12px 0",
            padding: "10px 16px",
            borderLeft: "3px solid var(--ls-gold)",
            background: "color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface2))",
            fontStyle: "italic",
            color: "var(--ls-text-muted)",
            borderRadius: "0 8px 8px 0",
            whiteSpace: "pre-line",
          }}
        >
          {block.text.split("\n").map((line, idx) => (
            <div key={idx}>{renderInline(line)}</div>
          ))}
        </blockquote>
      );
    case "ul":
      return (
        <ul style={{ margin: "0 0 12px", paddingLeft: 22 }}>
          {block.items.map((item, idx) => (
            <li key={idx} style={{ marginBottom: 4 }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol style={{ margin: "0 0 12px", paddingLeft: 22 }}>
          {block.items.map((item, idx) => (
            <li key={idx} style={{ marginBottom: 4 }}>
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
    case "table":
      return (
        <div
          style={{
            overflowX: "auto",
            margin: "12px 0",
            border: "0.5px solid var(--ls-border)",
            borderRadius: 10,
            // Indicateur scroll mobile via gradient sur les bords
            backgroundImage:
              "linear-gradient(to right, var(--ls-surface), var(--ls-surface)), " +
              "linear-gradient(to right, var(--ls-surface), var(--ls-surface)), " +
              "linear-gradient(to right, color-mix(in srgb, var(--ls-text) 8%, transparent), transparent), " +
              "linear-gradient(to left, color-mix(in srgb, var(--ls-text) 8%, transparent), transparent)",
            backgroundPosition: "left center, right center, left center, right center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "20px 100%, 20px 100%, 10px 100%, 10px 100%",
            backgroundAttachment: "local, local, scroll, scroll",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              minWidth: 320,
            }}
          >
            <thead>
              <tr>
                {block.headers.map((h, idx) => (
                  <th
                    key={idx}
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      fontWeight: 700,
                      color: "var(--ls-gold)",
                      borderBottom: "1px solid var(--ls-border)",
                      background: "color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface))",
                    }}
                  >
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      style={{
                        padding: "8px 12px",
                        borderBottom: "0.5px solid var(--ls-border)",
                        color: "var(--ls-text)",
                      }}
                    >
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}
