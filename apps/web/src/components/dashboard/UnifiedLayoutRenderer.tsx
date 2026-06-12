import React from 'react';

export function UnifiedLayoutRenderer({ layoutPayload }: { layoutPayload: any }) {
  if (!layoutPayload) return <div className="p-8">Failed to load dashboard layout.</div>;

  const { widgets = [], buttons = [] } = layoutPayload;

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Welcome back to your workspace.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {buttons.map((btn: any) => (
            <button 
              key={btn.id}
              disabled={btn.state === 'LOCKED'}
              className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-all
                ${btn.state === 'LOCKED' 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                }`}
              title={btn.state === 'LOCKED' ? 'Capability Required' : btn.label}
            >
              {btn.label}
              {btn.state === 'LOCKED' && <span className="ml-2 text-xs">🔒</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgets.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No Widgets Assigned</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Your role does not have any active dashboard widgets.</p>
          </div>
        ) : (
          widgets.map((widget: any, i: number) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col hover:shadow-md transition-shadow">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">{widget.widget_id}</h3>
              <div className="flex-1 overflow-auto">
                 <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-lg overflow-x-auto text-slate-700 dark:text-slate-300">
                   {JSON.stringify(widget.payload, null, 2)}
                 </pre>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                 <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                   widget.state === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                   widget.state === 'DEGRADED' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                   'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                 }`}>
                   {widget.state}
                 </span>
                 <span className="text-xs text-slate-400">Governance: AGP Bound</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
