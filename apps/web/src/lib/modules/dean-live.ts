import type { LiveAuthSession } from "@/lib/dashboard/api-client";
import { generateLiveDeanDataset, type DeanDataset } from "./dean-data";

export async function fetchDeanDatasetLive(session: LiveAuthSession): Promise<DeanDataset> {
  if (!session) throw new Error("Unauthorized");
  
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  // In a real implementation, this would make a `fetch` call to a backend API like `/api/dean/dataset`
  return generateLiveDeanDataset();
}
