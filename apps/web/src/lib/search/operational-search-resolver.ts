import {
  operationalSearchRegistry,
  type OperationalSearchRecord,
} from "@/lib/search/operational-search-registry";
import {
  resolveSearchPolicy,
  type OperationalRoleKey,
  type SearchAccessPolicy,
} from "@/lib/search/search-access-policy";

export type OperationalSearchContext = {
  role: string | null | undefined;
  capabilities?: readonly string[];
  workspaceScopeTags?: readonly string[];
  records?: readonly OperationalSearchRecord[];
};

export type ResolvedOperationalSearchRecord = OperationalSearchRecord & {
  mode: SearchAccessPolicy["mode"];
  roleKey: OperationalRoleKey;
};

const feeBalanceSearchRoles = new Set([
  "principal",
  "deputy-principal",
  "secretary",
  "accountant",
  "bursar",
  "parent",
  "superadmin",
  "platform-owner",
]);

function matchesQuery(record: OperationalSearchRecord, query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  return `${record.typeLabel} ${record.title} ${record.detail} ${record.keywords}`
    .toLowerCase()
    .includes(normalized);
}

function matchesScope(record: OperationalSearchRecord, policy: SearchAccessPolicy, workspaceScopeTags: readonly string[]) {
  const allowedScopeTags = new Set([...policy.scopeTags, ...workspaceScopeTags]);

  if (allowedScopeTags.has("school-wide") || allowedScopeTags.has("platform")) {
    return true;
  }

  return record.scopeTags.some((tag) => allowedScopeTags.has(tag));
}

export function resolveOperationalSearch(
  query: string,
  context: OperationalSearchContext,
): ResolvedOperationalSearchRecord[] {
  const policy = resolveSearchPolicy(context.role, context.capabilities);
  const allowedEntitySet = new Set(policy.allowedEntities);
  const forbiddenEntitySet = new Set(policy.forbiddenEntities);
  const workspaceScopeTags = context.workspaceScopeTags ?? [];

  const records = context.records ?? operationalSearchRegistry;

  return records
    .filter((record) => matchesQuery(record, query))
    .filter((record) => allowedEntitySet.has(record.type))
    .filter((record) => !forbiddenEntitySet.has(record.type))
    .filter((record) => matchesScope(record, policy, workspaceScopeTags))
    .map((record) => ({
      ...record,
      roleKey: policy.roleKey,
      mode: policy.mode,
      actions: record.actions.filter((action) => {
        if (action.capability === "finance:view" && !feeBalanceSearchRoles.has(policy.roleKey)) {
          return false;
        }
        if (!action.capability || !context.capabilities?.length) {
          return true;
        }

        return context.capabilities.includes(action.capability)
          || policy.mode.startsWith("GLOBAL")
          || policy.mode.startsWith("PLATFORM");
      }),
    }));
}
