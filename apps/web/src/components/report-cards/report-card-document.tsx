"use client";

import type { ReactNode } from "react";
import { Download, Printer, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  getReportCardFilename,
  getReportCardTitle,
  getReportCardTypeLabel,
  type ReportCardDocumentData,
} from "@/lib/report-cards/curriculum-report-cards";

function hasValue(value?: string | null) {
  return Boolean(value && value.trim());
}

function EmptyLine({ children }: { children: string }) {
  return (
    <p className="rounded border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
      {children}
    </p>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="border border-slate-300 px-2 py-1.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-slate-900">{hasValue(String(value ?? "")) ? value : "Not recorded"}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="break-inside-avoid">
      <h3 className="border border-slate-900 bg-slate-900 px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-white">
        {title}
      </h3>
      <div className="border-x border-b border-slate-300 p-3">{children}</div>
    </section>
  );
}

function ReportCardHeader({ report }: { report: ReportCardDocumentData }) {
  return (
    <header className="border-b-2 border-slate-900 pb-3">
      <div className="flex items-start gap-4">
        {report.school.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={report.school.logoUrl}
            alt={`${report.school.name} logo`}
            className="h-16 w-16 shrink-0 border-2 border-slate-900 bg-white object-contain p-1"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-slate-900 text-lg font-black">
            {report.school.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1 text-center">
          <h1 className="text-xl font-black uppercase tracking-[0.08em] text-slate-950">{report.school.name}</h1>
          {report.school.motto ? <p className="mt-1 text-[11px] font-semibold italic text-slate-700">{report.school.motto}</p> : null}
          <p className="mt-1 text-[10px] text-slate-600">
            {[report.school.address, report.school.phone, report.school.email, report.school.website].filter(Boolean).join(" | ")}
          </p>
        </div>
        <div className="w-28 shrink-0 border border-slate-400 px-2 py-2 text-center">
          <p className="text-[9px] font-bold uppercase text-slate-500">Status</p>
          <p className="mt-1 text-[10px] font-black uppercase text-slate-950">{report.curriculum.reportStatus}</p>
        </div>
      </div>
      <div className="mt-3 text-center">
        <h2 className="text-base font-black uppercase tracking-[0.08em] text-slate-950">
          {getReportCardTitle(report.curriculum.reportCardType)}
        </h2>
        <p className="mt-1 text-[11px] font-semibold text-slate-600">
          {getReportCardTypeLabel(report.curriculum.reportCardType)} | {report.academic.academicYear} | {report.academic.term}
        </p>
      </div>
    </header>
  );
}

function IdentitySection({ report }: { report: ReportCardDocumentData }) {
  const learnerLabel = report.curriculum.reportCardType === "LEGACY_844_KCSE" ? "Student Details" : "Learner Details";

  return (
    <Section title={learnerLabel}>
      <div className="grid grid-cols-2 gap-0 md:grid-cols-4">
        <Field label="Full name" value={report.learner.fullName} />
        <Field label="Admission No." value={report.learner.admissionNumber} />
        <Field label="UPI / Assessment No." value={report.learner.upi} />
        <Field label="Grade/Form" value={report.learner.gradeForm} />
        <Field label="Stream" value={report.learner.stream} />
        <Field label="Gender" value={report.learner.gender} />
        <Field label="Boarding/Day" value={report.learner.boardingStatus} />
        <Field label="Class teacher" value={report.learner.classTeacher} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-0 md:grid-cols-4">
        <Field label="Reporting period" value={report.academic.reportingPeriod} />
        <Field label="Closing date" value={report.academic.closingDate} />
        <Field label="Next opening" value={report.academic.nextTermOpeningDate} />
        <Field label="Learner status" value={report.learner.status} />
      </div>
    </Section>
  );
}

function CbcSummarySection({ report }: { report: ReportCardDocumentData }) {
  if (report.curriculum.reportCardType === "LEGACY_844_KCSE") {
    return null;
  }

  return (
    <Section title="Learner Progress Summary">
      <div className="grid gap-2 md:grid-cols-3">
        <Field label="Overall progress" value={report.cbcProgress.overallDescriptor} />
        <Field label="Learning areas completed" value={report.cbcProgress.learningAreasCompleted} />
        <Field label="Attendance" value={report.cbcProgress.attendancePercentage} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-[10px] font-black uppercase text-slate-500">Strongest areas</p>
          {report.cbcProgress.strongestAreas?.length ? (
            <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-slate-800">
              {report.cbcProgress.strongestAreas.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : (
            <EmptyLine>No competency strengths have been recorded for this reporting period.</EmptyLine>
          )}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase text-slate-500">Areas needing support</p>
          {report.cbcProgress.areasForImprovement?.length ? (
            <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-slate-800">
              {report.cbcProgress.areasForImprovement.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : (
            <EmptyLine>No support areas have been recorded for this reporting period.</EmptyLine>
          )}
        </div>
      </div>
    </Section>
  );
}

function CompetencyTable({ report }: { report: ReportCardDocumentData }) {
  if (report.curriculum.reportCardType === "LEGACY_844_KCSE") {
    return null;
  }

  return (
    <Section title="Learning Areas and Competency Progress">
      {report.learningAreas.length ? (
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              {["Learning Area", "Assessment Task / Activity", "Performance Level", "Descriptor", "Teacher Observation", "Parent Support"].map((head) => (
                <th key={head} className="border border-slate-300 px-2 py-1 text-left font-black uppercase text-slate-700">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.learningAreas.map((row) => (
              <tr key={`${row.learningArea}-${row.task}`}>
                <td className="border border-slate-300 px-2 py-1 font-semibold">{row.learningArea}</td>
                <td className="border border-slate-300 px-2 py-1">{row.task || "No assessment task recorded"}</td>
                <td className="border border-slate-300 px-2 py-1">{row.performanceLevel || "No level recorded"}</td>
                <td className="border border-slate-300 px-2 py-1">{row.descriptor || "Descriptor missing"}</td>
                <td className="border border-slate-300 px-2 py-1">{row.teacherObservation || "No teacher observation has been entered."}</td>
                <td className="border border-slate-300 px-2 py-1">{row.parentSupport || "No parent support guidance has been entered."}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyLine>No competency observations have been entered for this learner yet.</EmptyLine>
      )}
    </Section>
  );
}

function MarksTable({ report }: { report: ReportCardDocumentData }) {
  if (report.curriculum.reportCardType === "CBC_CBE_COMPETENCY") {
    return null;
  }

  if (report.curriculum.reportCardType === "HYBRID_CBC_MARKS" && !report.permissions.canViewMarksSupplement) {
    return null;
  }

  const title = report.curriculum.reportCardType === "HYBRID_CBC_MARKS"
    ? "Marks-Based Assessment Supplement"
    : "Legacy Subject Results";

  return (
    <Section title={title}>
      {report.marksSupplement.length ? (
        <div>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                {["Code", "Subject / Learning Area", "Component", "Score", "Grade", "Teacher Comment", "Teacher"].map((head) => (
                  <th key={head} className="border border-slate-300 px-2 py-1 text-left font-black uppercase text-slate-700">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.marksSupplement.map((row) => (
                <tr key={`${row.subjectName}-${row.assessmentComponent}`}>
                  <td className="border border-slate-300 px-2 py-1">{row.subjectCode || "-"}</td>
                  <td className="border border-slate-300 px-2 py-1 font-semibold">{row.subjectName}</td>
                  <td className="border border-slate-300 px-2 py-1">{row.assessmentComponent || "Assessment"}</td>
                  <td className="border border-slate-300 px-2 py-1">{row.score || "No marks entered"}</td>
                  <td className="border border-slate-300 px-2 py-1">{row.grade || "No grade"}</td>
                  <td className="border border-slate-300 px-2 py-1">{row.teacherComment || "No subject teacher comment has been entered."}</td>
                  <td className="border border-slate-300 px-2 py-1">{row.teacherName || "Teacher not recorded"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.academicSummary ? (
            <div className="grid grid-cols-2 border-x border-b border-amber-300 bg-amber-50 md:grid-cols-4">
              <Field label="Total score" value={report.academicSummary.totalScore} />
              <Field label="Mean score" value={report.academicSummary.meanScore} />
              <Field label="Percentage" value={report.academicSummary.percentage} />
              <Field label="Overall grade" value={report.academicSummary.overallGrade} />
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyLine>No marks have been entered for this reporting period yet.</EmptyLine>
      )}
    </Section>
  );
}

function CompactListSection({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{ label: string; value?: string }>;
  empty: string;
}) {
  return (
    <Section title={title}>
      {items.length ? (
        <div className="grid gap-2 md:grid-cols-2">
          {items.map((item) => (
            <div key={`${item.label}-${item.value}`} className="border border-slate-300 px-3 py-2">
              <p className="text-[10px] font-black uppercase text-slate-500">{item.label}</p>
              <p className="mt-1 text-[11px] text-slate-800">{item.value || "No comment recorded"}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyLine>{empty}</EmptyLine>
      )}
    </Section>
  );
}

function CommentsAndSignatures({ report }: { report: ReportCardDocumentData }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Section title="Official Comments">
        <div className="space-y-2">
          <Field label="Class teacher" value={report.comments.classTeacher || "No official comment has been added yet."} />
          <Field label="Dean/Academics" value={report.comments.deanAcademics || "No official comment has been added yet."} />
          <Field label="Principal/Deputy" value={report.comments.principalDeputy || "No official comment has been added yet."} />
        </div>
      </Section>
      <Section title="Signatures and Stamp">
        <div className="space-y-3">
          {report.signatures.map((signature) => (
            <div key={signature.role} className="grid grid-cols-[1fr_1fr] gap-3 text-[11px]">
              <span className="font-semibold">{signature.role}</span>
              <span className="border-b border-slate-500 pb-1">{signature.name || "Signature"}</span>
            </div>
          ))}
          <div className="mt-3 h-16 border border-dashed border-slate-500 text-center text-[10px] font-bold uppercase leading-[4rem] text-slate-500">
            School stamp
          </div>
        </div>
      </Section>
    </div>
  );
}

function Footer({ report }: { report: ReportCardDocumentData }) {
  const generatedAt = new Date(report.verification.generatedAt);
  const generatedAtLabel = Number.isNaN(generatedAt.valueOf())
    ? report.verification.generatedAt
    : generatedAt.toLocaleString();

  return (
    <footer className="border-t border-slate-900 pt-2 text-[9px] text-slate-600">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>Report No: {report.reportNumber}</span>
        <span>Generated by: {report.verification.generatedBy}</span>
        <span>Generated: {generatedAtLabel}</span>
        <span>{report.verification.qrValue || "QR pending"}</span>
      </div>
      <p className="mt-1 font-semibold">{report.verification.securityNote}</p>
    </footer>
  );
}

export function ReportCardDocument({ report }: { report: ReportCardDocumentData }) {
  const isLegacyReport = report.curriculum.reportCardType === "LEGACY_844_KCSE";
  const showCompetencySections = !isLegacyReport;
  const values = report.values.map((value) => ({ label: value.value, value: value.comment || value.rating }));
  const projects = report.projects.map((project) => ({ label: `${project.category}: ${project.title}`, value: project.note }));
  const competencies = report.coreCompetencies.map((item) => ({ label: item.competency, value: [item.level, item.observation, item.evidence].filter(Boolean).join(" | ") }));
  const descriptorItems = report.descriptorLegend.map((item) => ({ label: item.code, value: item.label }));
  const gradingItems = report.gradingScale.map((item) => ({ label: item.grade, value: [item.range, item.points ? `${item.points} points` : null].filter(Boolean).join(" | ") }));

  return (
    <article
      id={`report-card-document-${report.id}`}
      className="mx-auto min-h-[1123px] w-full max-w-[794px] bg-white p-6 text-slate-950 shadow-sm print:shadow-none"
      data-testid="report-card-document"
    >
      <div className="space-y-3 border-2 border-slate-900 p-4">
        <ReportCardHeader report={report} />
        <IdentitySection report={report} />
        <CbcSummarySection report={report} />
        <CompetencyTable report={report} />
        <MarksTable report={report} />
        {showCompetencySections ? <CompactListSection title="Core Competencies" items={competencies} empty="No core competency evidence is available for this reporting period." /> : null}
        {showCompetencySections ? <CompactListSection title="Values and Character Development" items={values} empty="No values or character observations have been recorded." /> : null}
        {showCompetencySections ? <CompactListSection title="Projects, Practicals and Talents" items={projects} empty="No projects, practicals, clubs, sports, or talent notes have been recorded." /> : null}
        <Section title="Attendance, Conduct and Fees">
          <div className="grid gap-2 md:grid-cols-3">
            <Field label="Attendance" value={report.attendance?.percentage || "No attendance records are available for this reporting period."} />
            <Field label="Conduct" value={report.permissions.canViewConduct ? report.conduct?.generalConduct : "Conduct details are restricted by school policy."} />
            <Field label="Fees" value={report.permissions.canViewFees ? report.feeSummary?.balanceLabel : "Fee visibility is disabled for this report."} />
          </div>
        </Section>
        {showCompetencySections ? <CompactListSection title="Parent / Guardian Support" items={report.learningAreas.map((area) => ({ label: area.learningArea, value: area.parentSupport })).filter((item) => item.value)} empty="No parent support guidance has been entered." /> : null}
        {showCompetencySections ? <CompactListSection title="Descriptor Legend" items={descriptorItems} empty="Competency descriptors have not been configured." /> : null}
        {report.gradingScale.length ? <CompactListSection title="Grading Scale" items={gradingItems} empty="Grading scale has not been configured." /> : null}
        <CommentsAndSignatures report={report} />
        <Footer report={report} />
      </div>
    </article>
  );
}

export function ReportCardActionBar({
  report,
  onPrint,
  onDownloadPdf,
}: {
  report: ReportCardDocumentData;
  onPrint: () => void;
  onDownloadPdf: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface p-3 print:hidden">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label={getReportCardTypeLabel(report.curriculum.reportCardType)} tone="ok" />
          <StatusPill label={report.curriculum.reportStatus} tone={report.curriculum.reportStatus === "Published" ? "ok" : "warning"} />
        </div>
        <p className="mt-1 truncate text-[12px] text-muted">{getReportCardFilename(report)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onDownloadPdf}>
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
        <Button onClick={onPrint}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
  );
}

export function ReportCardVerificationStrip({ report }: { report: ReportCardDocumentData }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-success/20 bg-success/10 px-3 py-2 text-[12px] font-semibold text-foreground">
      <ShieldCheck className="h-4 w-4 text-success" />
      <span>{report.verification.securityNote}</span>
    </div>
  );
}
