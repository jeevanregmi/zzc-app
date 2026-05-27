"use client";

import { useMemo } from "react";
import { getSourcesForContext } from "../../lib/vault/sourceResolver";
import type { DocumentType } from "../../lib/vault/sourceRegistry";

interface Props {
  partNumbers?:   number[];
  govFolder?:     string;
  documentTypes?: DocumentType[];
  tags?:          string[];
  limit?:         number;
  compact?:       boolean;  // single-line badge strip
}

export default function OfficialSourceLinks({
  partNumbers   = [],
  govFolder,
  documentTypes = [],
  tags          = [],
  limit         = 4,
  compact       = false,
}: Props) {
  const sources = useMemo(
    () => getSourcesForContext({ partNumbers, govFolder, documentTypes, tags, limit }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [partNumbers.join(","), govFolder, documentTypes.join(","), tags.join(","), limit],
  );

  if (sources.length === 0) return null;

  if (compact) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, letterSpacing: "0.04em" }}>
          स्रोत:
        </span>
        {sources.map(src => (
          <a
            key={src.sourceId}
            href={src.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`${src.nameNp} — ${src.nameEn}`}
            style={{
              fontSize:        "10px",
              padding:         "2px 7px",
              borderRadius:    "4px",
              background:      "rgba(59,130,246,0.10)",
              color:           "#93c5fd",
              border:          "1px solid rgba(59,130,246,0.20)",
              textDecoration:  "none",
              whiteSpace:      "nowrap",
              display:         "inline-flex",
              alignItems:      "center",
              gap:             "4px",
            }}
          >
            <span style={{ opacity: 0.7 }}>🔗</span>
            {src.domain}
          </a>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, letterSpacing: "0.04em" }}>
        आधिकारिक स्रोतहरू
      </div>
      {sources.map(src => (
        <div
          key={src.sourceId}
          style={{
            display:       "flex",
            alignItems:    "flex-start",
            gap:           "10px",
            padding:       "8px 10px",
            borderRadius:  "7px",
            background:    "rgba(30,41,59,0.7)",
            border:        "1px solid rgba(51,65,85,0.6)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", color: "#e2e8f0", fontWeight: 600 }}>
                {src.nameNp}
              </span>
              <span
                style={{
                  fontSize:     "9px",
                  padding:      "1px 5px",
                  borderRadius: "3px",
                  background:   src.trustLevel === "primary"
                    ? "rgba(34,197,94,0.12)"
                    : src.trustLevel === "secondary"
                      ? "rgba(251,191,36,0.12)"
                      : "rgba(148,163,184,0.12)",
                  color: src.trustLevel === "primary"
                    ? "#86efac"
                    : src.trustLevel === "secondary"
                      ? "#fde68a"
                      : "#94a3b8",
                  border: `1px solid ${src.trustLevel === "primary"
                    ? "rgba(34,197,94,0.2)"
                    : src.trustLevel === "secondary"
                      ? "rgba(251,191,36,0.2)"
                      : "rgba(148,163,184,0.2)"}`,
                }}
              >
                {src.trustLevel === "primary" ? "आधिकारिक" : src.trustLevel === "secondary" ? "सरकारी" : "सन्दर्भ"}
              </span>
            </div>
            {src.noteNp && (
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
                {src.noteNp}
              </div>
            )}
            <div style={{ fontSize: "10px", color: "#475569", marginTop: "2px" }}>
              {src.domain}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", flexShrink: 0 }}>
            <a
              href={src.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize:       "10px",
                padding:        "3px 8px",
                borderRadius:   "5px",
                background:     "rgba(59,130,246,0.15)",
                color:          "#93c5fd",
                border:         "1px solid rgba(59,130,246,0.25)",
                textDecoration: "none",
                whiteSpace:     "nowrap",
              }}
            >
              🌐 खोल्नुस्
            </a>
            {src.searchUrl && (
              <a
                href={src.searchUrl.replace("{query}", "pdf")}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize:       "10px",
                  padding:        "3px 8px",
                  borderRadius:   "5px",
                  background:     "rgba(168,85,247,0.12)",
                  color:          "#c4b5fd",
                  border:         "1px solid rgba(168,85,247,0.22)",
                  textDecoration: "none",
                  whiteSpace:     "nowrap",
                }}
              >
                🔍 खोजी
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
