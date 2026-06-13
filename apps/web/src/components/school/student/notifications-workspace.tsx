"use client";

import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";

export function NotificationsWorkspace() {
  const notifications = [
    { id: 1, title: "Library Due Date", body: "The book 'Things Fall Apart' is due back in the library tomorrow.", date: "Today", read: false },
    { id: 2, title: "New Assignment", body: "Mr. Kamau has posted a new Mathematics assignment.", date: "Yesterday", read: true },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Notifications</h2>
          <p className="text-sm text-slate-500 mt-1">Updates and alerts for your classes and school activities.</p>
        </div>
      </div>

      <Card className="border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {notifications.map(note => (
            <div key={note.id} className={`p-4 hover:bg-slate-50/50 transition-colors flex gap-4 ${note.read ? 'opacity-70' : ''}`}>
              <div className="mt-1">
                <div className={`w-2 h-2 rounded-full ${note.read ? 'bg-transparent' : 'bg-blue-500'}`}></div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`text-sm ${note.read ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>{note.title}</h4>
                  <span className="text-xs text-slate-400">{note.date}</span>
                </div>
                <p className="text-sm text-slate-600">{note.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
