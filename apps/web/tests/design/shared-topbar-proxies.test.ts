import type { NextRequest } from "next/server";

import { GET as getApprovals, POST as mutateApproval } from "@/app/api/approvals/[[...path]]/route";
import { GET as getDashboard } from "@/app/api/dashboard/[[...path]]/route";
import { GET as getNotifications, PATCH as mutateNotification } from "@/app/api/v1/notifications/[[...path]]/route";
import { GET as getTasks, PATCH as mutateTask } from "@/app/api/tasks/[[...path]]/route";

const mockProxySchoolApiRequest = jest.fn();

jest.mock("@/lib/dashboard/server-api-proxy", () => ({
  proxySchoolApiRequest: (...args: unknown[]) => mockProxySchoolApiRequest(...args),
}));

describe("shared topbar session proxies", () => {
  const request = {} as NextRequest;

  beforeEach(() => {
    mockProxySchoolApiRequest.mockReset().mockResolvedValue({ status: 204 } as Response);
  });

  it.each([
    [getNotifications, { params: { path: [] } }, "/v1/notifications"],
    [mutateNotification, { params: { path: ["notice-1", "read"] } }, "/v1/notifications"],
    [getTasks, { params: { path: [] } }, "/tasks"],
    [mutateTask, { params: { path: ["task-1", "complete"] } }, "/tasks"],
    [getApprovals, { params: { path: [] } }, "/approvals"],
    [mutateApproval, { params: { path: ["approval-1", "approve"] } }, "/approvals"],
    [getDashboard, { params: { path: ["feed"] } }, "/dashboard"],
  ])("routes through the governed school-session proxy to %s", async (handler, context, prefix) => {
    await handler(request, context);
    expect(mockProxySchoolApiRequest).toHaveBeenCalledWith(request, context, prefix);
  });
});
