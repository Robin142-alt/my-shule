import { useState, useEffect, useCallback } from 'react';
import { DashboardApi } from '../lib/client/dashboard-api';

type DashboardTask = {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  status?: string;
};

function normalizeDashboardTasks(payload: unknown): DashboardTask[] {
  const candidate =
    Array.isArray(payload)
      ? payload
      : payload && typeof payload === 'object' && Array.isArray((payload as { tasks?: unknown }).tasks)
        ? (payload as { tasks: unknown[] }).tasks
        : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
          ? (payload as { data: unknown[] }).data
          : payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown }).items)
            ? (payload as { items: unknown[] }).items
            : [];

  return candidate
    .filter((task): task is Record<string, unknown> => Boolean(task) && typeof task === 'object')
    .map((task, index) => ({
      id: String(task.id ?? task.task_id ?? `task-${index}`),
      title: String(task.title ?? task.name ?? 'Untitled task'),
      description: typeof task.description === 'string' ? task.description : undefined,
      due_date: typeof task.due_date === 'string' ? task.due_date : typeof task.dueDate === 'string' ? task.dueDate : undefined,
      status: typeof task.status === 'string' ? task.status.toLowerCase() : 'open',
    }));
}

export function useDashboardTasks() {
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await DashboardApi.getTasks();
      setTasks(normalizeDashboardTasks(data));
    } catch (err) {
      console.error('Failed to fetch tasks', err);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const completeTask = async (id: string) => {
    try {
      await DashboardApi.completeTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Failed to complete task', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, isLoading, completeTask, refetch: fetchTasks };
}
