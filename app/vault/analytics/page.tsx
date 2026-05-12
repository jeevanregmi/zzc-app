import { VaultStub } from "../../../components/vault/VaultStub";

export default function AnalyticsPage() {
  return (
    <VaultStub
      icon="📈"
      title="Analytics"
      description="Platform intelligence — traffic, engagement, calculator usage, AI conversion rates, and user journey tracking across the entire ZZC public platform."
      roadmap={[
        { label: "Page view tracking (Cloudflare Web Analytics)", status: "soon" },
        { label: "Calculator usage events — which tools, inputs, outputs", status: "soon" },
        { label: "AI recommendation conversion rate", status: "soon" },
        { label: "Traffic sources — UTM, referrers, social", status: "planned" },
        { label: "Mobile vs desktop breakdown (Nepal-specific)", status: "planned" },
        { label: "Scheme popularity heatmap", status: "planned" },
        { label: "Funnel: homepage → calculator → recommend → vault", status: "planned" },
        { label: "Real-time visitor dashboard", status: "planned" },
      ]}
    />
  );
}
