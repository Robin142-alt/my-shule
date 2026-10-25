/** Presentation only: retain the assessment ID and stored configuration. */
export function markbookPaperLabel(subject: string, paper: string, paperCount?: number): string {
  if (paperCount === 1) return "";
  const name = paper.trim();
  const subjectName = subject.trim();
  if (!name || name.toLowerCase() === subjectName.toLowerCase()) return "";
  const suffix = name.toLowerCase().startsWith(`${subjectName.toLowerCase()} `)
    ? name.slice(subjectName.length).trim().replace(/^[·:–—-]\s*/, "") : name;
  return /^main\s+paper$/i.test(suffix) ? "" : suffix;
}
