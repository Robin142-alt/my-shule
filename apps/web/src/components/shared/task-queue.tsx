import React, { useState } from 'react';
import { CheckSquare, Clock } from 'lucide-react';
import { useDashboardTasks } from '../../hooks/useDashboardTasks';

export const TaskQueue: React.FC = () => {
  const { tasks, completeTask } = useDashboardTasks();
  const [isOpen, setIsOpen] = useState(false);

  const openTasks = tasks.filter(t => t.status === 'open');

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-slate-400 hover:text-indigo-500 hover:bg-slate-100 transition-all duration-200"
      >
        <CheckSquare size={24} />
        {openTasks.length > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {openTasks.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur">
            <h3 className="font-semibold text-slate-800">My Tasks</h3>
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {openTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <CheckSquare className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm">No pending tasks</p>
              </div>
            ) : (
              openTasks.map((task) => (
                <div key={task.id} className="p-3 mb-2 flex items-start gap-3 rounded-lg border border-slate-100 bg-white hover:border-indigo-100 transition-colors group">
                  <button 
                    onClick={() => completeTask(task.id)}
                    className="mt-0.5 flex-shrink-0 text-slate-300 hover:text-green-500 transition-colors"
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
        </div>
      )}
    </div>
  );
};
