"use client";

import { useState, type ReactNode } from "react";
import {
  Award,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  Download,
  GraduationCap,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  School,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  getReportCardFilename,
  getReportCardTypeLabel,
  type ReportCardDocumentData,
} from "@/lib/report-cards/curriculum-report-cards";

const navy = "#08265f";
const gold = "#f2a900";

function numeric(input?: string | null) {
  const match = input?.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function percentage(row: ReportCardDocumentData["marksSupplement"][number]) {
  const direct = numeric(row.finalScore ?? row.percentage);
  if (direct !== null) return Math.min(100, Math.max(0, direct));
  const parts = row.score?.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (parts.length >= 2 && parts[1] > 0) return Math.min(100, (parts[0] / parts[1]) * 100);
  return parts.length ? Math.min(100, parts[0]) : null;
}

function period(report: ReportCardDocumentData) {
  return [report.academic.term, report.academic.academicYear].filter(Boolean).join(", ")
    || report.academic.reportingPeriod
    || undefined;
}

function curriculum(report: ReportCardDocumentData) {
  if (report.curriculum.reportCardType === "LEGACY_844_KCSE") return "8-4-4 / KCSE";
  if (report.curriculum.reportCardType === "HYBRID_CBC_MARKS") return "CBC + Marks";
  return "CBC / CBE";
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.05em] text-[#08265f]">
      <span className="text-[#f2a900]">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function Info({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="min-w-0 border-r border-slate-200 px-2 last:border-r-0">
      <p className="text-[7px] font-black text-[#08265f]">{label}</p>
      <p className="mt-1 truncate text-[9px] font-semibold text-slate-900">{children}</p>
    </div>
  );
}

function Header({ report }: { report: ReportCardDocumentData }) {
  const reportingPeriod = period(report);
  return (
    <header data-report-section="header" className="border-b-2 border-[#08265f] pb-2">
      <div className="grid grid-cols-[76px_1fr_76px] items-center gap-3">
        <div className="flex h-[66px] w-[66px] items-center justify-center rounded-xl border border-[#e4aa31] bg-white p-1 shadow-sm">
          {report.school.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={report.school.logoUrl} alt={`${report.school.name} logo`} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-lg bg-[#08265f] text-[#f2a900]">
              <School className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="min-w-0 text-center">
          <div className="flex items-center justify-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/myshule-mark-192.png" alt="MyShule" className="h-9 w-9 object-contain" />
            <p className="text-[24px] font-black leading-none tracking-tight text-[#08265f]">My<span className="text-[#f2a900]">Shule</span></p>
          </div>
          <h1 className="mt-1 truncate text-[19px] font-black leading-tight text-[#08265f]">{report.school.name}</h1>
          {report.school.motto ? <p className="mt-0.5 text-[7px] font-semibold italic text-slate-500">{report.school.motto}</p> : null}
        </div>
        <div className="rounded-xl border border-[#dce4f0] bg-[#f7faff] p-2 text-center">
          <p className="text-[6px] font-black uppercase tracking-[0.12em] text-slate-500">Report No.</p>
          <p className="mt-1 truncate text-[8px] font-black text-[#08265f]">{report.reportNumber}</p>
          <p className="mt-1 text-[6px] font-bold uppercase text-[#0f8a69]">{report.curriculum.reportStatus}</p>
        </div>
      </div>

      <div className="mx-auto mt-2 flex max-w-[610px] items-center justify-center divide-x divide-slate-300 border-b border-[#efb340] pb-1.5 text-[8px] font-semibold text-[#08265f]">
        <span className="flex items-center gap-1 px-3"><BookOpenCheck className="h-3 w-3" />Academic Report Card</span>
        {reportingPeriod ? <span className="flex items-center gap-1 px-3"><CalendarDays className="h-3 w-3" />{reportingPeriod}</span> : null}
        <span className="flex items-center gap-1 px-3"><GraduationCap className="h-3 w-3" />Curriculum: {curriculum(report)}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[7px] font-medium text-slate-600">
        {report.school.address ? <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5 text-[#08265f]" />{report.school.address}</span> : null}
        {report.school.email ? <span className="flex items-center gap-1"><Mail className="h-2.5 w-2.5 text-[#08265f]" />{report.school.email}</span> : null}
        {report.school.phone ? <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5 text-[#08265f]" />{report.school.phone}</span> : null}
      </div>
    </header>
  );
}

function StudentInformation({ report }: { report: ReportCardDocumentData }) {
  const present = report.attendance?.daysPresent;
  const total = report.attendance?.totalDays;
  const attendance = present !== undefined && total !== undefined ? `${present}/${total}` : report.attendance?.percentage;
  const candidateFields: Array<[string, string | number | undefined]> = [
    ["Student Name", report.learner.fullName],
    ["Adm No.", report.learner.admissionNumber],
    ["Grade/Class", report.learner.gradeForm],
    ["Stream", report.learner.stream],
    ["Gender", report.learner.gender],
    ["Academic Year", report.academic.academicYear],
    ["Class Teacher", report.learner.classTeacher],
    ["Days Present", attendance],
    ["Closing Date", report.academic.closingDate],
    ["Opening Date", report.academic.nextTermOpeningDate],
  ];
  const fields = candidateFields.filter(
    (entry): entry is [string, string | number] => entry[1] !== undefined && String(entry[1]).trim() !== "",
  );
  const rows = Array.from({ length: Math.ceil(fields.length / 5) }, (_, index) => fields.slice(index * 5, (index + 1) * 5));

  return (
    <section data-report-section="student-information" className="rounded-lg border border-slate-200 px-2 py-2">
      <SectionTitle icon={<UserRound className="h-3.5 w-3.5" />}>Student Information</SectionTitle>
      {rows.map((row, rowIndex) => <div key={rowIndex} className={`mt-2 grid ${rowIndex ? "border-t border-slate-200 pt-2" : ""}`} style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>{row.map(([label, display]) => <Info key={label} label={label}>{display}</Info>)}</div>)}
    </section>
  );
}

function MarksTable({ report }: { report: ReportCardDocumentData }) {
  const legacy = report.curriculum.reportCardType === "LEGACY_844_KCSE";
  const examName = report.academic.reportingPeriod.trim() || "Assessment";
  return (
    <>
      <p className="sr-only">{legacy ? "Legacy Subject Results" : "Marks-Based Assessment Supplement"}</p>
      <table className="w-full table-fixed border-collapse text-[7.5px]">
        <thead>
          <tr className="bg-[#eef5fb] text-[#08265f]">
            <th className="border border-slate-200 px-2 py-1 text-left">Subject</th>
            <th className="border border-slate-200 px-1 py-1">{examName}</th>
            <th className="border border-slate-200 px-1 py-1">Grade</th>
            <th className="border border-slate-200 px-2 py-1">Achievement Level</th>
          </tr>
        </thead>
        <tbody>
          {report.marksSupplement.length ? report.marksSupplement.map((row, index) => {
            const result = row.finalScore ?? row.percentage;
            const scorePercentage = result ? numeric(result) : percentage(row);
            const displayScore = scorePercentage === null ? result ?? row.score : `${scorePercentage}%`;
            return (
              <tr key={`${row.subjectName}-${index}`} className="even:bg-slate-50/60">
                <td className="border border-slate-200 px-2 py-[3px] font-semibold">{row.subjectName}</td>
                <td className="border border-slate-200 px-1 py-[3px] text-center font-bold">{displayScore}</td>
                <td className="border border-slate-200 px-1 py-[3px] text-center font-black text-[#08265f]">{row.grade}</td>
                <td className="border border-slate-200 px-2 py-[3px] text-center">{row.achievementLevel ?? row.teacherComment}</td>
              </tr>
            );
          }) : null}
        </tbody>
      </table>
      {report.academicSummary ? (
        <div className="grid divide-x divide-[#e6b54b] rounded-b-lg border border-[#e6b54b] bg-[#fff9ec] text-center text-[8px] text-[#08265f]" style={{ gridTemplateColumns: `repeat(${[report.academicSummary.percentage ?? report.academicSummary.meanScore, report.academicSummary.overallGrade, report.academicSummary.classPosition ?? report.academicSummary.totalScore].filter(Boolean).length}, minmax(0, 1fr))` }}>
          {report.academicSummary.percentage ?? report.academicSummary.meanScore ? <p className="p-1.5">Average: <strong className="text-[11px]">{report.academicSummary.percentage ?? report.academicSummary.meanScore}</strong></p> : null}
          {report.academicSummary.overallGrade ? <p className="p-1.5">Overall Grade: <strong className="text-[11px]">{report.academicSummary.overallGrade}</strong></p> : null}
          {report.academicSummary.classPosition ?? report.academicSummary.totalScore ? <p className="p-1.5">{report.academicSummary.classPosition ? "Class Position" : "Total Score"}: <strong className="text-[11px]">{report.academicSummary.classPosition ?? report.academicSummary.totalScore}</strong></p> : null}
        </div>
      ) : null}
    </>
  );
}

function CompetencyTable({ report }: { report: ReportCardDocumentData }) {
  return (
    <>
      <p className="sr-only">Learning Areas and Competency Progress</p>
      <table className="w-full table-fixed border-collapse text-[7.5px]">
        <thead><tr className="bg-[#eef5fb] text-[#08265f]">
          {[
            ["Learning Area", "24%"], ["Assessment Task", "20%"], ["Performance Level", "16%"],
            ["Descriptor", "18%"], ["Teacher Observation", "22%"],
          ].map(([heading, width]) => <th key={heading} style={{ width }} className="border border-slate-200 px-2 py-1 text-left">{heading}</th>)}
        </tr></thead>
        <tbody>
          {report.learningAreas.length ? report.learningAreas.map((row, index) => (
            <tr key={`${row.learningArea}-${index}`} className="even:bg-slate-50/60">
              <td className="border border-slate-200 px-2 py-[3px] font-semibold">{row.learningArea}</td>
              <td className="border border-slate-200 px-2 py-[3px]">{row.task}</td>
              <td className="border border-slate-200 px-2 py-[3px]">{row.performanceLevel}</td>
              <td className="border border-slate-200 px-2 py-[3px]">{row.descriptor}</td>
              <td className="border border-slate-200 px-2 py-[3px]">{row.teacherObservation}</td>
            </tr>
          )) : null}
        </tbody>
      </table>
    </>
  );
}

function AcademicPerformance({ report }: { report: ReportCardDocumentData }) {
  const showMarks = report.curriculum.reportCardType !== "CBC_CBE_COMPETENCY" && report.permissions.canViewMarksSupplement;
  const learningAreaSummary = report.learningAreas.slice(0, 4).map((area) => {
    const result = area.performanceLevel ?? area.descriptor;
    return result ? `${area.learningArea} - ${result}` : null;
  }).filter((item): item is string => item !== null);
  if (showMarks ? !report.marksSupplement.length : !report.learningAreas.length) {
    return <div className="sr-only"><p>{showMarks ? "Legacy Subject Results" : "Learning Areas and Competency Progress"}</p>{report.gradingScale.length ? <p>Grading Scale</p> : null}{report.descriptorLegend.length ? <p>Descriptor Legend</p> : null}</div>;
  }
  return (
    <section data-report-section="academic-performance" className="overflow-hidden rounded-lg border border-slate-200">
      <div className="flex items-center justify-between bg-[#08265f] px-3 py-1.5 text-white">
        <h2 className="text-[10px] font-black uppercase tracking-[0.04em]">Academic Performance</h2>
        <span className="text-[6px] font-semibold uppercase tracking-[0.12em] text-blue-100">{report.academic.reportingPeriod}</span>
      </div>
      {showMarks ? <MarksTable report={report} /> : <CompetencyTable report={report} />}
      {showMarks && learningAreaSummary.length ? (
        <div className="border-t border-slate-200 bg-[#f8fbff] px-3 py-1.5 text-[7px]"><strong className="text-[#08265f]">Learning Areas and Competency Progress:</strong> {learningAreaSummary.join(" | ")}</div>
      ) : null}
      {report.gradingScale.length ? <div className="border-t border-slate-200 px-3 py-1 text-[6.5px] text-slate-500"><strong className="text-[#08265f]">Grading Scale:</strong> {report.gradingScale.map((item) => `${item.grade} ${item.range}`).join(" | ")}</div> : null}
      {report.descriptorLegend.length ? <div className="border-t border-slate-200 px-3 py-1 text-[6.5px] text-slate-500"><strong className="text-[#08265f]">Descriptor Legend:</strong> {report.descriptorLegend.map((item) => `${item.code} - ${item.label}`).join(" | ")}</div> : null}
    </section>
  );
}

function Development({ report }: { report: ReportCardDocumentData }) {
  if (report.curriculum.reportCardType === "LEGACY_844_KCSE") return null;
  const panels = [
    {
      title: "Core Competencies",
      body: report.coreCompetencies.slice(0, 3).map((item) => [item.competency, item.level ?? item.observation].filter(Boolean).join(": ")).filter(Boolean).join(" | "),
    },
    {
      title: "Values and Character Development",
      body: report.values.slice(0, 3).map((item) => [item.value, item.rating ?? item.comment].filter(Boolean).join(": ")).filter(Boolean).join(" | "),
    },
    {
      title: "Parent / Guardian Support",
      body: report.learningAreas.filter((item) => item.parentSupport).slice(0, 2).map((item) => item.parentSupport).filter(Boolean).join(" | "),
    },
  ].filter((panel) => panel.body);
  if (!panels.length) return null;
  return (
    <section className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[6.5px]" style={{ gridTemplateColumns: `repeat(${panels.length}, minmax(0, 1fr))` }}>
      {panels.map((panel) => <div key={panel.title}><p className="font-black text-[#08265f]">{panel.title}</p><p className="mt-1 text-slate-600">{panel.body}</p></div>)}
    </section>
  );
}

function Metric({ icon, label, metric, accent }: { icon: ReactNode; label: string; metric: string; accent: "navy" | "gold" }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-1.5">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white ${accent === "gold" ? "bg-[#f2a900]" : "bg-[#08265f]"}`}>{icon}</div>
      <div className="min-w-0"><p className="text-[6px] font-black uppercase text-slate-500">{label}</p><p className="truncate text-[10px] font-black text-[#08265f]">{metric}</p></div>
    </div>
  );
}

function Analytics({ report }: { report: ReportCardDocumentData }) {
  const rows = report.marksSupplement
    .map((row) => ({ row, percent: percentage(row) }))
    .filter((entry): entry is { row: ReportCardDocumentData["marksSupplement"][number]; percent: number } => entry.percent !== null)
    .sort((left, right) => right.percent - left.percent);
  const attendance = report.analytics?.attendancePercentage ?? report.attendance?.percentage;
  const bestSubject = report.analytics?.bestSubject ?? rows[0]?.row.subjectName;
  const improvement = report.analytics?.improvement;
  const conduct = report.permissions.canViewConduct ? report.analytics?.conduct ?? report.conduct?.generalConduct : undefined;
  const currentAverage = numeric(report.academicSummary?.percentage ?? report.academicSummary?.meanScore);
  const persistedTerms = [...(report.analytics?.termHistory ?? [])].reverse();
  const currentTermLabel = report.academic.term || report.academic.reportingPeriod;
  const termHistory = persistedTerms.length
    ? persistedTerms
    : currentAverage !== null && currentTermLabel
      ? [{ examSeriesId: report.id, label: currentTermLabel, percentage: currentAverage }]
      : [];
  const termPoints = termHistory.map((entry, index) => ({
    ...entry,
    x: 30 + ((136 * index) / Math.max(1, termHistory.length - 1)),
    y: 72 - (Math.min(100, Math.max(0, entry.percentage)) * 0.52),
  }));
  const historyRows = report.analytics?.subjectHistory ?? [];
  const historyTerms = [...new Map(historyRows.map((entry) => [entry.examSeriesId, entry.label])).entries()].map(([id, label]) => ({ id, label }));
  const subjectNames = [...new Set(historyRows.map((entry) => entry.subjectName))].slice(0, 4);
  const palette = [navy, gold, "#6fa83a", "#7244b8"];
  const subjectLines = subjectNames.map((subjectName, subjectIndex) => ({
    subjectName,
    color: palette[subjectIndex] ?? navy,
    points: historyTerms.map((term, termIndex) => {
      const entry = historyRows.find((row) => row.examSeriesId === term.id && row.subjectName === subjectName);
      return entry ? {
        x: 30 + ((136 * termIndex) / Math.max(1, historyTerms.length - 1)),
        y: 72 - (Math.min(100, Math.max(0, entry.percentage)) * 0.52),
        percentage: entry.percentage,
      } : null;
    }).filter((point): point is { x: number; y: number; percentage: number } => point !== null),
  })).filter((line) => line.points.length);
  const currentSubjectLines = subjectLines.length ? subjectLines : rows.slice(0, 4).map((entry, index) => ({
    subjectName: entry.row.subjectName,
    color: palette[index] ?? navy,
    points: [{ x: 166, y: 72 - (entry.percent * 0.52), percentage: entry.percent }],
  }));
  const subjectTermLabels = historyTerms.length ? historyTerms : currentTermLabel ? [{ id: report.id, label: currentTermLabel }] : [];
  const metrics: Array<{ label: string; metric: string; icon: ReactNode; accent: "navy" | "gold" }> = [];
  if (attendance) metrics.push({ label: "Attendance", metric: attendance, icon: <Users className="h-4 w-4" />, accent: "navy" });
  if (bestSubject) metrics.push({ label: "Best Subject", metric: bestSubject, icon: <Trophy className="h-4 w-4" />, accent: "gold" });
  if (improvement) metrics.push({ label: "Improvement", metric: improvement, icon: <TrendingUp className="h-4 w-4" />, accent: "navy" });
  if (conduct) metrics.push({ label: "Conduct", metric: conduct, icon: <Award className="h-4 w-4" />, accent: "gold" });
  if (!termPoints.length && !currentSubjectLines.length && !metrics.length) return null;

  return (
    <div className={`grid gap-2 ${metrics.length ? "grid-cols-[minmax(0,2.35fr)_minmax(160px,0.9fr)]" : "grid-cols-1"}`}>
      <section data-report-section="performance-analytics" className="rounded-lg border border-slate-200 p-2">
        <SectionTitle icon={<BarChart3 className="h-3.5 w-3.5" />}>Performance Analytics</SectionTitle>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-md border border-slate-200 bg-[#fbfdff] p-1.5">
            <p className="text-center text-[7px] font-black text-[#08265f]">Term Performance Trend</p>
            <svg viewBox="0 0 190 100" className="mt-0.5 h-[96px] w-full" role="img" aria-label="Current and prior term performance trend">
              {[20, 46, 72].map((y, index) => <g key={y}><line x1="25" y1={y} x2="174" y2={y} stroke={index === 2 ? "#8795a9" : "#e1e7ef"} strokeWidth="0.8" /><text x="20" y={y + 2} textAnchor="end" fontSize="5" fill="#607087">{100 - (index * 50)}</text></g>)}
              <line x1="25" y1="20" x2="25" y2="72" stroke="#8795a9" strokeWidth="0.8" />
              {termPoints.length > 1 ? <polyline points={termPoints.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="#f2a900" strokeWidth="2" strokeLinejoin="round" /> : null}
              {termPoints.map((point) => <g key={point.examSeriesId}><circle cx={point.x} cy={point.y} r="3.7" fill="#f2a900" /><text x={point.x} y={Math.max(13, point.y - 7)} textAnchor="middle" fontSize="5.5" fontWeight="700" fill="#08265f">{Math.round(point.percentage * 10) / 10}%</text><text x={point.x} y="83" textAnchor="middle" fontSize="5.5" fill="#607087">{point.label.length > 9 ? `${point.label.slice(0, 8)}.` : point.label}</text></g>)}
            </svg>
          </div>
          <div className="rounded-md border border-slate-200 bg-[#fbfdff] p-1.5">
            <p className="text-center text-[7px] font-black text-[#08265f]">Subject Performance</p>
            <svg viewBox="0 0 190 100" className="mt-0.5 h-[96px] w-full" role="img" aria-label="Current term subject performance">
              {[20, 46, 72].map((y, index) => <g key={y}><line x1="25" y1={y} x2="174" y2={y} stroke={index === 2 ? "#8795a9" : "#e1e7ef"} strokeWidth="0.8" /><text x="20" y={y + 2} textAnchor="end" fontSize="5" fill="#607087">{100 - (index * 50)}</text></g>)}
              <line x1="25" y1="20" x2="25" y2="72" stroke="#8795a9" strokeWidth="0.8" />
              {currentSubjectLines.map((line) => <g key={line.subjectName}>{line.points.length > 1 ? <polyline points={line.points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke={line.color} strokeWidth="1.7" strokeLinejoin="round" /> : null}{line.points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="3" fill={line.color} />)}</g>)}
              {subjectTermLabels.map((term, index) => <text key={term.id} x={30 + ((136 * index) / Math.max(1, subjectTermLabels.length - 1))} y="83" textAnchor="middle" fontSize="5" fill="#607087">{term.label.length > 9 ? `${term.label.slice(0, 8)}.` : term.label}</text>)}
              {currentSubjectLines.map((line, index) => <g key={`legend-${line.subjectName}`}><circle cx={31 + ((index % 2) * 83)} cy={91 + (Math.floor(index / 2) * 8)} r="2.2" fill={line.color} /><text x={36 + ((index % 2) * 83)} y={93 + (Math.floor(index / 2) * 8)} fontSize="5" fill="#607087">{line.subjectName.length > 13 ? `${line.subjectName.slice(0, 12)}.` : line.subjectName}</text></g>)}
            </svg>
          </div>
        </div>
      </section>
      {metrics.length ? <section data-report-section="summary-overview" className="rounded-lg border border-slate-200 p-2">
        <SectionTitle icon={<Sparkles className="h-3.5 w-3.5" />}>Summary Overview</SectionTitle>
        <div className="mt-2 grid gap-1.5">
          {metrics.map((metric) => <Metric key={metric.label} {...metric} />)}
        </div>
      </section> : null}
    </div>
  );
}

function ReportSignature({ label, imageUrl }: { label: string; imageUrl?: string }) {
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  return (
    <div>
      {imageUrl ? (
        <div className="relative min-h-9">
          {status === "loading" ? <p role="status" className="text-slate-500 print:hidden">Loading signature...</p> : null}
          {status === "failed" ? (
            <p role="alert" className="text-amber-800">
              Signature could not load. <button type="button" className="font-bold underline print:hidden" onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }}>Retry {label.toLowerCase()}</button>
            </p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${imageUrl}${attempt ? `${imageUrl.includes("?") ? "&" : "?"}retry=${attempt}` : ""}`} alt={label} className="mx-auto h-9 w-36 max-w-full object-contain" onLoad={() => setStatus("loaded")} onError={() => setStatus("failed")} />
          )}
        </div>
      ) : <p className="text-slate-500">No saved signature. Upload and regenerate.</p>}
      <div className="mt-1 border-b border-slate-500" />
      <p className="mt-1 text-slate-600">{label}</p>
    </div>
  );
}

function Comments({ report }: { report: ReportCardDocumentData }) {
  const teacher = report.signatures.find((item) => /class teacher/i.test(item.role));
  const principal = report.signatures.find((item) => /principal|deputy/i.test(item.role));
  const comments = [
    report.comments.classTeacher ? { label: "Class Teacher Comment:", body: report.comments.classTeacher } : null,
    report.comments.principalDeputy ? { label: "Principal Comment:", body: report.comments.principalDeputy } : null,
  ].filter((comment): comment is { label: string; body: string } => comment !== null);
  return (
    <section data-report-section="comments" className="rounded-lg border border-slate-200 p-2">
      <SectionTitle icon={<MessageCircle className="h-3.5 w-3.5" />}>Comments</SectionTitle>
      {comments.length ? <div className="mt-2 grid divide-x divide-slate-200 text-[7px]" style={{ gridTemplateColumns: `repeat(${comments.length}, minmax(0, 1fr))` }}>{comments.map((comment, index) => <div key={comment.label} className={index ? "pl-3" : "pr-3"}><p className="font-black text-[#08265f]">{comment.label}</p><p className="mt-1 leading-relaxed text-slate-700">{comment.body}</p></div>)}</div> : null}
      <div data-report-section="signatures" className="mt-3 grid grid-cols-2 gap-16 px-14 text-center text-[7px]">
        <ReportSignature key={`${report.id}-teacher-${teacher?.imageUrl}`} label="Class Teacher Signature" imageUrl={teacher?.imageUrl} />
        <ReportSignature key={`${report.id}-principal-${principal?.imageUrl}`} label="Principal Signature" imageUrl={principal?.imageUrl} />
      </div>
    </section>
  );
}

function Footer({ report }: { report: ReportCardDocumentData }) {
  return <footer data-report-section="footer" className="flex items-center justify-center gap-1.5 border-t border-[#e4aa31] pt-1.5 text-[6.5px] font-semibold text-[#08265f]"><LockKeyhole className="h-3 w-3 text-[#f2a900]" /><span>{report.verification.securityNote || "Generated securely by MyShule School Management System"}</span><span className="text-slate-400">|</span><span>Report {report.reportNumber}</span></footer>;
}

export function ReportCardDocument({ report }: { report: ReportCardDocumentData }) {
  return (
    <article id={`report-card-document-${report.id}`} className="report-card-a4 mx-auto w-full bg-white text-slate-950 shadow-xl print:shadow-none" data-testid="report-card-document" data-report-card-layout="reference-a4" data-report-card-pages="1">
      <div className="report-card-a4__content space-y-2.5">
        <Header report={report} />
        <StudentInformation report={report} />
        <AcademicPerformance report={report} />
        <Development report={report} />
        <Analytics report={report} />
        <Comments report={report} />
        <Footer report={report} />
      </div>
    </article>
  );
}

export function ReportCardActionBar({ report, onPrint, onDownloadPdf }: { report: ReportCardDocumentData; onPrint: () => void; onDownloadPdf: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface p-3 print:hidden">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusPill label={getReportCardTypeLabel(report.curriculum.reportCardType)} tone="ok" /><StatusPill label={report.curriculum.reportStatus} tone={report.curriculum.reportStatus === "Published" ? "ok" : "warning"} /></div><p className="mt-1 truncate text-[12px] text-muted">{getReportCardFilename(report)}</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={onDownloadPdf}><Download className="h-4 w-4" />Download PDF</Button><Button onClick={onPrint}><Printer className="h-4 w-4" />Print</Button></div>
    </div>
  );
}

export function ReportCardVerificationStrip({ report }: { report: ReportCardDocumentData }) {
  return <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-success/20 bg-success/10 px-3 py-2 text-[12px] font-semibold text-foreground"><ShieldCheck className="h-4 w-4 text-success" /><span>{report.verification.securityNote}</span></div>;
}
