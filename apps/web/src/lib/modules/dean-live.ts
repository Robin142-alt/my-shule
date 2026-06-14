import type { LiveAuthSession } from "@/lib/dashboard/api-client";
import { type DeanDataset } from "./dean-data";
import { requestSchoolApiProxy } from "@/lib/dashboard/school-api-proxy-client";

export async function fetchDeanDatasetLive(session: LiveAuthSession): Promise<DeanDataset> {
  if (!session) throw new Error("Unauthorized");
  
  try {
    const data = await requestSchoolApiProxy<DeanDataset>("/academics/dean-dataset", {
      method: "GET",
      unwrapEnvelope: false
    });
    return (data as any).data || data;
  } catch (error) {
    throw new Error("Failed to load academic data. The backend service may be down.");
  }
}
