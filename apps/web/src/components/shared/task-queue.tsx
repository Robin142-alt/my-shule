import React from 'react';
import { CheckSquare, Clock } from 'lucide-react';
import { useDashboardTasks } from '../../hooks/useDashboardTasks';
import { HeaderPopover } from './header-popover';

export const TaskQueue: React.FC = () => {
  const { tasks, completeTask } = useDashboardTasks();

  const openTasks = tasks.filter(t => t.status === 'open');

  return (
    <HeaderPopover
      label="My tasks"
      triggerLabel={openTasks.length > 0 ? `${openTasks.length} pending tasks` : "No pending tasks"}
      title="My Tasks"
      icon={<CheckSquare size={24} aria-hidden="true" />}
      badge={openTasks.length > 0 ? (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {openTasks.length}
          </span>
        ) : undefined}
    >
          <div className="p-2">
            {openTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <CheckSquare className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm">No pending tasks</p>
              </div>
            ) : (
              openTasks.map((task) => (
                <div key={task.id} className="p-3 mb-2 flex items-start gap-3 rounded-lg border border-slate-100 bg-white hover:border-indigo-100 transition-colors group">
                  <button 
                    type="button"
                    aria-label={`Complete ${task.title}`}
                    onClick={() => completeTask(task.id)}
                    className="-ml-1 -mt-1 grid h-11 w-11 flex-shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-green-50 hover:text-green-600"
                  >
                    <CheckSquare size={18} />
                  </button>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-slate-800">{task.title}</h4>
                    {task.description && <p className="text-xs text-slate-500 mt-1">{task.description}</p>}
                    {task.due_date && (
                      <div className="flex items-center text-xs text-amber-600 mt-2 font-medium">
                        <Clock size={12} className="mr-1" />
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
    </HeaderPopover>
  );
};
