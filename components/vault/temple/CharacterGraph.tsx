"use client";

// Radial SVG relationship graph — pure React/SVG, no external deps.
// Center node = selected character.
// Ring nodes = direct relations (other characters + atom/scripture refs).
// Edge labels = relation type in Nepali.

import type { SpiritualCharacter, SpiritualRelationship, LeelaRelationType } from "../../../lib/types/temple-vault";

type CharDoc = SpiritualCharacter & { id: string };
type RelDoc  = SpiritualRelationship & { id: string };

// ── Relation labels ───────────────────────────────────────────────────────────

const REL_LABELS: Record<LeelaRelationType, string> = {
  participated_in: "सहभागी",
  teaches:         "सिकाउँछ",
  loves:           "प्रेम",
  embodies:        "स्वरूप",
  created:         "रचना",
  destroyed:       "नाश",
  opposes:         "विरोध",
  blesses:         "आशीर्वाद",
  incarnation_of:  "अवतार",
  set_in:          "स्थान",
  reveals:         "प्रकट",
  companion_of:    "साथी",
  composed:        "रचना",
};

// ── Node colors by relation type ──────────────────────────────────────────────

const REL_COLORS: Record<LeelaRelationType, string> = {
  loves:           "#f472b6",
  blesses:         "#34d399",
  incarnation_of:  "#a78bfa",
  teaches:         "#60a5fa",
  reveals:         "#60a5fa",
  composed:        "#60a5fa",
  companion_of:    "#fbbf24",
  participated_in: "#94a3b8",
  embodies:        "#c084fc",
  created:         "#86efac",
  destroyed:       "#f87171",
  opposes:         "#f87171",
  set_in:          "#94a3b8",
};

interface NodeData {
  id:      string;
  label:   string;
  icon:    string;
  nodeType:"character" | "other";
  rel:     RelDoc;
  x:       number;
  y:       number;
  color:   string;
}

interface Props {
  center:        CharDoc;
  allCharacters: CharDoc[];
  relationships: RelDoc[];
  onNodeClick?:  (characterId: string) => void;
}

export function CharacterGraph({ center, allCharacters, relationships, onNodeClick }: Props) {
  const W = 400, H = 400;
  const cx = W / 2, cy = H / 2;
  const RING_R = 145;
  const CENTER_R = 36;
  const NODE_R = 26;

  // Edges connected to center character
  const edges = relationships.filter(
    r => r.fromId === center.id || r.toId === center.id,
  );

  // Build ring nodes
  const ringNodes: NodeData[] = edges.map((rel, i) => {
    const angle = (2 * Math.PI * i) / edges.length - Math.PI / 2;
    const x = cx + RING_R * Math.cos(angle);
    const y = cy + RING_R * Math.sin(angle);

    const otherId = rel.fromId === center.id ? rel.toId : rel.fromId;
    const otherChar = allCharacters.find(c => c.id === otherId);
    const label = otherChar
      ? (otherChar.primaryName?.nepali ?? otherChar.primaryName?.sanskrit ?? "?")
      : (rel.toName ?? rel.fromName ?? otherId.replace(/^(seed_|rel_)/, "").slice(0, 8));

    const icon = otherChar?.icon ?? (rel.toType === "scripture" ? "📖" : rel.toType === "atom" ? "⚛" : "✦");
    const color = REL_COLORS[rel.relationType] ?? "#94a3b8";

    return { id: otherId, label, icon, nodeType: otherChar ? "character" : "other", rel, x, y, color };
  });

  // Mid-point for edge label
  function edgeMid(nx: number, ny: number) {
    return { x: (cx + nx) / 2, y: (cy + ny) / 2 };
  }

  if (edges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-zinc-700 text-xs space-y-2">
        <span className="text-2xl opacity-30">◌</span>
        <span>अभी कुनै relationship seed गरिएको छैन</span>
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full max-w-sm mx-auto"
      style={{ filter: "drop-shadow(0 0 24px rgba(99,102,241,0.08))" }}
      aria-label={`${center.primaryName?.nepali ?? "Character"} relationship graph`}
    >
      {/* Faint guide circle */}
      <circle cx={cx} cy={cy} r={RING_R} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

      {/* Edges */}
      {ringNodes.map(n => {
        const mid = edgeMid(n.x, n.y);
        const color = n.color;
        return (
          <g key={`edge-${n.rel.id}`}>
            <line
              x1={cx} y1={cy} x2={n.x} y2={n.y}
              stroke={color}
              strokeWidth="1"
              strokeOpacity="0.25"
              strokeDasharray={n.nodeType === "other" ? "3 3" : undefined}
            />
            {/* Relation label at midpoint */}
            <text
              x={mid.x} y={mid.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="7"
              fill={color}
              fillOpacity="0.6"
              style={{ fontFamily: "inherit", pointerEvents: "none" }}
            >
              {REL_LABELS[n.rel.relationType] ?? n.rel.relationType}
            </text>
          </g>
        );
      })}

      {/* Ring nodes */}
      {ringNodes.map(n => (
        <g
          key={`node-${n.id}`}
          transform={`translate(${n.x}, ${n.y})`}
          onClick={() => n.nodeType === "character" && onNodeClick?.(n.id)}
          style={{ cursor: n.nodeType === "character" ? "pointer" : "default" }}
          role={n.nodeType === "character" ? "button" : undefined}
          aria-label={n.label}
        >
          <circle
            r={NODE_R}
            fill="rgba(15,15,30,0.9)"
            stroke={n.color}
            strokeWidth="1"
            strokeOpacity="0.45"
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={n.nodeType === "character" ? "15" : "12"}
            style={{ pointerEvents: "none" }}
            dy="-4"
          >
            {n.icon}
          </text>
          <text
            textAnchor="middle"
            y={NODE_R - 4}
            fontSize="7.5"
            fill="rgba(255,255,255,0.45)"
            style={{ pointerEvents: "none", fontFamily: "inherit" }}
          >
            {n.label.length > 8 ? n.label.slice(0, 7) + "…" : n.label}
          </text>
        </g>
      ))}

      {/* Center node */}
      <circle
        cx={cx} cy={cy}
        r={CENTER_R}
        fill="rgba(20,15,50,0.95)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1.5"
      />
      <text
        x={cx} y={cy - 5}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="22"
        style={{ pointerEvents: "none" }}
      >
        {center.icon ?? "✦"}
      </text>
      <text
        x={cx} y={cy + CENTER_R - 6}
        textAnchor="middle"
        fontSize="8"
        fill="rgba(255,255,255,0.5)"
        style={{ pointerEvents: "none", fontFamily: "inherit" }}
      >
        {(center.primaryName?.nepali ?? center.primaryName?.sanskrit ?? "").slice(0, 10)}
      </text>
    </svg>
  );
}
