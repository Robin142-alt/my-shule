"use client";
import { SyllabusWorkspace } from '../syllabus-workspace';
import { syllabusButton } from '@/lib/modules/syllabus-types';
export function CurriculumCoverageWorkspace({onOpenPlans,onOpenLogs}: {onOpenPlans?:()=>void;onOpenLogs?:()=>void}) {
  return <div className="space-y-3"><div className="flex flex-wrap gap-2">
    {onOpenPlans && <button className={syllabusButton} onClick={onOpenPlans}>Lesson plans</button>}
    {onOpenLogs && <button className={syllabusButton} onClick={onOpenLogs}>Lesson logs</button>}
  </div><SyllabusWorkspace /></div>;
}
