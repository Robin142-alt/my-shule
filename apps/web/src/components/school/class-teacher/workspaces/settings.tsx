import { WorkspaceRetry } from "@/components/school/workspace-retry";
import { CheckCircle2, PenTool, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { SignatureUploadButton } from "@/components/report-cards/signature-upload-button";
import { toast } from "sonner";
import { Panel } from "../shared";
import {
  useClassTeacherReportCardSignature,
  useClassTeacherSettings,
  useResolvedClassTeacherStreamId,
  useSaveClassTeacherSettings,
  useUploadClassTeacherReportCardSignature,
} from "@/lib/data/class-teacher-hooks";

export function SettingsWorkspace() {
  const { streamId } = useResolvedClassTeacherStreamId();
  const { data, isLoading, error, refetch } = useClassTeacherSettings(streamId);
  const saveClassTeacherSettings = useSaveClassTeacherSettings(streamId);
  const signatureQuery = useClassTeacherReportCardSignature(streamId);
  const uploadSignature = useUploadClassTeacherReportCardSignature(streamId);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [defaultView, setDefaultView] = useState("Overview");
  const [failedSignatureVersion, setFailedSignatureVersion] = useState<string | null>(null);

  useEffect(() => {
    const safeData = data as any;
    if (!safeData) return;
    setNotificationsEnabled(Boolean(safeData.notificationsEnabled ?? true));
    setDefaultView(String(safeData.defaultView || "Overview"));
  }, [data]);

  async function handleSaveClassTeacherSettings() {
    try {
      await saveClassTeacherSettings.mutateAsync({
        notificationsEnabled,
        defaultView,
      });
      toast.success("Class-teacher settings saved.");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Class-teacher settings could not be saved.");
    }
  }

  async function handleSignatureUpload(file: File) {
    await uploadSignature.mutateAsync(file);
    setFailedSignatureVersion(null);
    toast.success('Your signature will be placed automatically on newly generated report cards.');
  }

  if (isLoading) {
    return (
      <Panel title="Settings" description="Manage your preferences and workspace settings." icon={Settings}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Settings" description="Manage your preferences and workspace settings." icon={Settings}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load settings.</div>
        <WorkspaceRetry onRetry={() => refetch()} />
      </Panel>
    );
  }

  const safeData = data as any;
  const signature = signatureQuery.data;
  const signatureVersion = signature?.updated_at ?? signature?.checksum_sha256 ?? '';
  const signatureSource = signature?.content_url
    ? `${signature.content_url}${signature.content_url.includes('?') ? '&' : '?'}v=${encodeURIComponent(signatureVersion)}`
    : null;
  return (
    <Panel title="Settings" description="Manage your preferences and workspace settings." icon={Settings}>
      <div className="space-y-6">
        <section className="rounded-xl border border-[#D8E0EC] bg-white p-6">
          <h3 className="font-bold text-[#071D49] mb-4">Workspace Preferences</h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#071D49]">Enable Notifications</span>
              <input type="checkbox" checked={notificationsEnabled} onChange={(event) => setNotificationsEnabled(event.currentTarget.checked)} className="h-4 w-4 rounded text-[#1D4ED8]" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#071D49]">Default View</span>
              <select className="rounded-md border border-[#D8E0EC] px-3 py-1 text-sm text-[#071D49]" value={defaultView} onChange={(event) => setDefaultView(event.currentTarget.value)}>
                <option value="Overview">Overview</option>
                <option value="My Class Register">My Class Register</option>
                <option value="Timetable">Timetable</option>
              </select>
            </label>
          </div>
          {safeData.updatedAt ? <p className="mt-4 text-xs font-semibold text-[#64748B]">Last saved {new Date(safeData.updatedAt).toLocaleString("en-KE")}.</p> : null}
          <div className="mt-6 flex justify-end">
            <button type="button" disabled={saveClassTeacherSettings.isPending} className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-black text-white disabled:opacity-60" onClick={handleSaveClassTeacherSettings}>
              {saveClassTeacherSettings.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </section>
        <section className="rounded-xl border border-[#D8E0EC] bg-white p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#D8E0EC] bg-[#F8FAFC]">
                {signatureSource && failedSignatureVersion !== signatureVersion ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signatureSource}
                    alt="Your report-card signature"
                    className="max-h-14 max-w-20 object-contain"
                    onError={() => setFailedSignatureVersion(signatureVersion)}
                  />
                ) : (
                  <PenTool className="h-7 w-7 text-[#64748B]" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-[#071D49]">Report-card signature</h3>
                <p className="mt-1 text-sm font-semibold text-[#64748B]">
                  Upload your own signature once. It is school-scoped and placed automatically on report cards for your active class-teacher appointment.
                </p>
                {signature?.available ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-black text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Ready for report generation
                    {signature.updated_at ? ` · Updated ${new Date(signature.updated_at).toLocaleString('en-KE')}` : ''}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="shrink-0">
              <SignatureUploadButton
                available={Boolean(signature?.available)}
                label="Class Teacher Signature"
                disabled={!streamId || uploadSignature.isPending}
                onUpload={handleSignatureUpload}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#071D49] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50 sm:w-auto"
              />
            </div>
          </div>
          {signatureQuery.isError ? (
            <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
              <span>Signature status could not be loaded.</span>
              <button type="button" onClick={() => void signatureQuery.refetch()} className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-black text-rose-700">
                Retry signature
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </Panel>
  );
}
