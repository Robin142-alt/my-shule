import React, {  useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export interface ToastProps {
  id: string;
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'info';
  onClose: (id: string) => void;
}

export const WorkflowToast: React.FC<ToastProps> = ({ id, title, message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-100',
    error: 'bg-red-50 border-red-100',
    info: 'bg-blue-50 border-blue-100'
  };

  return (
    <div className={`flex items-start p-4 mb-3 rounded-lg border shadow-lg max-w-sm w-full transition-all duration-300 transform translate-x-0 ${bgColors[type]}`}>
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <div className="ml-3 flex-1">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        {message && <p className="text-xs text-slate-600 mt-1">{message}</p>}
      </div>
      <button 
        onClick={() => onClose(id)} 
        className="ml-4 flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

// Simple Toast Container Manager (in a real app, use react-hot-toast or similar)
export const ToastContainer: React.FC<{ toasts: Omit<ToastProps, 'onClose'>[], removeToast: (id: string) => void }> = ({ toasts, removeToast }) => (
  <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
    {toasts.map(t => (
      <WorkflowToast key={t.id} {...t} onClose={removeToast} />
    ))}
  </div>
);
