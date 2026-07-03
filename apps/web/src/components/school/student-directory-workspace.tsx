"use client";

import { buildBillingApiPath } from "@/lib/data/school-api-config";
import Link from "next/link";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { MetricGrid } from "@/components/experience/metric-grid";
import { StatusPill } from "@/components/ui/status-pill";
import { getSchoolWorkspace, type SchoolExperienceRole, buildSchoolStudentHref } from "@/lib/experiences/school-data";

import type { SchoolRouteMode } from "@/components/school/school-pages";
import { getMissingFieldError } from "@/components/school/school-pages";

type StudentSummaryData = {
  total?: number;
  active?: number;
  newAdmissions?: number;
  trendLabel?: string;
};

export function SchoolStudentsPage({
  role,
  tenantSlug,
  routeMode,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
  routeMode: SchoolRouteMode;
}) {
  const { model } = getSchoolWorkspace(role, tenantSlug);
  const [rows, setRows] = useState(model.students.rows);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [learnerName, setLearnerName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [className, setClassName] = useState("");
  const [parentContact, setParentContact] = useState("");
  const [studentError, setStudentError] = useState<string | null>(null);
  const [studentMessage, setStudentMessage] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<StudentSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      setSummaryLoading(true);
      try {
        const response = await fetch(buildBillingApiPath("/api/students/summary/dashboard", tenantSlug), {
          cache: "no-store",
        });
        if (response.ok) {
          setSummaryData(await response.json());
        }
      } catch {
      } finally {
        setSummaryLoading(false);
      }
    }
    loadSummary();
  }, [tenantSlug]);

  function resetStudentDraft() {
    setLearnerName("");
    setAdmissionNumber("");
    setClassName("");
    setParentContact("");
    setStudentError(null);
  }

  function openStudentModal() {
    resetStudentDraft();
    setShowAddStudentModal(true);
  }

  function closeStudentModal() {
    setShowAddStudentModal(false);
    setStudentError(null);
  }

  function saveStudent() {
    const validationError = getMissingFieldError([
      { label: "Learner name", value: learnerName },
      { label: "Admission number", value: admissionNumber },
      { label: "Class", value: className },
      { label: "Parent contact", value: parentContact },
    ]);

    if (validationError) {
      setStudentError(validationError);
      return;
    }

    const nextLearnerName = learnerName.trim();
    const nextAdmissionNumber = admissionNumber.trim();
    const nextClassName = className.trim();
    const nextParentContact = parentContact.trim();

    setRows((currentRows) => [
      {
        id: `student-${nextAdmissionNumber.toLowerCase()}`,
        name: nextLearnerName,
        admissionNumber: nextAdmissionNumber,
        className: nextClassName,
        parent: nextParentContact,
        balance: "KES 0",
        balanceTone: "ok",
      },
      ...currentRows,
    ]);
    setStudentError(null);
    setStudentMessage(`${nextLearnerName} added to the learner register.`);
    resetStudentDraft();
    setShowAddStudentModal(false);
  }

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Students"
        title="Learner register"
        description="Search, review, and open each learner profile with the balance and parent contact visible immediately."
        actions={<Button onClick={openStudentModal}>Add student</Button>}
      />
      {studentMessage ? (
        <div
          aria-live="polite"
          className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-foreground"
        >
          {studentMessage}
        </div>
      ) : null}
      {!summaryLoading && summaryData && (
        <MetricGrid
          columns="three"
          items={[
            {
              id: "total",
              label: "Total Students",
              value: summaryData.total?.toString() || "0",
              helper: "Registered students",
              trend: summaryData.trendLabel || "Stable",
            },
            {
              id: "active",
              label: "Active Students",
              value: summaryData.active?.toString() || "0",
              helper: "Currently enrolled",
            },
            {
              id: "new",
              label: "New Admissions",
              value: summaryData.newAdmissions?.toString() || "0",
              helper: "Admitted this month",
            },
          ]}
        />
      )}
      <DataTable
        title="Students"
        subtitle="Admission, family contact, class placement, and fee balance in one table."
        columns={[
          {
            id: "name",
            header: "Student Name",
            render: (row) => (
              <Link href={buildSchoolStudentHref(role, row.id, routeMode)} className="font-semibold text-foreground underline-offset-4 hover:underline">
                {row.name}
              </Link>
            ),
          },
          { id: "admissionNumber", header: "Admission Number", render: (row) => row.admissionNumber },
          { id: "className", header: "Class", render: (row) => row.className },
          { id: "parent", header: "Parent Contact", render: (row) => row.parent },
          {
            id: "balance",
            header: "Fee Balance",
            render: (row) => <StatusPill label={row.balance} tone={row.balanceTone} />,
          },
        ]}
        rows={rows}
        getRowKey={(row) => row.id}
      />
      <Modal
        open={showAddStudentModal}
        title="Add student"
        description="Create a learner entry that immediately appears in the register."
        onClose={closeStudentModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeStudentModal}>
              Cancel
            </Button>
            <Button onClick={saveStudent}>Save student</Button>
          </>
        }
      >
        <div className="space-y-4">
          {studentError ? (
            <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-foreground">
              {studentError}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-foreground">
            <span className="font-medium">Learner name</span>
            <input
              aria-label="Learner name"
              value={learnerName}
              onChange={(event) => {
                setLearnerName(event.target.value);
                setStudentError(null);
              }}
              className="input-base"
              placeholder="Learner full name"
            />
          </label>
          <label className="space-y-2 text-sm text-foreground">
            <span className="font-medium">Admission number</span>
            <input
              aria-label="Admission number"
              value={admissionNumber}
              onChange={(event) => {
                setAdmissionNumber(event.target.value);
                setStudentError(null);
              }}
              className="input-base"
              placeholder="Admission number"
            />
          </label>
          <label className="space-y-2 text-sm text-foreground">
            <span className="font-medium">Class</span>
            <input
              aria-label="Class"
              value={className}
              onChange={(event) => {
                setClassName(event.target.value);
                setStudentError(null);
              }}
              className="input-base"
              placeholder="Class and stream"
            />
          </label>
          <label className="space-y-2 text-sm text-foreground">
            <span className="font-medium">Parent contact</span>
            <input
              aria-label="Parent contact"
              value={parentContact}
              onChange={(event) => {
                setParentContact(event.target.value);
                setStudentError(null);
              }}
              className="input-base"
              inputMode="tel"
              placeholder="Parent phone number"
            />
          </label>
        </div>
        </div>
      </Modal>
    </div>
  );
}
