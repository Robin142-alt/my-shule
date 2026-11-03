"use client";

import { createContext, useContext, type ReactNode } from 'react';

const WorkspacePresentation = createContext<string | undefined>(undefined);

/** Portals retain their originating workspace's presentation without styling other roles. */
export function WorkspacePresentationProvider({ dialogClassName, children }: { dialogClassName: string; children: ReactNode }) {
  return <WorkspacePresentation.Provider value={dialogClassName}>{children}</WorkspacePresentation.Provider>;
}

export function useWorkspaceDialogClass() { return useContext(WorkspacePresentation); }
