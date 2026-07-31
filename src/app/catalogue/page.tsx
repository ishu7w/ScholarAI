import { getDataSource } from "@/lib/datasource";
import CatalogueView from "./CatalogueView";

export default async function CataloguePage() {
  const ds = await getDataSource();
  const scholarships = await ds.getScholarships();
  return <CatalogueView scholarships={scholarships} />;
}
