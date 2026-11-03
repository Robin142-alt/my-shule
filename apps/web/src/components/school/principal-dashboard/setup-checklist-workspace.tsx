"use client";

import { WorkspaceRetry } from "@/components/school/workspace-retry";

import { Card } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Circle, ListTodo } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type SetupChecklistData = {
  status: "active" | "degraded" | "setup_required";
  overallProgress: number;
  tasks: Array<{ id: string; title: string; completed: boolean; group: string }>;
};

type SetupWorkspaceTarget =
  | "school-profile"
  | "users-invitations"
  | "academic-setup"
  | "subjects-departments"
  | "students";

type SetupTaskAction = {
  actionLabel: string;
  target: SetupWorkspaceTarget;
};

function actionForSetupTask(task: SetupChecklistData["tasks"][number]): SetupTaskAction | null {
  const title = task.title.trim().toLowerCase();

  if (title.includes("school profile")) {
    return { actionLabel: "Open School Profile", target: "school-profile" };
  }
  if (title.includes("principal") || title.includes("deputy") || title.includes("staff")) {
    return { actionLabel: "Open Users & Invitations", target: "users-invitations" };
  }
  if (title.includes("subject")) {
    return { actionLabel: "Open Subjects & Departments", target: "subjects-departments" };
  }
  if (title.includes("term") || title.includes("grading") || title.includes("academic")) {
    return { actionLabel: "Open Academic Setup", target: "academic-setup" };
  }
  if (title.includes("student") || title.includes("learner") || title.includes("admission")) {
    return { actionLabel: "Open Students", target: "students" };
  }

  return null;
}

export function PrincipalSetupChecklistWorkspace({
  onNavigate,
}: {
  onNavigate?: (target: SetupWorkspaceTarget) => void;
}) {
  const { data, isLoading, error, refetch } =
    useSchoolQuery<SetupChecklistData>(
      "/admin-command/principal/setup-checklist",
    );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-surface rounded-xl border border-border" />
          <div className="h-64 bg-surface rounded-xl border border-border" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border border-red-500/20 bg-red-500/10 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-bold text-red-500">
            Failed to load Setup Checklist
          </h2>
        </div>
        <WorkspaceRetry onRetry={() => refetch()} />
      </Card>
    );
  }

  // Group tasks by their group property
  const groupedTasks = data.tasks.reduce(
    (acc, task) => {
      if (!acc[task.group]) acc[task.group] = [];
      acc[task.group].push(task);
      return acc;
    },
    {} as Record<string, typeof data.tasks>,
  );

  return (
    <div className="space-y-6">
      <Card className="border border-border bg-surface p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <ListTodo className="h-32 w-32" />
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-foreground">
            Setup Progress
          </h2>
          <p className="text-muted mt-1">
            Complete these tasks to get your school fully operational.
          </p>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 h-3 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-1000 ease-out rounded-full"
                style={{ width: `${data.overallProgress}%` }}
              />
            </div>
            <span className="font-bold text-foreground text-lg">
              {data.overallProgress}%
            </span>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {Object.entries(groupedTasks).map(([group, tasks]) => {
          const groupCompleted = tasks.filter((t) => t.completed).length;
          const groupTotal = tasks.length;
          const isFullyCompleted = groupCompleted === groupTotal;

          return (
            <Card
              key={group}
              className={`border p-6 transition-all ${isFullyCompleted ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-surface"}`}
            >
              <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                <h3 className="text-lg font-bold text-foreground">{group}</h3>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${isFullyCompleted ? "bg-emerald-500/20 text-success" : "bg-surface text-muted"}`}
                >
                  {groupCompleted} / {groupTotal}
                </span>
              </div>

              <div className="space-y-3">
                {tasks.map((task) => {
                  const action = actionForSetupTask(task);

                  return (
                    <div
                      key={task.id}
                      className="flex flex-col gap-3 rounded p-2 transition hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {task.completed ? (
                          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-success" />
                        ) : (
                          <Circle className="h-5 w-5 flex-shrink-0 text-muted" />
                        )}
                        <span
                          className={`font-medium ${task.completed ? "text-muted line-through decoration-white/30" : "text-foreground"}`}
                        >
                          {task.title}
                        </span>
                      </div>
                      {action && onNavigate ? (
                        <button
                          type="button"
                          onClick={() => onNavigate(action.target)}
                          className="min-h-10 shrink-0 rounded-lg border border-cyan-200/30 bg-cyan-200/10 px-3 py-2 text-sm font-black text-info transition hover:bg-cyan-200/20"
                        >
                          {action.actionLabel}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
