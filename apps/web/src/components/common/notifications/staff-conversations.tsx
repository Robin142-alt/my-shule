"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ArrowLeft, MessageSquare, Plus, Send } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import styles from "./staff-conversations.module.css";

type Staff = { id: string; name: string; roles: string[] };
type Thread = {
  id: string;
  subject: string;
  updated_at: string;
  unread: number;
  last_message: string;
  last_author: string;
};
type Message = {
  id: string;
  body: string;
  author_id: string;
  author_name: string;
  created_at: string;
  read_at: string | null;
  delivered: number;
  read_count: number;
};
type Conversation = {
  id: string;
  subject: string;
  user_id: string;
  participants: Staff[];
  items: Message[];
  has_older: boolean;
};
const stamp = (value: string) =>
  new Date(value).toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi",
    dateStyle: "medium",
    timeStyle: "short",
  });
const base = "/workflow/inbox/staff";

function useStaffRequest() {
  const tenant = useOptionalSchoolTenantId();
  return useCallback(
    <T,>(path: string, body: Record<string, unknown>) => {
      if (!tenant) throw new Error("A verified school session is required.");
      return requestDashboardApi<T>(path, {
        method: "POST",
        body,
        tenantId: tenant,
      });
    },
    [tenant],
  );
}
function useMessageSender() {
  const request = useStaffRequest();
  const pending = useRef<{ body: string; id: string } | null>(null);
  return async (body: Record<string, unknown>) => {
    const text = JSON.stringify(body);
    if (pending.current?.body !== text)
      pending.current = { body: text, id: crypto.randomUUID() };
    const result = await request<{ thread_id: string }>(`${base}/messages`, {
      ...body,
      request_id: pending.current.id,
    });
    pending.current = null;
    return result;
  };
}

export function StaffConversations({
  compact = false,
  onRead,
  initialThread,
}: {
  compact?: boolean;
  onRead?: () => void;
  initialThread?: string | null;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(
    initialThread ?? null,
  );
  const [compose, setCompose] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setOffset(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const conversations = useSchoolQuery<{ items: Thread[]; has_more: boolean }>(
    `${base}/conversations?q=${encodeURIComponent(query)}&offset=${offset}`,
    { refetchInterval: 15000 },
  );
  return (
    <section className={styles.root} aria-label="Staff conversations">
      <div className={styles.heading}>
        <div>
          <h3>Staff conversations</h3>
          <p>School inbox messages with replies and read receipts.</p>
        </div>
        <Button size="sm" onClick={() => setCompose(true)}>
          <Plus size={16} />
          New message
        </Button>
      </div>
      <div
        className={styles.layout}
        data-compact={compact}
        data-selected={Boolean(selected)}
      >
        <div className={styles.list}>
          <label>
            Search conversations
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Subject, staff member or message"
            />
          </label>
          {conversations.error ? (
            <p role="alert" className={styles.error}>
              {conversations.error.message}
              <Button
                variant="outline"
                onClick={() => void conversations.refetch()}
              >
                Retry inbox
              </Button>
            </p>
          ) : conversations.isLoading ? (
            <p role="status">Loading conversations…</p>
          ) : !conversations.data?.items?.length ? (
            <p className={styles.empty}>No conversations match this view.</p>
          ) : (
            conversations.data.items.map((thread) => (
              <button
                key={thread.id}
                className={styles.thread}
                aria-pressed={selected === thread.id}
                onClick={() => setSelected(thread.id)}
              >
                <strong>
                  {thread.subject}
                  {thread.unread > 0 && <span>{thread.unread} unread</span>}
                </strong>
                <small>
                  {thread.last_author} · {stamp(thread.updated_at)}
                </small>
                <p>{thread.last_message}</p>
              </button>
            ))
          )}
          <div className={styles.actions}>
            <Button
              variant="outline"
              size="sm"
              disabled={!offset}
              onClick={() => setOffset(offset - 25)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!conversations.data?.has_more}
              onClick={() => setOffset(offset + 25)}
            >
              Next
            </Button>
          </div>
        </div>
        <div className={styles.detail}>
          {selected ? (
            <StaffConversation
              key={selected}
              id={selected}
              onBack={() => setSelected(null)}
              onRead={() => {
                void conversations.refetch();
                onRead?.();
              }}
            />
          ) : (
            <div className={styles.empty}>
              <MessageSquare size={30} />
              <p>Select a conversation to read and reply.</p>
            </div>
          )}
        </div>
      </div>
      {compose && (
        <StaffMessageComposer
          onClose={() => setCompose(false)}
          onSent={(id) => {
            setCompose(false);
            setSelected(id);
            void conversations.refetch();
          }}
        />
      )}
    </section>
  );
}

export function StaffConversation({
  id,
  onBack,
  onRead,
}: {
  id: string;
  onBack: () => void;
  onRead?: () => void;
}) {
  const [before, setBefore] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const messages = useSchoolQuery<Conversation>(
    `${base}/conversations/${encodeURIComponent(id)}${before ? `?before=${encodeURIComponent(before)}` : ""}`,
    { refetchInterval: 15000 },
  );
  const request = useStaffRequest();
  const send = useMessageSender();
  const readCallback = useRef(onRead);
  useEffect(() => {
    readCallback.current = onRead;
  }, [onRead]);
  const unread =
    messages.data?.items
      .filter(
        (message) =>
          !message.read_at && message.author_id !== messages.data?.user_id,
      )
      .map((message) => message.id)
      .join(",") ?? "";
  useEffect(() => {
    if (!unread) return;
    let active = true;
    void request(`${base}/conversations/${id}/read`, {
      message_ids: unread.split(","),
    })
      .then(() => {
        if (active) {
          void messages.refetch();
          readCallback.current?.();
        }
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Read receipts could not be saved.",
          );
      });
    return () => {
      active = false;
    };
  }, [id, unread, request, messages.refetch]);
  async function reply(event: FormEvent) {
    event.preventDefault();
    if (busy || !body.trim()) return;
    setBusy(true);
    setError("");
    try {
      await send({ thread_id: id, message: body.trim() });
      setBody("");
      setBefore("");
      await messages.refetch();
      readCallback.current?.();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Message could not be sent.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.conversation}>
      <div className={styles.heading}>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft size={16} />
          Inbox
        </Button>
        <div>
          <h4>{messages.data?.subject ?? "Conversation"}</h4>
          {messages.data && (
            <details>
              <summary>
                {messages.data.participants.length} participants
              </summary>
              <p>
                {messages.data.participants
                  .map((person) => person.name)
                  .join(", ")}
              </p>
            </details>
          )}
        </div>
      </div>
      <div className={styles.history} aria-label="Message history">
        {messages.error ? (
          <p role="alert" className={styles.error}>
            {messages.error.message}
            <Button variant="outline" onClick={() => void messages.refetch()}>
              Retry conversation
            </Button>
          </p>
        ) : messages.isLoading ? (
          <p role="status">Loading messages…</p>
        ) : (
          <>
            <div className={styles.actions}>
              {messages.data?.has_older && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBefore(messages.data!.items[0].id)}
                >
                  Older messages
                </Button>
              )}
              {before && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBefore("")}
                >
                  Latest messages
                </Button>
              )}
            </div>
            {messages.data?.items.map((message) => (
              <article
                key={message.id}
                className={styles.message}
                data-own={message.author_id === messages.data?.user_id}
              >
                <header>
                  <strong>{message.author_name}</strong>
                  <time>{stamp(message.created_at)}</time>
                </header>
                <p>{message.body}</p>
                {message.author_id === messages.data?.user_id && (
                  <small>
                    In inbox: {message.delivered} · Read: {message.read_count}
                  </small>
                )}
              </article>
            ))}
          </>
        )}
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <form onSubmit={reply} className={styles.reply}>
        <label htmlFor={`reply-${id}`}>Reply to conversation</label>
        <textarea
          id={`reply-${id}`}
          rows={3}
          maxLength={8000}
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !body.trim() || !messages.data}>
          <Send size={16} />
          {busy ? "Sending…" : "Send reply"}
        </Button>
      </form>
    </div>
  );
}

export function StaffMessageComposer({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: (id: string) => void;
}) {
  const [all, setAll] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Staff[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recipients = useSchoolQuery<{ items: Staff[] }>(
    `${base}/recipients?q=${encodeURIComponent(search)}`,
  );
  const send = useMessageSender();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await send({
        subject: String(form.get("subject")).trim(),
        message: String(form.get("message")).trim(),
        audience: all ? "all_staff" : "specific_staff",
        recipients: all ? [] : selected.map((person) => person.id),
      });
      onSent(result.thread_id);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Message could not be sent.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      title="Message school staff"
      description="Start a conversation in the existing staff inbox. Everyone selected can reply."
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="staff-message-composer"
            disabled={busy || (!all && !selected.length)}
          >
            {busy ? "Sending…" : "Send message"}
          </Button>
        </>
      }
    >
      <form
        id="staff-message-composer"
        className={`${styles.root} ${styles.form}`}
        onSubmit={submit}
      >
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <label>
          Recipients
          <select
            value={all ? "all" : "specific"}
            onChange={(event) => setAll(event.target.value === "all")}
          >
            <option value="specific">Specific staff</option>
            <option value="all">All active staff</option>
          </select>
        </label>
        {!all && (
          <>
            <label>
              Find staff
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name or role"
              />
            </label>
            <div className={styles.selected}>
              {selected.map((person) => (
                <button
                  type="button"
                  key={person.id}
                  onClick={() =>
                    setSelected(
                      selected.filter((item) => item.id !== person.id),
                    )
                  }
                  aria-label={`Remove ${person.name}`}
                >
                  {person.name} ×
                </button>
              ))}
            </div>
            <div className={styles.recipients}>
              {recipients.error ? (
                <p role="alert">
                  {recipients.error.message}
                  <Button
                    variant="outline"
                    onClick={() => void recipients.refetch()}
                  >
                    Retry staff
                  </Button>
                </p>
              ) : recipients.isLoading ? (
                <p role="status">Loading staff…</p>
              ) : !recipients.data?.items?.length ? (
                <p>No matching staff.</p>
              ) : (
                recipients.data.items.map((person) => (
                  <label key={person.id}>
                    <input
                      type="checkbox"
                      checked={selected.some((item) => item.id === person.id)}
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? [...selected, person]
                            : selected.filter((item) => item.id !== person.id),
                        )
                      }
                    />
                    <span>
                      {person.name}
                      <small>
                        {person.roles.join(", ").replaceAll("_", " ")}
                      </small>
                    </span>
                  </label>
                ))
              )}
            </div>
          </>
        )}
        <label>
          Subject
          <input name="subject" required maxLength={160} />
        </label>
        <label>
          Message
          <textarea name="message" required rows={5} maxLength={8000} />
        </label>
        <p className={styles.hint}>
          In-app only. Delivery means the message is stored in each recipient’s
          school inbox; read receipts update when they open it.
        </p>
      </form>
    </Modal>
  );
}
