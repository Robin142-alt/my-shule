"use client";

import { TeacherMarksProgress } from "./teacher-marks-progress";

export function MarksEntryWorkspace({ onOpenSetup }: { onOpenSetup: () => void }) {
  return <TeacherMarksProgress showWindowControls onOpenSetup={onOpenSetup} />;
}
