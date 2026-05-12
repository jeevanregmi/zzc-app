import { VaultStub } from "../../../components/vault/VaultStub";

export default function DocumentsPage() {
  return (
    <VaultStub
      icon="📄"
      title="Documents"
      description="Secure document vault — contracts, legal agreements, strategy docs, AI research notes, and founder journal. All in one private, searchable archive."
      roadmap={[
        { label: "Document upload (PDF, DOCX, MD) to Firebase Storage", status: "soon" },
        { label: "Document viewer with full-text display", status: "soon" },
        { label: "Categories: Legal / Strategy / Finance / Content / Research", status: "soon" },
        { label: "Founder journal — private notes with AI search", status: "planned" },
        { label: "AI-powered document summary on upload", status: "planned" },
        { label: "Version history — compare doc revisions", status: "planned" },
        { label: "Tag system for cross-document discovery", status: "planned" },
      ]}
    />
  );
}
