"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import {
  getIntegrationHealth,
  type CollectionHealth,
} from "@/lib/finance/payment-channels-client";
import {
  activatePaymentIntegration,
  connectPaymentIntegration,
  listIntegrationProviders,
  listPaymentIntegrations,
  suspendPaymentIntegration,
  testPaymentIntegration,
  type CollectionChannelRevision,
  type CollectionProvider,
} from "@/lib/finance/payment-channels-client";

export function PaymentGatewaysWorkspace() {
  const [rows, setRows] = useState<CollectionChannelRevision[]>([]);
  const [providers, setProviders] = useState<CollectionProvider[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<CollectionChannelRevision | null>(
    null,
  );
  const [mode, setMode] = useState("statement"),
    [environment, setEnvironment] = useState("production");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [offset, setOffset] = useState(0),
    [filter, setFilter] = useState("");
  const [suspending, setSuspending] = useState(false),
    [reason, setReason] = useState("");
  const [health, setHealth] = useState<Record<string, CollectionHealth>>({});
  const [healthLoading, setHealthLoading] = useState<string | null>(null);
  async function loadHealth(row: CollectionChannelRevision) {
    setHealthLoading(row.id);
    setError("");
    try {
      const result = await getIntegrationHealth(row);
      setHealth((current) => ({ ...current, [row.id]: result }));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Integration health could not be loaded.",
      );
    } finally {
      setHealthLoading(null);
    }
  }
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [channels, catalog] = await Promise.all([
        listPaymentIntegrations(offset),
        listIntegrationProviders(),
      ]);
      setRows(channels);
      setProviders(catalog);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load payment integrations.",
      );
    } finally {
      setLoading(false);
    }
  }, [offset]);
  useEffect(() => {
    void load();
  }, [load]);
  const provider = providers.find(
    (item) => item.code === selected?.provider_code,
  );
  async function perform(action: () => Promise<CollectionChannelRevision>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await action();
      setRows((current) =>
        current.map((row) =>
          row.id === result.id ? { ...row, ...result } : row,
        ),
      );
      setSelected(null);
      setCredentials({});
      setNotice(
        result.last_error ||
          `Channel ${result.status.replaceAll("_", " ")}. ${result.last_test_status === "statement_review_ready" ? "Statement review is ready; no live bank connection was tested." : ""}`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to update the payment channel.",
      );
    } finally {
      setBusy(false);
    }
  }
  function open(row: CollectionChannelRevision) {
    setSelected(row);
    setSuspending(false);
    setMode(
      row.connection_mode ||
        providers.find((item) => item.code === row.provider_code)
          ?.connection_modes[0] ||
        "statement",
    );
    setEnvironment(row.environment || "production");
    setCredentials({});
    setError("");
  }
  return (
    <div className="space-y-5">
      <SuperadminPageHeader
        title="School payment integrations"
        description="Connect Principal-approved school accounts, verify providers and manage collection health. Funds settle directly with each school."
      />
      {error && !selected && (
        <div
          role="alert"
          className="rounded-lg border border-danger-border p-3"
        >
          {error}
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-surface-muted p-3">
          {notice}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <label className="flex-1">
          <span className="sr-only">Search integrations</span>
          <input
            className="input-base w-full"
            placeholder="Find school, provider or account"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </label>
        <Button
          variant="secondary"
          onClick={() => void load()}
          disabled={loading || busy}
        >
          Refresh
        </Button>
      </div>
      {loading ? (
        <p role="status">Loading school integrations…</p>
      ) : !rows.length ? (
        <p className="rounded-xl border border-border p-6">
          No payment setup requests on this page. The school Accountant submits
          account details and the Principal approves them before connection.
        </p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rows
            .filter((row) =>
              `${row.school_name} ${row.provider_code} ${row.account_number} ${row.display_name}`
                .toLowerCase()
                .includes(filter.toLowerCase()),
            )
            .map((row) => (
              <article
                key={row.id}
                className="space-y-3 rounded-xl border border-border bg-surface p-5"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <h2 className="font-semibold">
                    {row.school_name || row.tenant_id}
                  </h2>
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-xs">
                    {row.status.replaceAll("_", " ")}
                  </span>
                </div>
                <p>
                  {row.display_name} · {row.provider_code}
                </p>
                <p>
                  {row.account_name}{" "}
                  <span className="font-mono">{row.account_number}</span>
                </p>
                <p className="text-sm text-muted">
                  {row.connection_mode === "statement"
                    ? "Statement reconciliation — Principal confirms each entry"
                    : row.connection_mode === "daraja"
                      ? "Daraja automatic collections"
                      : "Connection method not selected"}
                </p>
                {row.last_test_status && (
                  <p className="text-sm">
                    Last check: {row.last_test_status.replaceAll("_", " ")} ·{" "}
                    {row.last_tested_at
                      ? new Date(row.last_tested_at).toLocaleString()
                      : "Not checked"}
                  </p>
                )}
                {row.last_error && (
                  <p className="text-sm text-danger">{row.last_error}</p>
                )}
                {row.paybill_number && (
                  <p>Bank Paybill: {row.paybill_number}</p>
                )}
                {row.activated_at && (
                  <Button
                    variant="ghost"
                    disabled={Boolean(healthLoading)}
                    onClick={() => void loadHealth(row)}
                  >
                    {healthLoading === row.id
                      ? "Loading health…"
                      : "View collection health"}
                  </Button>
                )}
                {health[row.id] && (
                  <dl className="grid grid-cols-2 gap-2 rounded-lg bg-surface-muted p-3 text-sm">
                    <div>
                      <dt>Unmatched payments</dt>
                      <dd>{health[row.id].unmatched_count}</dd>
                    </div>
                    <div>
                      <dt>Statement reviews</dt>
                      <dd>{health[row.id].pending_review_count}</dd>
                    </div>
                    <div>
                      <dt>Delayed confirmations</dt>
                      <dd>{health[row.id].delayed_confirmation_count}</dd>
                    </div>
                    <div>
                      <dt>Provider exceptions</dt>
                      <dd>{health[row.id].provider_exception_count}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt>Last collection received</dt>
                      <dd>
                        {health[row.id].last_collection_at
                          ? new Date(
                              health[row.id].last_collection_at!,
                            ).toLocaleString()
                          : "No collection received yet"}
                      </dd>
                    </div>
                  </dl>
                )}
                <div className="flex flex-wrap gap-2">
                  {["approved", "connecting", "ready"].includes(row.status) && (
                    <Button disabled={busy} onClick={() => open(row)}>
                      Connect channel
                    </Button>
                  )}
                  {["connecting", "ready"].includes(row.status) && (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        void perform(() => testPaymentIntegration(row))
                      }
                    >
                      {busy ? "Working…" : "Check connection"}
                    </Button>
                  )}
                  {row.status === "ready" && (
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void perform(() => activatePaymentIntegration(row))
                      }
                    >
                      Activate channel
                    </Button>
                  )}
                  {row.status === "active" && (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        setSelected(row);
                        setSuspending(true);
                        setReason("");
                      }}
                    >
                      Suspend channel
                    </Button>
                  )}
                </div>
              </article>
            ))}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          disabled={offset === 0 || loading}
          onClick={() => setOffset(Math.max(0, offset - 50))}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={rows.length < 50 || loading}
          onClick={() => setOffset(offset + 50)}
        >
          Next
        </Button>
      </div>
      <Modal
        open={Boolean(selected)}
        title={
          suspending
            ? "Suspend school payment channel"
            : "Connect approved payment channel"
        }
        onClose={() => {
          if (!busy) {
            setSelected(null);
            setCredentials({});
          }
        }}
      >
        {selected && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void perform(() =>
                suspending
                  ? suspendPaymentIntegration(selected, reason)
                  : connectPaymentIntegration(selected, {
                      connection_mode: mode,
                      environment,
                      credentials: mode === "statement" ? {} : credentials,
                    }),
              );
            }}
          >
            <p>
              {selected.account_name} ·{" "}
              <span className="font-mono">{selected.account_number}</span>
            </p>
            {error && (
              <p role="alert" className="text-danger">
                {error}
              </p>
            )}
            {suspending ? (
              <label className="block space-y-1">
                <span>Reason for suspension</span>
                <textarea
                  required
                  minLength={5}
                  maxLength={1000}
                  className="input-base w-full"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
            ) : (
              <>
                <label className="block space-y-1">
                  <span>Connection method</span>
                  <select
                    className="input-base w-full"
                    value={mode}
                    onChange={(event) => {
                      setMode(event.target.value);
                      setCredentials({});
                    }}
                  >
                    {provider?.connection_modes.map((value) => (
                      <option key={value} value={value}>
                        {value === "statement"
                          ? "Statement reconciliation"
                          : "Daraja automatic collections"}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-sm text-muted">{provider?.description}</p>
                <label className="block space-y-1">
                  <span>Environment</span>
                  <select
                    className="input-base w-full"
                    value={environment}
                    onChange={(event) => setEnvironment(event.target.value)}
                  >
                    <option value="production">Production</option>
                    <option value="sandbox">Sandbox — testing only</option>
                  </select>
                </label>
                {mode === "daraja" &&
                  provider?.credential_fields.map((field) => (
                    <label key={field.key} className="block space-y-1">
                      <span>{field.label}</span>
                      <input
                        className="input-base w-full"
                        type={field.secret ? "password" : "text"}
                        autoComplete="off"
                        required={field.required}
                        maxLength={8192}
                        value={credentials[field.key] || ""}
                        onChange={(event) =>
                          setCredentials({
                            ...credentials,
                            [field.key]: event.target.value,
                          })
                        }
                      />
                    </label>
                  ))}
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setSelected(null);
                  setCredentials({});
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy
                  ? "Saving…"
                  : suspending
                    ? "Confirm suspension"
                    : "Save connection"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
