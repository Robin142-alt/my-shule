import { principalAttendanceActionContracts } from "@/components/school/principal-practical-dashboard";
import {
  assertDashboardActionContract,
  type DashboardActionContract,
} from "@/lib/dashboard/dashboard-action-contract";

export const dashboardActionRegistry: DashboardActionContract[] = principalAttendanceActionContracts
  .map((contract) => {
    const printOrExport =
      contract.printOrExport && contract.printOrExport.toLowerCase() !== "none"
        ? contract.printOrExport
        : contract.actionType === "PRINT_PREVIEW" || contract.actionType === "EXPORT_FILE"
          ? contract.destination
          : contract.printOrExport;

    return {
      ...contract,
      enabled: true,
      workspace: contract.actionType === "OPEN_WORKSPACE" ? contract.destination : undefined,
      modal: contract.actionType === "OPEN_MODAL" || contract.actionType === "SEND_COMMUNICATION" ? contract.destination : undefined,
      printOrExport,
    };
  })
  .map((contract) => assertDashboardActionContract(contract as DashboardActionContract));

export function findDashboardActionContract(id: string): DashboardActionContract | undefined {
  return dashboardActionRegistry.find((contract) => contract.id === id);
}
