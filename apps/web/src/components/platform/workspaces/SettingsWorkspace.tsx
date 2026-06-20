/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, type ReactNode } from "react";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { updatePlatformSettings, fetchPlatformSettings } from "@/lib/platform/school-onboarding-client";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  KeyRound,
  LayoutGrid,
  Mail,
  Server,
  Settings,
  Shield,
  UserPlus,
  Wrench,
} from "lucide-react";

/* ── Helpers ────────────────────────────────────────────── */

function SettingSection({
  icon,
  title,
  description,
  children,
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`overflow-hidden ${className ?? ""}`}>
      <div className="flex items-start gap-3 border-b border-border bg-surface-soft px-5 py-4">
        <span className="mt-0.5 shrink-0 text-accent">{icon}</span>
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <p className="mt-0.5 text-xs leading-5 text-muted">{description}</p>
        </div>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </Card>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-semibold text-foreground">{label}</span>
      {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      {children}
    </label>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-border bg-surface-soft px-4 py-3">
      <div>
        <p className="text-[13px] font-semibold text-foreground">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-accent" : "bg-border"}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60";

const selectCls = `${inputCls} appearance-none`;

/* ── Default values ─────────────────────────────────────── */

const defaultSettings = {
  /* Platform Identity */
  platformName: "MyShule",
  platformTagline: "School management made simple",
  platformLogoUrl: "",
  supportEmail: "support@myshule.com",
  supportPhone: "",

  /* Default School Settings */
  defaultAcademicYear: new Date().getFullYear().toString(),
  defaultCountry: "Kenya",
  defaultTimezone: "Africa/Nairobi",
  defaultGradingSystem: "percentage",
  defaultTermStructure: "3-term",

  /* Registration & Onboarding */
  allowSelfRegistration: false,
  requireEmailVerification: true,
  autoAssignCoreModules: true,
  defaultTrialDays: 30,

  /* Session & Security */
  sessionTimeoutMinutes: 60,
  maxLoginAttempts: 5,
  enforce2fa: false,
  passwordMinLength: 8,
  passwordRequireSpecialChar: true,

  /* Email & Notifications */
  emailSenderName: "MyShule",
  emailSenderAddress: "noreply@myshule.com",
  emailProvider: "resend",

  /* Platform Limits */
  maxSchools: 0,
  maxStudentsPerSchool: 0,
  maxStorageMbPerSchool: 0,

  /* Maintenance */
  maintenanceMode: false,
  maintenanceMessage: "MyShule is undergoing scheduled maintenance. We'll be back shortly.",
};

/* ── Component ──────────────────────────────────────────── */

export function SettingsWorkspace() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [s, setS] = useState<any>(defaultSettings);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"enable" | "disable">("enable");
  const [confirmInput, setConfirmInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchPlatformSettings();
        if (!cancelled && data) setS({ ...defaultSettings, ...data });
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  function patch(key: string, value: any) {
    setS((prev: any) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setIsSaving(true);
    try {
      await updatePlatformSettings(s);
      toast.success("Settings saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }

  /* ── Maintenance mode confirmation ────────────────────── */

  function requestMaintenanceToggle() {
    setConfirmAction(s.maintenanceMode ? "disable" : "enable");
    setConfirmInput("");
    setConfirmOpen(true);
  }

  async function executeMaintenanceToggle() {
    const next = confirmAction === "enable";
    setConfirmOpen(false);
    patch("maintenanceMode", next);
    setIsSaving(true);
    try {
      await updatePlatformSettings({ ...s, maintenanceMode: next });
      setS((prev: any) => ({ ...prev, maintenanceMode: next }));
      toast.success(next ? "🔧 Maintenance mode enabled — all tenants are offline" : "✅ Maintenance mode disabled — platform is live");
    } catch (error: any) {
      toast.error(error.message || "Failed to update maintenance mode");
      patch("maintenanceMode", !next);
    } finally {
      setIsSaving(false);
    }
  }

  const confirmPhrase = confirmAction === "enable" ? "ENABLE MAINTENANCE" : "DISABLE MAINTENANCE";
  const confirmValid = confirmInput.trim() === confirmPhrase;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SuperadminPageHeader title="Platform Settings" description="Global platform rules, limits, and configurations." />
        <Card className="flex items-center justify-center p-12">
          <p className="text-sm text-muted animate-pulse">Loading platform settings…</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        title="Platform Settings"
        description="Global platform rules, limits, security policies, and configurations."
        actions={
          <Button disabled={isSaving} onClick={save}>
            {isSaving ? "Saving…" : "Save All Settings"}
          </Button>
        }
      />

      {/* ── Maintenance Banner ──────────────────────────────── */}
      <Card className={`overflow-hidden border-2 ${s.maintenanceMode ? "border-danger/40 bg-danger/5" : "border-success/30 bg-success/5"}`}>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {s.maintenanceMode ? (
              <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">Maintenance Mode</h3>
                <StatusPill label={s.maintenanceMode ? "ACTIVE" : "OFF"} tone={s.maintenanceMode ? "critical" : "ok"} />
              </div>
              <p className="mt-1 text-xs leading-5 text-muted">
                {s.maintenanceMode
                  ? "All school dashboards are offline. Only Super Admins can access the platform."
                  : "Platform is live and operational. All schools can access their dashboards."}
              </p>
            </div>
          </div>
          <Button
            variant={s.maintenanceMode ? "secondary" : "danger"}
            disabled={isSaving}
            onClick={requestMaintenanceToggle}
          >
            {s.maintenanceMode ? "Disable Maintenance" : "Enable Maintenance"}
          </Button>
        </div>
        {s.maintenanceMode ? (
          <div className="border-t border-danger/20 bg-danger/5 px-5 py-3">
            <FieldRow label="Maintenance Message" hint="Shown to all users trying to access school dashboards">
              <input
                className={inputCls}
                value={s.maintenanceMessage ?? ""}
                onChange={(e) => patch("maintenanceMessage", e.target.value)}
              />
            </FieldRow>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Platform Identity ───────────────────────────── */}
        <SettingSection
          icon={<Globe className="h-4 w-4" />}
          title="Platform Identity"
          description="Brand name, support contacts, and public-facing details."
        >
          <FieldRow label="Platform Name">
            <input className={inputCls} value={s.platformName ?? ""} onChange={(e) => patch("platformName", e.target.value)} />
          </FieldRow>
          <FieldRow label="Platform Tagline" hint="Short description shown on the login page">
            <input className={inputCls} value={s.platformTagline ?? ""} onChange={(e) => patch("platformTagline", e.target.value)} />
          </FieldRow>
          <FieldRow label="Logo URL" hint="Direct link to platform logo image (PNG/SVG recommended)">
            <input className={inputCls} value={s.platformLogoUrl ?? ""} placeholder="https://..." onChange={(e) => patch("platformLogoUrl", e.target.value)} />
          </FieldRow>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldRow label="Support Email">
              <input className={inputCls} type="email" value={s.supportEmail ?? ""} onChange={(e) => patch("supportEmail", e.target.value)} />
            </FieldRow>
            <FieldRow label="Support Phone">
              <input className={inputCls} type="tel" value={s.supportPhone ?? ""} placeholder="+254 700 000000" onChange={(e) => patch("supportPhone", e.target.value)} />
            </FieldRow>
          </div>
        </SettingSection>

        {/* ── Default School Settings ────────────────────── */}
        <SettingSection
          icon={<LayoutGrid className="h-4 w-4" />}
          title="Default School Settings"
          description="Defaults applied to newly onboarded schools."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldRow label="Default Academic Year">
              <input className={inputCls} value={s.defaultAcademicYear ?? ""} onChange={(e) => patch("defaultAcademicYear", e.target.value)} />
            </FieldRow>
            <FieldRow label="Default Country">
              <select className={selectCls} value={s.defaultCountry ?? "Kenya"} onChange={(e) => patch("defaultCountry", e.target.value)}>
                <option>Kenya</option>
                <option>Uganda</option>
                <option>Tanzania</option>
                <option>Rwanda</option>
                <option>South Sudan</option>
                <option>Ethiopia</option>
              </select>
            </FieldRow>
          </div>
          <FieldRow label="Default Timezone">
            <select className={selectCls} value={s.defaultTimezone ?? "Africa/Nairobi"} onChange={(e) => patch("defaultTimezone", e.target.value)}>
              <option value="Africa/Nairobi">Africa/Nairobi (EAT, UTC+3)</option>
              <option value="Africa/Kampala">Africa/Kampala (EAT, UTC+3)</option>
              <option value="Africa/Dar_es_Salaam">Africa/Dar es Salaam (EAT, UTC+3)</option>
              <option value="Africa/Kigali">Africa/Kigali (CAT, UTC+2)</option>
              <option value="Africa/Addis_Ababa">Africa/Addis Ababa (EAT, UTC+3)</option>
            </select>
          </FieldRow>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldRow label="Grading System">
              <select className={selectCls} value={s.defaultGradingSystem ?? "percentage"} onChange={(e) => patch("defaultGradingSystem", e.target.value)}>
                <option value="percentage">Percentage (0–100)</option>
                <option value="letter-grade">Letter Grade (A–E)</option>
                <option value="points">Points (1–12)</option>
                <option value="cbc-rubric">CBC Rubric (EE/ME/AE/BE)</option>
              </select>
            </FieldRow>
            <FieldRow label="Term Structure">
              <select className={selectCls} value={s.defaultTermStructure ?? "3-term"} onChange={(e) => patch("defaultTermStructure", e.target.value)}>
                <option value="3-term">3-Term (Jan–Apr, May–Aug, Sep–Dec)</option>
                <option value="2-semester">2-Semester</option>
                <option value="4-quarter">4-Quarter</option>
              </select>
            </FieldRow>
          </div>
        </SettingSection>

        {/* ── Registration & Onboarding ──────────────────── */}
        <SettingSection
          icon={<UserPlus className="h-4 w-4" />}
          title="Registration & Onboarding"
          description="Control how new schools are created and onboarded."
        >
          <ToggleRow
            label="Allow Self-Registration"
            hint="Schools can register themselves without Super Admin action"
            checked={s.allowSelfRegistration ?? false}
            onChange={(v) => patch("allowSelfRegistration", v)}
          />
          <ToggleRow
            label="Require Email Verification"
            hint="Principals must verify email before accessing the dashboard"
            checked={s.requireEmailVerification ?? true}
            onChange={(v) => patch("requireEmailVerification", v)}
          />
          <ToggleRow
            label="Auto-Assign Core Modules"
            hint="Automatically enable core modules for new schools"
            checked={s.autoAssignCoreModules ?? true}
            onChange={(v) => patch("autoAssignCoreModules", v)}
          />
          <FieldRow label="Default Trial Period (Days)" hint="0 = no trial, school gets immediate full access">
            <input className={inputCls} type="number" min="0" max="365" value={s.defaultTrialDays ?? 30} onChange={(e) => patch("defaultTrialDays", Number(e.target.value))} />
          </FieldRow>
        </SettingSection>

        {/* ── Session & Security ─────────────────────────── */}
        <SettingSection
          icon={<Shield className="h-4 w-4" />}
          title="Session & Security"
          description="Authentication, session, and password policies."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldRow label="Session Timeout (Minutes)" hint="Inactive sessions expire after this period">
              <input className={inputCls} type="number" min="5" max="1440" value={s.sessionTimeoutMinutes ?? 60} onChange={(e) => patch("sessionTimeoutMinutes", Number(e.target.value))} />
            </FieldRow>
            <FieldRow label="Max Login Attempts" hint="Account locks after this many failed attempts">
              <input className={inputCls} type="number" min="3" max="20" value={s.maxLoginAttempts ?? 5} onChange={(e) => patch("maxLoginAttempts", Number(e.target.value))} />
            </FieldRow>
          </div>
          <ToggleRow
            label="Enforce Two-Factor Authentication"
            hint="Require 2FA for all admin and staff accounts"
            checked={s.enforce2fa ?? false}
            onChange={(v) => patch("enforce2fa", v)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldRow label="Minimum Password Length">
              <input className={inputCls} type="number" min="6" max="32" value={s.passwordMinLength ?? 8} onChange={(e) => patch("passwordMinLength", Number(e.target.value))} />
            </FieldRow>
            <div className="flex items-end">
              <ToggleRow
                label="Require Special Characters"
                checked={s.passwordRequireSpecialChar ?? true}
                onChange={(v) => patch("passwordRequireSpecialChar", v)}
              />
            </div>
          </div>
        </SettingSection>

        {/* ── Email & Notifications ──────────────────────── */}
        <SettingSection
          icon={<Mail className="h-4 w-4" />}
          title="Email & Notifications"
          description="Outbound email configuration for the platform."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldRow label="Sender Name" hint="Shown as the 'From' name in emails">
              <input className={inputCls} value={s.emailSenderName ?? ""} onChange={(e) => patch("emailSenderName", e.target.value)} />
            </FieldRow>
            <FieldRow label="Sender Email Address">
              <input className={inputCls} type="email" value={s.emailSenderAddress ?? ""} onChange={(e) => patch("emailSenderAddress", e.target.value)} />
            </FieldRow>
          </div>
          <FieldRow label="Email Provider">
            <select className={selectCls} value={s.emailProvider ?? "resend"} onChange={(e) => patch("emailProvider", e.target.value)}>
              <option value="resend">Resend</option>
              <option value="sendgrid">SendGrid</option>
              <option value="ses">Amazon SES</option>
              <option value="mailgun">Mailgun</option>
              <option value="smtp">Custom SMTP</option>
            </select>
          </FieldRow>
        </SettingSection>

        {/* ── Platform Limits ────────────────────────────── */}
        <SettingSection
          icon={<Server className="h-4 w-4" />}
          title="Platform Limits"
          description="Resource caps and quotas. Set to 0 for unlimited."
        >
          <FieldRow label="Maximum Schools" hint="0 = unlimited">
            <input className={inputCls} type="number" min="0" value={s.maxSchools ?? 0} onChange={(e) => patch("maxSchools", Number(e.target.value))} />
          </FieldRow>
          <FieldRow label="Max Students Per School" hint="0 = unlimited">
            <input className={inputCls} type="number" min="0" value={s.maxStudentsPerSchool ?? 0} onChange={(e) => patch("maxStudentsPerSchool", Number(e.target.value))} />
          </FieldRow>
          <FieldRow label="Max Storage Per School (MB)" hint="0 = unlimited">
            <input className={inputCls} type="number" min="0" value={s.maxStorageMbPerSchool ?? 0} onChange={(e) => patch("maxStorageMbPerSchool", Number(e.target.value))} />
          </FieldRow>
        </SettingSection>
      </div>

      {/* ── Bottom Save Bar ─────────────────────────────── */}
      <div className="sticky bottom-0 z-10 flex items-center justify-between rounded-[var(--radius-md)] border border-border bg-surface/95 px-5 py-3 shadow-lg backdrop-blur-sm">
        <p className="text-xs text-muted">Changes are saved to the platform database and apply immediately.</p>
        <Button disabled={isSaving} onClick={save}>
          {isSaving ? "Saving…" : "Save All Settings"}
        </Button>
      </div>

      {/* ── Maintenance Mode Confirmation Modal ─────────── */}
      <Modal
        open={confirmOpen}
        title={confirmAction === "enable" ? "Enable Maintenance Mode" : "Disable Maintenance Mode"}
        description={
          confirmAction === "enable"
            ? "This will take ALL school dashboards offline immediately. Only Super Admins will have access."
            : "This will bring the platform back online. All schools will regain access to their dashboards."
        }
        onClose={() => setConfirmOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={confirmAction === "enable" ? "danger" : "primary"}
              disabled={!confirmValid || isSaving}
              onClick={executeMaintenanceToggle}
            >
              {confirmAction === "enable" ? "Enable Maintenance Mode" : "Disable Maintenance Mode"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className={`flex gap-3 rounded-[var(--radius-sm)] border px-4 py-3 text-sm ${confirmAction === "enable" ? "border-danger/20 bg-danger/10 text-foreground" : "border-success/20 bg-success/10 text-foreground"}`}>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {confirmAction === "enable"
                ? "Schools currently in use will immediately see a maintenance page. Ensure you have communicated the downtime window."
                : "The platform will be accessible to all users immediately after confirmation."}
            </p>
          </div>
          <FieldRow label={`Type "${confirmPhrase}" to confirm`}>
            <input
              className={inputCls}
              value={confirmInput}
              placeholder={confirmPhrase}
              onChange={(e) => setConfirmInput(e.target.value)}
              autoFocus
            />
          </FieldRow>
        </div>
      </Modal>
    </div>
  );
}
