import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export type SyllabusSubtopic = { id: string; title: string; required: boolean; archived: boolean; expected_on?: string | null };
export type SyllabusTopic = { id: string; title: string; expected_on: string; archived: boolean; subtopics: SyllabusSubtopic[] };
export type SyllabusMilestone = { id: string; title: string; due_on: string; subtopic_ids: string[] };
export type SyllabusContent = { topics: SyllabusTopic[]; milestones: SyllabusMilestone[] };
export type CoverageEntry = { subtopic_id: string; completed: boolean; completed_at?: string | null; note?: string | null };

export function validateSyllabusContent(input: any, term: { starts_on: string; ends_on: string }, previous?: SyllabusContent): SyllabusContent {
  const fail = (message: string): never => { throw new BadRequestException(message); };
  const text = (value: unknown, label: string) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 300
    ? value.trim() : fail(`${label} must contain between 1 and 300 characters.`);
  const date = (value: unknown) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value))
      || new Date(value).toISOString().slice(0, 10) !== value) fail('Enter a valid completion date.');
    if ((value as string) < term.starts_on || (value as string) > term.ends_on) fail('Completion dates must fall within the selected term.');
    return value as string;
  };
  const ids = new Set<string>();
  const id = (value: unknown) => {
    const result = value == null ? randomUUID() : String(value);
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(result) || ids.has(result)) fail('Topic, subtopic and milestone IDs must be valid and unique.');
    ids.add(result); return result;
  };
  const bool = (value: unknown, fallback: boolean) => value === undefined ? fallback : typeof value === 'boolean' ? value : fail('Required and archived values must be boolean.');
  if (!Array.isArray(input?.topics) || input.topics.length > 100 || !Array.isArray(input?.milestones) || input.milestones.length > 100) {
    fail('Provide up to 100 topics and 100 milestones.');
  }
  let count = 0;
  const topics: SyllabusTopic[] = input.topics.map((topic: any) => {
    if (!Array.isArray(topic?.subtopics) || (count += topic.subtopics.length) > 2000) fail('Provide at most 2,000 subtopics.');
    return { id: id(topic.id), title: text(topic.title, 'Topic title'), expected_on: date(topic.expected_on), archived: bool(topic.archived, false),
      subtopics: topic.subtopics.map((sub: any) => ({ id: id(sub?.id), title: text(sub?.title, 'Subtopic title'), required: bool(sub?.required, true),
        archived: bool(sub?.archived, false), expected_on: sub?.expected_on ? date(sub.expected_on) : null })) };
  });
  const subtopics = new Map(topics.flatMap(topic => topic.subtopics.map(sub => [sub.id, { ...sub, parent_archived: topic.archived }] as const)));
  const milestones: SyllabusMilestone[] = input.milestones.map((milestone: any) => {
    if (!Array.isArray(milestone?.subtopic_ids) || !milestone.subtopic_ids.length || milestone.subtopic_ids.length > 2000
      || new Set(milestone.subtopic_ids).size !== milestone.subtopic_ids.length
      || milestone.subtopic_ids.some((key: unknown) => typeof key !== 'string' || !subtopics.has(key))) fail('Each milestone must reference distinct existing subtopics.');
    return { id: id(milestone.id), title: text(milestone.title, 'Milestone title'), due_on: date(milestone.due_on), subtopic_ids: milestone.subtopic_ids };
  });
  if (previous) {
    for (const topic of previous.topics) {
      const next = topics.find(item => item.id === topic.id);
      if (!next || topic.subtopics.some(sub => !next.subtopics.some(item => item.id === sub.id))) {
        fail('Revisions must retain existing topics and subtopics. Archive them to preserve recorded coverage.');
      }
    }
  }
  if (!topics.some(topic => !topic.archived && topic.subtopics.some(sub => sub.required && !sub.archived))) {
    fail('Retain at least one active required subtopic before publishing a syllabus.');
  }
  return { topics, milestones };
}

export function syllabusProgress(content: SyllabusContent, entries: CoverageEntry[], today: string) {
  const completed = new Set(entries.filter(entry => entry.completed).map(entry => entry.subtopic_id));
  const completionDates = new Map(entries.filter(entry => entry.completed && entry.completed_at).map(entry => [entry.subtopic_id,
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(entry.completed_at!))]));
  const topics = content.topics.filter(topic => !topic.archived);
  const active = topics.flatMap(topic => topic.subtopics.filter(sub => !sub.archived).map(sub => ({ ...sub, topic: topic.title, due_on: sub.expected_on || topic.expected_on })));
  const required = active.filter(sub => sub.required);
  const milestones = content.milestones.map(milestone => {
    const targets = active.filter(sub => milestone.subtopic_ids.includes(sub.id));
    const remaining = targets.filter(sub => !completed.has(sub.id));
    const late = targets.some(sub => (completionDates.get(sub.id) ?? '') > milestone.due_on);
    return { ...milestone, total: targets.length, completed: targets.length - remaining.length,
      status: targets.length === 0 ? 'No active subtopics' : remaining.length === 0 ? late ? 'Completed late' : 'Completed' : milestone.due_on < today ? 'Overdue' : 'Upcoming' };
  }).sort((a, b) => a.due_on.localeCompare(b.due_on));
  const expected = new Set(required.filter(sub => sub.due_on < today).map(sub => sub.id));
  for (const milestone of milestones.filter(item => item.due_on < today)) {
    required.filter(sub => milestone.subtopic_ids.includes(sub.id)).forEach(sub => expected.add(sub.id));
  }
  const remaining = required.filter(sub => !completed.has(sub.id));
  const overdue = remaining.filter(sub => expected.has(sub.id));
  const done = required.length - remaining.length;
  return { total: required.length, completed: done, remaining, overdue,
    percentage: required.length ? Math.round(1000 * done / required.length) / 10 : 0,
    expected_percentage: required.length ? Math.round(1000 * expected.size / required.length) / 10 : 0,
    completed_topics: topics.filter(topic => {
      const requirements = topic.subtopics.filter(sub => sub.required && !sub.archived);
      return requirements.length > 0 && requirements.every(sub => completed.has(sub.id));
    }).length,
    total_topics: topics.length, milestones,
    status: !required.length ? 'No required subtopics' : !remaining.length ? 'Completed' : overdue.length || milestones.some(item => item.status === 'Overdue') ? 'Behind' : 'On track' };
}
