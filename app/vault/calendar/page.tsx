import { VaultStub } from "../../../components/vault/VaultStub";

export default function CalendarPage() {
  return (
    <VaultStub
      icon="📅"
      title="Content Calendar"
      description="Unified publishing calendar — schedule YouTube videos, Shorts, Instagram Reels, and Facebook posts across all platforms. Visualize your content pipeline week by week."
      roadmap={[
        { label: "Monthly/weekly calendar grid view", status: "soon" },
        { label: "Drag-and-drop post scheduling", status: "soon" },
        { label: "Platform color coding — YT / IG / TikTok / FB", status: "soon" },
        { label: "Content status pipeline — Idea → Script → Filming → Editing → Published", status: "planned" },
        { label: "Optimal posting time recommendations (NST)", status: "planned" },
        { label: "Connect to Content Pipeline ideas/scripts", status: "planned" },
        { label: "Publishing reminders and notifications", status: "planned" },
        { label: "Auto-populate from AI Script Generator", status: "planned" },
      ]}
    />
  );
}
