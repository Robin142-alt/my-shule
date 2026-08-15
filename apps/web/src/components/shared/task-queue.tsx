"use client";

import React from "react";
import { AlertCircle, CheckSquare, Clock, Loader2, RefreshCw } from "lucide-react";

import { useDashboardTasks } from "@/hooks/useDashboardTasks";
import { HeaderPopover } from "./header-popover";

export const TaskQueue: React.FC = () => {
  const { tasks, isLoading, error, mutationError, pendingIds, completeTask, refetch } = useDashboardTasks();
  const openTasks = tasks.filter((task) => task.status === "open");
  const visibleError = mutationError ?? error;

  return (
    <HeaderPopover
      label="My tasks"
      triggerLabel={visibleError
        ? "Tasks unavailable"
        : isLoading
          ? "Loading tasks"
          : openTasks.length > 0
            ? `${openTasks.length} pending tasks`
            : "No pending tasks"}
      title="My Tasks"
      icon={<CheckSquare size={24} aria-hidden="true" />}
      badge={!visibleError && openTasks.length > 0 ? (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
          {openTasks.length > 9 ? "9+" : openTasks.length}
        </span>
      ) : undefined}
    >
      <div className="p-2">
        {visibleError ? (
          <div role="alert" className="mb-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" /> Tasks could not be refreshed.</p>
            <p className="mt-1 text-xs">{visibleError.message}</p>
            <button type="button" onClick={() => void refetch()} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        ) : null}
        {isLoading && openTasks.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading tasks...</div>
        ) : !visibleError && openTasks.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CheckSquare className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm">No pending tasks</p>
          </div>
        ) : openTasks.map((task) => (
          <div key={task.id} className="group mb-2 flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3 transition-colors hover:border-indigo-100">
            <button
              type="button"
              aria-label={`Complete ${task.title}`}
              disabled={pendingIds.has(task.id)}
              onClick={() => void completeTask(task.id).catch(() => undefined)}
              className="-ml-1 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-green-50 hover:text-green-600 disabled:cursor-wait disabled:opacity-60"
            >
              <CheckSquare size={18} />
            </button>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-slate-800">{task.title}</h4>
              {task.description ? <p className="mt-1 text-xs text-slate-500">{task.description}</p> : null}
              {task.due_date ? (
                <div className="mt-2 flex items-center text-xs font-medium text-amber-600">
                  <Clock size={12} className="mr-1" /> Due: {new Date(task.due_date).toLocaleDateString()}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </HeaderPopover>
  );
};
