"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PaymentIntegrationSummary, paymentIntegrationQueryKey } from "./payment-integration-summary";
import { paymentSetupFilters, paymentSetupStatus } from "@/components/school/accountant/payment-setup-summary";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import {
  getIntegrationHealth,
  getIntegrationCallbacks,
  simulateIntegrationPayment,
  type IntegrationCallbacks,
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
} from "@/lib/finance/payment-channels-client";

export function PaymentGatewaysWorkspace() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<CollectionChannelRevision | null>(
    null,
  );
  const [mode, setMode] = useState("statement"),
    [environment, setEnvironment] = useState("production");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [trustMode,setTrustMode] = useState('daraja_direct');
  const [callbacks,setCallbacks] = useState<IntegrationCallbacks | null>(null);
  const [simulating,setSimulating] = useState<CollectionChannelRevision | null>(null);
  const [offset, setOffset] = useState(0),
    [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const channels = useQuery({ queryKey: [...paymentIntegrationQueryKey, "list", offset, status, search],
    queryFn: () => listPaymentIntegrations(offset, status, search), refetchInterval: 30_000 });
  const catalog = useQuery({ queryKey: [...paymentIntegrationQueryKey, "providers"], queryFn: listIntegrationProviders });
  const rows = channels.data ?? [];
  const providers = catalog.data ?? [];
  const loading = channels.isPending || catalog.isPending;
  const loadError = channels.error?.message || catalog.error?.message;
  async function load() {
    setError("");
    await queryClient.invalidateQueries({ queryKey: paymentIntegrationQueryKey });
  }
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
      setSelected(null);
      setCredentials({});
      setNotice(
        result.last_error ||
          `Channel ${result.status.replaceAll("_", " ")}. ${result.last_test_status === "statement_review_ready" ? "Statement review is ready; no live bank connection was tested." : ""}`,
      );
      await load();
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
    setTrustMode('daraja_direct');
    setError("");
  }
  return (
    <div className="space-y-5">
      <SuperadminPageHeader
        title="School payment integrations"
        description="Connect Principal-approved school accounts, verify providers and manage collection health. Funds settle directly with each school."
      />
      <PaymentIntegrationSummary />
      {(error || loadError) && !selected && (
        <div
          role="alert"
          className="rounded-lg border border-danger-border p-3"
        >
          {error || loadError}
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
      <form className="flex flex-wrap gap-3" onSubmit={(event) => { event.preventDefault(); setSearch(filter.trim()); setOffset(0); }}>
        <label className="flex-1">
          <span className="sr-only">Search integrations</span>
          <input
            className="input-base w-full"
            placeholder="Find school, provider or account"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </label>
        <Button type="submit" variant="secondary">Search all schools</Button>
        <label className="flex min-w-0 flex-wrap items-center gap-2"><span>Queue</span>
          <select className="input-base max-w-full" value={status} onChange={(event) => { setStatus(event.target.value); setOffset(0); }}>
            {paymentSetupFilters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void load()}
          disabled={loading || busy}
        >
          Refresh
        </Button>
      </form>
      {loading ? (
        <p role="status">Loading school integrations…</p>
      ) : !loadError && !rows.length ? (
        <p className="rounded-xl border border-border p-6">
          No payment setups match this queue and search. The school Accountant submits
          account details and the Principal approves them before connection.
        </p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rows.map((row) => (
              <article
                key={row.id}
                className="space-y-3 rounded-xl border border-border bg-surface p-5"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <h2 className="font-semibold">
                    {row.school_name || row.tenant_id}
                  </h2>
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-xs">
                    {paymentSetupStatus(row)}
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
                <p className="text-sm">{row.environment === 'sandbox' ? 'Sandbox — verifies matching only; no live fee credit' : row.environment === 'production' ? 'Production' : 'Environment not selected'}</p>
                <p className="text-sm text-muted">Requested {new Date(row.created_at).toLocaleString()} · {row.reason}</p>
                {row.decision_reason && <p className="text-sm">Principal decision: {row.decision_reason}</p>}
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
                  {row.connection_mode === 'daraja' && row.credentials_configured && <Button variant="secondary" disabled={busy}
                    onClick={async () => {setBusy(true);setError('');try {setCallbacks(await getIntegrationCallbacks(row));}
                      catch(cause){setError(cause instanceof Error?cause.message:'Callback URLs unavailable');} finally{setBusy(false);} }}>
                    Callback URLs
                  </Button>}
                  {row.status === 'active' && row.environment === 'sandbox' && <Button variant="secondary" disabled={busy}
                    onClick={()=>{setError('');setSimulating(row);}}>Simulate sandbox payment</Button>}
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
                      callback_trust_mode: trustMode,
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
                  <label className="block space-y-1"><span>Callback authentication</span>
                    <select className="input-base w-full" value={trustMode} onChange={e=>setTrustMode(e.target.value)}>
                      <option value="daraja_direct">Direct Safaricom callbacks + transaction verification</option>
                      <option value="edge_signed">Gateway-signed callbacks + transaction verification</option>
                    </select>
                  </label>}
                {environment === 'sandbox' && <p className="text-sm">No live balance is changed. Use the built-in simulator to isolate schools sharing a sandbox shortcode. Only one school may test a shared shortcode per 15-minute window.</p>}
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
      <Modal open={Boolean(callbacks)} title="Canonical provider callback URLs" onClose={()=>setCallbacks(null)}>
        {callbacks && <div className="space-y-4">
          <p>{callbacks.environment} · {callbacks.trust_mode}. These URLs contain secret callback tokens. Share only with Safaricom or your authenticated gateway.</p>
          <label className="block">Confirmation URL<textarea readOnly className="input-base w-full break-all" rows={4} value={callbacks.confirmation_url}/></label>
          <label className="block">Validation URL<textarea readOnly className="input-base w-full break-all" rows={4} value={callbacks.validation_url}/></label>
          <p>Check connection registers these exact URLs. Safaricom must enable validation for the Paybill. URL registration alone does not prove that verification or settlement works.</p>
        </div>}
      </Modal>
      <Modal open={Boolean(simulating)} title="Safaricom sandbox payment" onClose={()=>{if(!busy)setSimulating(null);}}>
        {simulating && <form className="space-y-4" onSubmit={async e=>{
          e.preventDefault();const form = new FormData(e.currentTarget);setBusy(true);setError('');
          try{const result = await simulateIntegrationPayment(simulating,Object.fromEntries(form.entries()));setNotice(`${result.message} Test reference: ${result.provider_reference}`);setSimulating(null);}
          catch(cause){setError(cause instanceof Error?cause.message:'Simulation failed');}finally{setBusy(false);}
        }}>
          <p>Tests {simulating.school_name || simulating.tenant_id} only. No live payment, receipt or balance is created. Safaricom must return verifiable transaction evidence; unavailable evidence stays in review.</p>
          {error && <p role="alert" className="text-danger">{error}</p>}
          <label className="block">Student admission / invoice reference<input required name="account_reference" maxLength={120} className="input-base w-full"/></label>
          <label className="block">Amount (KES)<input required name="amount" type="number" min="1" max="999999" step="1" defaultValue="1" className="input-base w-full"/></label>
          <label className="block">Daraja test MSISDN<input required name="msisdn" pattern="254[17][0-9]{8}" placeholder="2547…" className="input-base w-full"/></label>
          <Button type="submit" disabled={busy}>{busy?'Requesting simulation…':'Send sandbox simulation'}</Button>
        </form>}
      </Modal>
    </div>
  );
}
