import React from 'react';
import { ActionDrawer } from './action-drawer';

interface EntityDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entityData: Record<string, any> | null;
  actions?: React.ReactNode;
}

export const EntityDetailDrawer: React.FC<EntityDetailDrawerProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  entityData, 
  actions 
}) => {
  return (
    <ActionDrawer 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title}
      footer={actions}
    >
      {entityData ? (
        <div className="space-y-6">
          {Object.entries(entityData).map(([key, value]) => (
            <div key={key} className="border-b border-slate-100 pb-4 last:border-0">
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                {key.replace(/_/g, ' ')}
              </dt>
              <dd className="text-sm text-slate-900 font-medium">
                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
              </dd>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex justify-center p-8">
          <div className="animate-pulse flex flex-col space-y-4 w-full">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
          </div>
        </div>
      )}
    </ActionDrawer>
  );
};
