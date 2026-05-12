import { VaultStub } from "../../../components/vault/VaultStub";

export default function FinancePage() {
  return (
    <VaultStub
      icon="💰"
      title="Finance"
      description="Company financial intelligence — revenue tracking, expense management, AI API cost monitoring, budget planning, and ROI analysis for the ZZC platform."
      roadmap={[
        { label: "Monthly revenue tracking dashboard", status: "soon" },
        { label: "AI API cost breakdown (Bedrock per-request costs)", status: "soon" },
        { label: "Expense categories — infra, tools, content, ads", status: "soon" },
        { label: "Budget vs actual comparison", status: "planned" },
        { label: "ROI calculator — content cost vs traffic value", status: "planned" },
        { label: "Runway calculator — burn rate vs reserves", status: "planned" },
        { label: "Invoicing system (future monetization)", status: "planned" },
        { label: "Payment processing integration", status: "blocked" },
      ]}
    />
  );
}
