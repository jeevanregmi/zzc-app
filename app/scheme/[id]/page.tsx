import SchemeDetail from "./SchemeDetail";

export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const res = await fetch(
      "https://firestore.googleapis.com/v1/projects/zeneration-z-chautari/databases/(default)/documents/structuredSchemes?pageSize=200",
      { cache: "no-store" }
    );
    const data = await res.json();
    const documents: any[] = data.documents ?? [];
    return documents.map((d) => ({ id: d.name.split("/").pop() as string }));
  } catch {
    return [];
  }
}

export default async function SchemePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SchemeDetail id={id} />;
}
