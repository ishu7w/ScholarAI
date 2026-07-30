import { notFound } from "next/navigation";
import { SCHOLARSHIPS } from "@/lib/data";
import ScholarshipDetail from "./detail";

export function generateStaticParams() {
  return SCHOLARSHIPS.map((s) => ({ id: s.id }));
}

export default async function ScholarshipPage({
  params,
}: PageProps<"/scholarships/[id]">) {
  const { id } = await params;
  const scholarship = SCHOLARSHIPS.find((s) => s.id === id);
  if (!scholarship) notFound();

  return <ScholarshipDetail scholarshipId={id} />;
}
