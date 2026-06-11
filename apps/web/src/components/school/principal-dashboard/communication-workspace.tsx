"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle, MessageSquare, Send } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type PrincipalCommunicationData = {
  status: "active" | "degraded" | "setup_required";
  smsBalance: number;
  messagesSentToday: number;
  failedDeliveries: number;
  pendingMessages: number;
  communicationTrend: Array<{ label: string; value: number }>;
  recentBroadcasts: Array<any>;
};

export function PrincipalCommunicationWorkspace() {
  const { data, isLoading, error } = useSchoolQuery<PrincipalCommunicationData>('/admin-command/principal/communication');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-white/5 rounded-xl border border-white/10" />
          <div className="h-64 bg-white/5 rounded-xl border border-white/10" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border border-red-500/20 bg-red-500/10 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-bold text-red-500">Failed to load Communication Overview</h2>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Messages Sent Today</div>
          <div className="mt-2 text-2xl font-black text-white">{data.messagesSentToday}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Failed Deliveries</div>
          <div className="mt-2 text-2xl font-black text-red-500">{data.failedDeliveries}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Pending Outbox</div>
          <div className="mt-2 text-2xl font-black text-yellow-500">{data.pendingMessages}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">SMS Balance</div>
          <div className="mt-2 text-2xl font-black text-green-500">{data.smsBalance}</div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <h2 className="text-xl font-bold text-white mb-6">Weekly Broadcast Volume</h2>
          <div className="flex-1 flex items-end gap-2 mt-4 min-h-[200px]">
            {data.communicationTrend?.map((item) => (
              <div key={item.label} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full relative bg-white/5 rounded-t-sm" style={{ height: "150px" }}>
                  <div 
                    className="absolute bottom-0 w-full bg-cyan-500/50 rounded-t-sm transition-all duration-500 group-hover:bg-cyan-400/60"
                    style={{ height: `${Math.min(item.value, 150)}%` }} // Max height cap for chart aesthetics
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.value}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-white/50">{item.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Recent Broadcasts</h2>
            <button className="text-xs bg-white/10 text-white px-3 py-1.5 rounded hover:bg-white/20 transition-colors flex items-center gap-1">
              <Send className="h-3 w-3" />
              New Message
            </button>
          </div>
          
          {(!data.recentBroadcasts || data.recentBroadcasts.length === 0) ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <MessageSquare className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60">No recent broadcasts sent</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {/* Broadcast list will go here */}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
