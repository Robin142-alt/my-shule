"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, RotateCcw, Loader2 } from "lucide-react";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

interface GradingPolicyRow {
  id?: string;
  name?: string;
  reporting_mode?: string | null;
  status?: string | null;
}

interface ApiResponse<T> {
  data?: T;
}

interface ExamSettingsRow {
  lock_after_deadline?: boolean;
  grace_period_hours?: number;
  include_school_logo?: boolean;
  include_principal_signature?: boolean;
  include_official_stamp?: boolean;
  block_results_for_fee_balances?: boolean;
  fee_balance_block_threshold?: number;
  show_student_rank_to_parents?: boolean;
}

const defaults = {
  lockAfterDeadline: true,
  gracePeriodHours: "24",
  includeLogo: true,
  includePrincipalSignature: true,
  includeStamp: true,
  blockForFeeBalances: true,
  feeThreshold: "1000",
  showRankToParents: true,
};

export function ExamSettingsWorkspace({ model }: { model: unknown }) {
  void model;
  const [notice, setNotice] = useState<string | null>(null);
  const [settingsOverride, setSettingsOverride] = useState<typeof defaults | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const { data: policiesResponse, isLoading, error } = useSchoolQuery<ApiResponse<GradingPolicyRow[]> | GradingPolicyRow[]>("/exams/grading-policies");
  const { data: examSettingsResponse, isLoading: settingsLoading, error: settingsError } = useSchoolQuery<ApiResponse<ExamSettingsRow> | ExamSettingsRow>("/exams/settings");
  const saveSettingsMutation = useSchoolMutation<ApiResponse<ExamSettingsRow> | ExamSettingsRow, ExamSettingsRow>("/exams/settings", "PATCH", {
    onSuccess: (response) => {
      const saved = unwrapApiResponse(response);
      if (saved) {
        setSettingsOverride(mapApiSettingsToForm(saved));
      }
      setSavedAt(new Date().toLocaleString());
      setNotice("Exam settings saved to the tenant-scoped backend.");
    },
    onError: (mutationError) => {
      setNotice(`Exam settings could not be saved: ${mutationError.message}`);
    },
  });
  const policies = Array.isArray(policiesResponse) ? policiesResponse : policiesResponse?.data;
  const loadedSettings = unwrapApiResponse(examSettingsResponse);
  const settings = settingsOverride ?? (loadedSettings ? mapApiSettingsToForm(loadedSettings) : defaults);

  function updateSetting<Key extends keyof typeof settings>(key: Key, value: (typeof settings)[Key]) {
    setSettingsOverride((current) => ({ ...(current ?? settings), [key]: value }));
  }

  function saveSettings() {
    saveSettingsMutation.mutate({
      lock_after_deadline: settings.lockAfterDeadline,
      grace_period_hours: Number(settings.gracePeriodHours),
      include_school_logo: settings.includeLogo,
      include_principal_signature: settings.includePrincipalSignature,
      include_official_stamp: settings.includeStamp,
      block_results_for_fee_balances: settings.blockForFeeBalances,
      fee_balance_block_threshold: Number(settings.feeThreshold),
      show_student_rank_to_parents: settings.showRankToParents,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Configuration"
          title="Exam Settings"
          description="Configure global exam defaults, lock rules, and portal visibility."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { setSettingsOverride(defaults); setNotice("Exam settings reset to school defaults. Save to persist these defaults."); }}><RotateCcw className="mr-2 h-4 w-4" /> Reset to Defaults</Button>
          <Button onClick={saveSettings} disabled={saveSettingsMutation.isPending || settingsLoading}>
            {saveSettingsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Settings
          </Button>
        </div>
      </div>

      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}{savedAt ? ` Last saved: ${savedAt}.` : ""}</div> : null}
      {settingsError ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">Failed to load saved exam settings: {settingsError.message}</div> : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Grading Defaults</CardTitle>
            <CardDescription>Set the default passing marks for subjects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && <div className="py-4 flex items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading policies...</div>}
            {error && <div className="py-4 text-sm text-destructive">Failed to load policies.</div>}
            {!isLoading && !error && Array.isArray(policies) && policies.map((p) => (
              <div key={p.id ?? p.name} className="flex items-center justify-between p-2 border rounded-md">
                <span className="text-sm font-medium">{p.name} ({p.reporting_mode ?? "standard"})</span>
                <span className="text-xs px-2 py-1 bg-muted rounded">{p.status ?? "draft"}</span>
              </div>
            ))}
            {!isLoading && !error && (!policies || !Array.isArray(policies) || policies.length === 0) && (
              <div className="text-sm text-muted-foreground">No grading policies found.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Marks Entry Lock Rules</CardTitle>
            <CardDescription>Automatically lock submissions to prevent tampering</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Lock After Deadline</Label>
                <div className="text-sm text-muted-foreground">Automatically lock marks entry when deadline passes.</div>
              </div>
              <Switch checked={settings.lockAfterDeadline} onChange={(event) => updateSetting("lockAfterDeadline", event.target.checked)} />
            </div>
            <div className="space-y-2 pt-2">
              <Label htmlFor="grace-period">Grace Period (Hours)</Label>
              <Input id="grace-period" type="number" value={settings.gracePeriodHours} onChange={(event) => updateSetting("gracePeriodHours", event.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report Card Templates</CardTitle>
            <CardDescription>Configure the appearance of exported report cards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include School Logo</Label>
              </div>
              <Switch checked={settings.includeLogo} onChange={(event) => updateSetting("includeLogo", event.target.checked)} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Principal Signature</Label>
              </div>
              <Switch checked={settings.includePrincipalSignature} onChange={(event) => updateSetting("includePrincipalSignature", event.target.checked)} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Official Stamp</Label>
              </div>
              <Switch checked={settings.includeStamp} onChange={(event) => updateSetting("includeStamp", event.target.checked)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portal & Integrations</CardTitle>
            <CardDescription>Control what parents see and sync with other modules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Block Results for Fee Balances</Label>
                <div className="text-sm text-muted-foreground">Requires Finance Module integration.</div>
              </div>
              <Switch checked={settings.blockForFeeBalances} onChange={(event) => updateSetting("blockForFeeBalances", event.target.checked)} />
            </div>
            <div className="space-y-2 pt-2">
              <Label htmlFor="fee-threshold">Minimum Fee Balance Block Threshold (KES)</Label>
              <Input id="fee-threshold" type="number" value={settings.feeThreshold} onChange={(event) => updateSetting("feeThreshold", event.target.value)} />
            </div>
            <div className="flex items-center justify-between pt-4">
              <div className="space-y-0.5">
                <Label>Show Student Rank to Parents</Label>
                <div className="text-sm text-muted-foreground">Display class/stream rank on portal and report cards.</div>
              </div>
              <Switch checked={settings.showRankToParents} onChange={(event) => updateSetting("showRankToParents", event.target.checked)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function unwrapApiResponse<T>(response: ApiResponse<T> | T | undefined): T | undefined {
  return response && typeof response === "object" && "data" in response ? (response as ApiResponse<T>).data : (response as T | undefined);
}

function mapApiSettingsToForm(row: ExamSettingsRow) {
  return {
    lockAfterDeadline: row.lock_after_deadline ?? defaults.lockAfterDeadline,
    gracePeriodHours: String(row.grace_period_hours ?? defaults.gracePeriodHours),
    includeLogo: row.include_school_logo ?? defaults.includeLogo,
    includePrincipalSignature: row.include_principal_signature ?? defaults.includePrincipalSignature,
    includeStamp: row.include_official_stamp ?? defaults.includeStamp,
    blockForFeeBalances: row.block_results_for_fee_balances ?? defaults.blockForFeeBalances,
    feeThreshold: String(row.fee_balance_block_threshold ?? defaults.feeThreshold),
    showRankToParents: row.show_student_rank_to_parents ?? defaults.showRankToParents,
  };
}
