"use client";

import { WorkspaceRetry } from "@/components/school/workspace-retry";
import { StaffConversations } from "@/components/common/notifications/staff-conversations";
import {
  PrincipalHeader,
  PrincipalMetrics,
  PrincipalPanel,
  PrincipalTrend,
  principalStyles,
} from "./workspace-ui";

import { useState } from "react";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useVerifiedPrincipalDashboardApi } from "./verified-tenant-api";
import { usePermissions } from "@/components/providers/permission-context";

type PrincipalCommunicationData = {
  status: "active" | "degraded" | "setup_required";
  broadcastsThisWeek: number;
  inAppDelivered: number;
  inAppRead: number;
  inAppUnread: number;
  providerAcceptedToday: number;
  failedDeliveries: number;
  pendingMessages: number;
  deliveryUnknown: number;
  communicationTrend: Array<{ label: string; value: number }>;
  recentBroadcasts: Array<{
    id: string;
    title: string;
    body: string;
    status: string;
    audience?: string | null;
    channels?: string[] | null;
    time: string;
    in_app_delivered: number;
    in_app_read: number;
  }>;
};

export function PrincipalCommunicationWorkspace() {
  const { data, isLoading, error, refetch } =
    useSchoolQuery<PrincipalCommunicationData>(
      "/admin-command/principal/communication",
    );
  const requestPrincipalApi = useVerifiedPrincipalDashboardApi();
  const {
    data: templatesData,
    refetch: refetchTemplates,
    error: templateError,
  } = useSchoolQuery<any[]>("/admin-command/communication-templates");
  const { hasPermission } = usePermissions();

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isSubmittingBroadcast, setIsSubmittingBroadcast] = useState(false);
  const [broadcastFormError, setBroadcastFormError] = useState("");
  const [broadcastAudience, setBroadcastAudience] = useState("parents");

  const [tab, setTab] = useState<"staff" | "broadcasts">("staff");
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("");
  const [historyPage, setHistoryPage] = useState(0);
  const classes = useSchoolQuery<
    Array<{ id: string; name: string; custom_label?: string }>
  >(
    isBroadcastModalOpen && broadcastAudience === "class"
      ? "/academics/class-sections"
      : null,
  );
  const canSend = hasPermission("school_sms:send");

  const handleCreateTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    const formData = new FormData(e.currentTarget);
    try {
      await requestPrincipalApi("/admin-command/communication-templates", {
        method: "POST",
        body: {
          name: formData.get("name"),
          type: formData.get("type"),
          body: formData.get("content"),
        },
      });
      setIsTemplateModalOpen(false);
      await refetchTemplates();
    } catch (err: any) {
      setFormError(err.message || "Failed to create template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBroadcast = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingBroadcast(true);
    setBroadcastFormError("");
    const formData = new FormData(e.currentTarget);
    const channels = [];
    if (formData.get("channel_sms") === "on") channels.push("SMS");
    if (formData.get("channel_in_app") === "on") channels.push("IN_APP");

    if (channels.length === 0) {
      setBroadcastFormError("Please select at least one channel");
      setIsSubmittingBroadcast(false);
      return;
    }

    try {
      const result = await requestPrincipalApi<{ message: string }>(
        "/admin-command/communication-broadcasts",
        {
          method: "POST",
          body: {
            audience: formData.get("audience"),
            targetClass: formData.get("targetClass"),
            message: formData.get("message"),
            channels: channels,
          },
        },
      );
      setIsBroadcastModalOpen(false);
      setDraft("");
      setTab("broadcasts");
      toast.success(result.message);
      await refetch();
    } catch (err: any) {
      setBroadcastFormError(err.message || "Failed to send broadcast");
    } finally {
      setIsSubmittingBroadcast(false);
    }
  };

  const handleArchiveTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to archive this template?")) return;
    try {
      await requestPrincipalApi(
        `/admin-command/communication-templates/${id}`,
        { method: "DELETE" },
      );
      await refetchTemplates();
    } catch (err: any) {
      toast.error(err.message || "Failed to archive template");
    }
  };

  const history = (data?.recentBroadcasts ?? []).filter((row) =>
    [row.title, row.body, row.audience]
      .join(" ")
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  const openBroadcast = (content = "") => {
    setDraft(content);
    setBroadcastFormError("");
    setIsBroadcastModalOpen(true);
  };
  return (
    <div className={principalStyles.stack}>
      <PrincipalHeader
        icon={MessageSquare}
        tone="violet"
        title="School communication"
        description="Talk with school staff or share announcements with families."
        actions={
          canSend && (
            <Button onClick={() => openBroadcast()}>
              <Send size={16} />
              New broadcast
            </Button>
          )
        }
      />
      <div className={principalStyles.actions}>
        <Button
          aria-pressed={tab === "staff"}
          variant={tab === "staff" ? "primary" : "outline"}
          onClick={() => setTab("staff")}
        >
          Staff conversations
        </Button>
        <Button
          aria-pressed={tab === "broadcasts"}
          variant={tab === "broadcasts" ? "primary" : "outline"}
          onClick={() => setTab("broadcasts")}
        >
          School broadcasts
        </Button>
      </div>
      {tab === "staff" ? (
        <PrincipalPanel title="Staff inbox" tone="violet">
          <StaffConversations />
        </PrincipalPanel>
      ) : (
        <>
          {error ? (
            <p role="alert" className={principalStyles.error}>
              Broadcasts could not load.{" "}
              <WorkspaceRetry onRetry={() => refetch()} />
            </p>
          ) : isLoading ? (
            <p role="status" className={principalStyles.empty}>
              Loading school broadcasts…
            </p>
          ) : (
            data && (
              <>
                <PrincipalMetrics
                  items={[
                    {
                      label: "School broadcasts",
                      value: data.broadcastsThisWeek,
                      detail: "Last seven days",
                      icon: Send,
                      tone: "blue",
                    },
                    {
                      label: "Read in app",
                      value: data.inAppRead,
                      detail: `Of ${data.inAppDelivered} inbox deliveries in seven days`,
                      icon: MessageSquare,
                      tone: "mint",
                    },
                    {
                      label: "Unread in app",
                      value: data.inAppUnread,
                      detail: "Broadcast inbox deliveries in seven days",
                      icon: MessageSquare,
                      tone: "violet",
                    },
                    {
                      label: "SMS provider accepted today",
                      value: data.providerAcceptedToday,
                      detail: "Awaiting handset confirmation",
                      icon: Send,
                      tone: "amber",
                    },
                  ]}
                />
                <div className={principalStyles.columns}>
                  <PrincipalPanel
                    title="Broadcast volume"
                    description="One count per announcement across all channels."
                  >
                    <PrincipalTrend
                      points={data.communicationTrend}
                      label="School broadcasts over the last seven days"
                    />
                  </PrincipalPanel>
                  <PrincipalPanel
                    title="SMS follow-up"
                    tone="amber"
                    description="Current delivery states from the school SMS outbox."
                  >
                    <dl>
                      {[
                        ["Queued or dispatching", data.pendingMessages],
                        ["Delivery needs review", data.deliveryUnknown],
                        ["Failed", data.failedDeliveries],
                      ].map(([label, value]) => (
                        <div
                          className={principalStyles.calendarItem}
                          key={label}
                        >
                          <dt>{label}</dt>
                          <dd>
                            <strong>{value}</strong>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </PrincipalPanel>
                </div>
                <PrincipalPanel
                  title="Recent broadcasts"
                  description="Search the latest 50 school announcements and their in-app receipts."
                  tone="mint"
                >
                  <label className={principalStyles.field}>
                    Search broadcasts
                    <input
                      type="search"
                      value={filter}
                      onChange={(e) => {
                        setFilter(e.target.value);
                        setHistoryPage(0);
                      }}
                    />
                  </label>
                  {history.length ? (
                    <>
                      {history
                        .slice(historyPage * 5, historyPage * 5 + 5)
                        .map((row) => (
                          <article
                            key={row.id}
                            className={principalStyles.calendarItem}
                          >
                            <div>
                              <strong>{row.title}</strong>
                              <p>{row.body}</p>
                              <small>
                                {new Date(row.time).toLocaleString("en-KE", {
                                  timeZone: "Africa/Nairobi",
                                })}{" "}
                                · {row.audience} · {row.channels?.join(", ")}
                              </small>
                              <p>
                                In-app inboxes {row.in_app_delivered} · Read{" "}
                                {row.in_app_read}
                              </p>
                            </div>
                            <span
                              className={principalStyles.badge}
                              data-tone="blue"
                            >
                              {row.status.replaceAll("_", " ")}
                            </span>
                          </article>
                        ))}
                      <div className={principalStyles.actions}>
                        <Button
                          variant="outline"
                          disabled={!historyPage}
                          onClick={() => setHistoryPage(historyPage - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          disabled={(historyPage + 1) * 5 >= history.length}
                          onClick={() => setHistoryPage(historyPage + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className={principalStyles.empty}>
                      No matching broadcasts.
                    </p>
                  )}
                </PrincipalPanel>
              </>
            )
          )}
          <PrincipalPanel
            title="Communication templates"
            tone="violet"
            actions={
              canSend && (
                <Button
                  variant="outline"
                  onClick={() => setIsTemplateModalOpen(true)}
                >
                  Add template
                </Button>
              )
            }
          >
            {templateError ? (
              <p role="alert">
                {templateError.message}
                <WorkspaceRetry onRetry={() => refetchTemplates()} />
              </p>
            ) : templatesData?.length ? (
              templatesData.map((template) => (
                <article
                  key={template.id}
                  className={principalStyles.calendarItem}
                >
                  <div>
                    <strong>{template.name}</strong>
                    <p>{template.body}</p>
                  </div>
                  {canSend && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => openBroadcast(template.body)}
                      >
                        Use template
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void handleArchiveTemplate(template.id)}
                      >
                        Archive
                      </Button>
                    </>
                  )}
                </article>
              ))
            ) : (
              <p className={principalStyles.empty}>
                No saved message templates.
              </p>
            )}
          </PrincipalPanel>
        </>
      )}
      <Modal
        open={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Create Template"
      >
        <form onSubmit={handleCreateTemplate} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {formError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <input
              name="name"
              required
              className="w-full border rounded p-2 text-sm"
              placeholder="e.g. Fee Reminder"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <select
              name="type"
              required
              className="w-full border rounded p-2 text-sm bg-white text-black"
            >
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Content</label>
            <textarea
              name="content"
              required
              className="w-full border rounded p-2 text-sm"
              placeholder="Message content... Use {{student_name}} for variables."
            />
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Template
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        title="Send Broadcast"
      >
        <form onSubmit={handleCreateBroadcast} className="space-y-4">
          {broadcastFormError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {broadcastFormError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Audience</label>
            <select
              name="audience"
              required
              value={broadcastAudience}
              onChange={(e) => setBroadcastAudience(e.target.value)}
              className="w-full border border-slate-200 rounded p-2 text-sm bg-white text-black focus:outline-none focus:ring-1 focus:ring-slate-950"
            >
              <option value="parents">All Parents</option>
              <option value="staff">All Staff</option>
              <option value="class">Specific Class</option>
            </select>
          </div>
          {broadcastAudience === "class" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Class / Grade Name</label>
              <select aria-label="Class or grade" name="targetClass" required>
                <option value="">Choose class</option>
                {classes.data?.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.custom_label || row.name}
                  </option>
                ))}
              </select>
              {classes.error && (
                <p role="alert">
                  {classes.error.message}
                  <WorkspaceRetry onRetry={() => classes.refetch()} />
                </p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Channels</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="channel_sms"
                  disabled={broadcastAudience === "staff"}
                  className="rounded disabled:opacity-50"
                />
                <span className="text-sm">SMS</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="channel_in_app"
                  defaultChecked
                  className="rounded"
                />
                <span className="text-sm">In-app</span>
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <textarea
              aria-label="Broadcast message"
              name="message"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={8000}
              required
              rows={4}
              className="w-full border rounded p-2 text-sm"
              placeholder="Write your broadcast message..."
            />
            <p className="text-xs text-gray-500">
              Review the final wording and replace any template placeholders
              before sending.
            </p>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmittingBroadcast}>
              {isSubmittingBroadcast && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Send Broadcast
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
