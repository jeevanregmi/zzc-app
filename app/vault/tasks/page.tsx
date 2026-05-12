import { VaultStub } from "../../../components/vault/VaultStub";

export default function TasksPage() {
  return (
    <VaultStub
      icon="✅"
      title="Tasks"
      description="Founder task management system — track content production, feature development, business operations, and growth experiments from a single command interface."
      roadmap={[
        { label: "Task creation with priority, category, due date", status: "soon" },
        { label: "Kanban view — backlog / in progress / done", status: "soon" },
        { label: "Content production task templates", status: "soon" },
        { label: "Link tasks to content ideas and scripts", status: "planned" },
        { label: "Weekly sprint planning view", status: "planned" },
        { label: "Recurring task automation", status: "planned" },
        { label: "Firebase-backed persistence", status: "planned" },
        { label: "Team collaboration (multi-user tasks)", status: "planned" },
      ]}
    />
  );
}
