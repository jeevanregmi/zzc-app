import { VaultStub } from "../../../components/vault/VaultStub";

export default function AIQueuePage() {
  return (
    <VaultStub
      icon="🤖"
      title="AI Queue"
      description="AI job orchestration hub — schedule and monitor content generation jobs, batch script creation, thumbnail prompt batches, and automated data ingestion pipelines."
      roadmap={[
        { label: "Job queue viewer — pending / running / completed / failed", status: "soon" },
        { label: "Batch script generation — generate 5 scripts in one trigger", status: "soon" },
        { label: "Scheduled generation — auto-generate weekly content briefs", status: "planned" },
        { label: "Job retry and error inspection UI", status: "planned" },
        { label: "Token usage per job — cost visibility", status: "planned" },
        { label: "Cron trigger management — view/edit scheduled workers", status: "planned" },
        { label: "Data ingestion jobs — NRB rates, scheme updates", status: "blocked" },
      ]}
    />
  );
}
