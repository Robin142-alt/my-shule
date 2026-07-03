import { useState, useEffect, useCallback } from 'react';
import { DashboardApi } from '../lib/client/dashboard-api';

type DashboardNotification = {
  id: string;
  title: string;
  message?: string;
  is_read?: boolean;
};

function normalizeNotifications(payload: unknown): DashboardNotification[] {
  const candidate =
    Array.isArray(payload)
      ? payload
      : payload && typeof payload === 'object' && Array.isArray((payload as { notifications?: unknown }).notifications)
        ? (payload as { notifications: unknown[] }).notifications
        : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
          ? (payload as { data: unknown[] }).data
          : payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown }).items)
            ? (payload as { items: unknown[] }).items
            : [];

  return candidate
    .filter((notification): notification is Record<string, unknown> => Boolean(notification) && typeof notification === 'object')
    .map((notification, index) => ({
      id: String(notification.id ?? notification.notification_id ?? `notification-${index}`),
      title: String(notification.title ?? notification.subject ?? 'Notification'),
      message: typeof notification.message === 'string' ? notification.message : typeof notification.body === 'string' ? notification.body : undefined,
      is_read: Boolean(notification.is_read ?? notification.read ?? false),
    }));
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await DashboardApi.getNotifications();
      setNotifications(normalizeNotifications(data));
    } catch (err) {
      console.error('Failed to fetch notifications', err);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await DashboardApi.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return { notifications, unreadCount, isLoading, markAsRead, refetch: fetchNotifications };
}
