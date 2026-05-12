interface RoadmapItem {
  label: string;
  status: "planned" | "soon" | "blocked";
}

interface VaultStubProps {
  icon: string;
  title: string;
  description: string;
  roadmap: RoadmapItem[];
}

export function VaultStub({ icon, title, description, roadmap }: VaultStubProps) {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="text-4xl mb-3">{icon}</div>
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        <p className="text-zinc-500 text-sm leading-relaxed">{description}</p>
      </div>

      <div className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-xl mb-6">
        <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
        <div>
          <p className="text-sm text-yellow-400 font-medium">In Roadmap</p>
          <p className="text-xs text-zinc-600 mt-0.5">Building incrementally — check back soon</p>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">What&apos;s Being Built</h2>
        <div className="space-y-1.5">
          {roadmap.map(item => (
            <div key={item.label} className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm">
              <span className={
                item.status === "soon"    ? "text-yellow-500" :
                item.status === "blocked" ? "text-red-500"    :
                                            "text-zinc-700"
              }>
                {item.status === "soon" ? "◎" : item.status === "blocked" ? "✕" : "○"}
              </span>
              <span className="text-zinc-400 flex-1">{item.label}</span>
              {item.status === "soon"    && <span className="text-xs text-yellow-600">Soon</span>}
              {item.status === "blocked" && <span className="text-xs text-red-600">Needs unlock</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
