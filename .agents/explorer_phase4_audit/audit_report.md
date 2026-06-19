# Event Consumer Audit Report

This audit report identifies all event consumer files under `apps/api/src/modules/` that are empty placeholder implementations (e.g., containing the comment `TODO: Implement domain logic` or having no functional domain implementation).

## Summary of Findings

* **Total Consumers Found**: 959
* **Total Empty/Placeholder Consumers**: 930
* **Critical Workflow Empty Consumers**: 150
* **Non-Critical Workflow Empty Consumers**: 780

---

## Module Breakdown

| Module | Category | Total Consumers | Empty Consumers | Implemented |
| :--- | :--- | :---: | :---: | :---: |
| **admissions** | Critical (Admissions) | 49 | **46** | 3 |
| **discipline** | Critical (Discipline) | 33 | **32** | 1 |
| **exams** | Critical (Exams) | 39 | **38** | 1 |
| **finance** | Critical (Finance) | 17 | **17** | 0 |
| **hostel** | Critical (Boarding) | 17 | **17** | 0 |
| **class-teacher** | Non-Critical | 40 | **40** | 0 |
| **events** | Non-Critical | 18 | **0** | 18 |
| **inventory** | Non-Critical | 11 | **11** | 0 |
| **operations** | Non-Critical | 711 | **705** | 6 |
| **security** | Non-Critical | 18 | **18** | 0 |
| **transport** | Non-Critical | 6 | **6** | 0 |

---

## Detailed Empty Consumers in Critical Workflows

Below is the list of all empty placeholder consumers in critical modules, organized by workflow.

### Module: ADMISSIONS (Critical (Admissions))
*Total Empty Consumers: 46*

| # | Class Name | Event Name (Binding) | File Path |
| :---: | :--- | :--- | :--- |
| 1 | `ApproveForPlacementConsumer` | `approve-for-placement.execution` | `api/src/modules/admissions/consumers/approve-for-placement.consumer.ts` |
| 2 | `ArchiveConsumer` | `archive.execution` | `api/src/modules/admissions/consumers/archive.consumer.ts` |
| 3 | `CancelOfferConsumer` | `cancel-offer.execution` | `api/src/modules/admissions/consumers/cancel-offer.consumer.ts` |
| 4 | `CreatesStudentRecordConsumer` | `creates-student-record.execution` | `api/src/modules/admissions/consumers/creates-student-record.consumer.ts` |
| 5 | `CreateStudentProfileConsumer` | `create-student-profile.execution` | `api/src/modules/admissions/consumers/create-student-profile.consumer.ts` |
| 6 | `CreateStudentRecordConsumer` | `create-student-record.execution` | `api/src/modules/admissions/consumers/create-student-record.consumer.ts` |
| 7 | `CreateStudentRecordsConsumer` | `create-student-records.execution` | `api/src/modules/admissions/consumers/create-student-records.consumer.ts` |
| 8 | `DuplicateConsumer` | `duplicate.execution` | `api/src/modules/admissions/consumers/duplicate.consumer.ts` |
| 9 | `EditAdmissionNoConsumer` | `edit-admission-no.execution` | `api/src/modules/admissions/consumers/edit-admission-no.consumer.ts` |
| 10 | `ExportEnrolledStudentsConsumer` | `export-enrolled-students.execution` | `api/src/modules/admissions/consumers/export-enrolled-students.consumer.ts` |
| 11 | `ExportPendingListConsumer` | `export-pending-list.execution` | `api/src/modules/admissions/consumers/export-pending-list.consumer.ts` |
| 12 | `ExportSelectedConsumer` | `export-selected.execution` | `api/src/modules/admissions/consumers/export-selected.consumer.ts` |
| 13 | `ExportTemplateConsumer` | `export-template.execution` | `api/src/modules/admissions/consumers/export-template.consumer.ts` |
| 14 | `ExportTransfersConsumer` | `export-transfers.execution` | `api/src/modules/admissions/consumers/export-transfers.consumer.ts` |
| 15 | `GenerateAdmissionNoConsumer` | `generate-admission-no.execution` | `api/src/modules/admissions/consumers/generate-admission-no.consumer.ts` |
| 16 | `GenerateAdmissionNumberConsumer` | `generate-admission-number.execution` | `api/src/modules/admissions/consumers/generate-admission-number.consumer.ts` |
| 17 | `GenerateAdmissionNumbersConsumer` | `generate-admission-numbers.execution` | `api/src/modules/admissions/consumers/generate-admission-numbers.consumer.ts` |
| 18 | `LinksParentConsumer` | `links-parent.execution` | `api/src/modules/admissions/consumers/links-parent.consumer.ts` |
| 19 | `MarkParentContactedConsumer` | `mark-parent-contacted.execution` | `api/src/modules/admissions/consumers/mark-parent-contacted.consumer.ts` |
| 20 | `NewReAdmissionConsumer` | `new-re-admission.execution` | `api/src/modules/admissions/consumers/new-re-admission.consumer.ts` |
| 21 | `NewTemplateConsumer` | `new-template.execution` | `api/src/modules/admissions/consumers/new-template.consumer.ts` |
| 22 | `NewTransferApplicationConsumer` | `new-transfer-application.execution` | `api/src/modules/admissions/consumers/new-transfer-application.consumer.ts` |
| 23 | `NotifyAccountantConsumer` | `notify-accountant.execution` | `api/src/modules/admissions/consumers/notify-accountant.consumer.ts` |
| 24 | `OpenConsumer` | `open.execution` | `api/src/modules/admissions/consumers/open.consumer.ts` |
| 25 | `OpenStudentProfileConsumer` | `open-student-profile.execution` | `api/src/modules/admissions/consumers/open-student-profile.consumer.ts` |
| 26 | `PreviewConsumer` | `preview.execution` | `api/src/modules/admissions/consumers/preview.consumer.ts` |
| 27 | `PrintAdmissionRegisterConsumer` | `print-admission-register.execution` | `api/src/modules/admissions/consumers/print-admission-register.consumer.ts` |
| 28 | `PrintAdmissionSlipConsumer` | `print-admission-slip.execution` | `api/src/modules/admissions/consumers/print-admission-slip.consumer.ts` |
| 29 | `PrintClearanceListConsumer` | `print-clearance-list.execution` | `api/src/modules/admissions/consumers/print-clearance-list.consumer.ts` |
| 30 | `PrintTransferChecklistConsumer` | `print-transfer-checklist.execution` | `api/src/modules/admissions/consumers/print-transfer-checklist.consumer.ts` |
| 31 | `RejectConsumer` | `reject.execution` | `api/src/modules/admissions/consumers/reject.consumer.ts` |
| 32 | `RequestApprovalConsumer` | `request-approval.execution` | `api/src/modules/admissions/consumers/request-approval.consumer.ts` |
| 33 | `RequestFinanceConfirmationConsumer` | `request-finance-confirmation.execution` | `api/src/modules/admissions/consumers/request-finance-confirmation.consumer.ts` |
| 34 | `RestoreDefaultConsumer` | `restore-default.execution` | `api/src/modules/admissions/consumers/restore-default.consumer.ts` |
| 35 | `SendAdmissionLetterConsumer` | `send-admission-letter.execution` | `api/src/modules/admissions/consumers/send-admission-letter.consumer.ts` |
| 36 | `SendPaymentInstructionsConsumer` | `send-payment-instructions.execution` | `api/src/modules/admissions/consumers/send-payment-instructions.consumer.ts` |
| 37 | `SendReminderConsumer` | `send-reminder.execution` | `api/src/modules/admissions/consumers/send-reminder.consumer.ts` |
| 38 | `SendsToClassTeacherRegisterConsumer` | `sends-to-class-teacher-register.execution` | `api/src/modules/admissions/consumers/sends-to-class-teacher-register.consumer.ts` |
| 39 | `SendsToFinanceForInvoiceGenerationConsumer` | `sends-to-finance-for-invoice-generation.execution` | `api/src/modules/admissions/consumers/sends-to-finance-for-invoice-generation.consumer.ts` |
| 40 | `SetActiveConsumer` | `set-active.execution` | `api/src/modules/admissions/consumers/set-active.consumer.ts` |
| 41 | `UndoEnrolmentConsumer` | `undo-enrolment.execution` | `api/src/modules/admissions/consumers/undo-enrolment.consumer.ts` |
| 42 | `UploadPaymentProofConsumer` | `upload-payment-proof.execution` | `api/src/modules/admissions/consumers/upload-payment-proof.consumer.ts` |
| 43 | `VerifyTransferLetterConsumer` | `verify-transfer-letter.execution` | `api/src/modules/admissions/consumers/verify-transfer-letter.consumer.ts` |
| 44 | `ViewFeeDetailsConsumer` | `view-fee-details.execution` | `api/src/modules/admissions/consumers/view-fee-details.consumer.ts` |
| 45 | `ViewFinanceResponseConsumer` | `view-finance-response.execution` | `api/src/modules/admissions/consumers/view-finance-response.consumer.ts` |
| 46 | `ViewHistoryConsumer` | `view-history.execution` | `api/src/modules/admissions/consumers/view-history.consumer.ts` |

### Module: FINANCE (Critical (Finance))
*Total Empty Consumers: 17*

| # | Class Name | Event Name (Binding) | File Path |
| :---: | :--- | :--- | :--- |
| 1 | `AddFeeItemConsumer` | `add-fee-item.execution` | `api/src/modules/finance/consumers/add-fee-item.consumer.ts` |
| 2 | `ApproveWaiverConsumer` | `approve-waiver.execution` | `api/src/modules/finance/consumers/approve-waiver.consumer.ts` |
| 3 | `AssignToClassConsumer` | `assign-to-class.execution` | `api/src/modules/finance/consumers/assign-to-class.consumer.ts` |
| 4 | `CreateFeeStructureConsumer` | `create-fee-structure.execution` | `api/src/modules/finance/consumers/create-fee-structure.consumer.ts` |
| 5 | `DownloadReceiptConsumer` | `download-receipt.execution` | `api/src/modules/finance/consumers/download-receipt.consumer.ts` |
| 6 | `DownloadStatementConsumer` | `download-statement.execution` | `api/src/modules/finance/consumers/download-statement.consumer.ts` |
| 7 | `DuplicatePreviousTermConsumer` | `duplicate-previous-term.execution` | `api/src/modules/finance/consumers/duplicate-previous-term.consumer.ts` |
| 8 | `ExportFeeStructureConsumer` | `export-fee-structure.execution` | `api/src/modules/finance/consumers/export-fee-structure.consumer.ts` |
| 9 | `ExportFinanceReportConsumer` | `export-finance-report.execution` | `api/src/modules/finance/consumers/export-finance-report.consumer.ts` |
| 10 | `ExportSelectedConsumer` | `export-selected.execution` | `api/src/modules/finance/consumers/export-selected.consumer.ts` |
| 11 | `LockFeeStructureConsumer` | `lock-fee-structure.execution` | `api/src/modules/finance/consumers/lock-fee-structure.consumer.ts` |
| 12 | `PayViaMPesaConsumer` | `pay-via-m-pesa.execution` | `api/src/modules/finance/consumers/pay-via-m-pesa.consumer.ts` |
| 13 | `PrintFinanceSummaryConsumer` | `print-finance-summary.execution` | `api/src/modules/finance/consumers/print-finance-summary.consumer.ts` |
| 14 | `RejectWaiverConsumer` | `reject-waiver.execution` | `api/src/modules/finance/consumers/reject-waiver.consumer.ts` |
| 15 | `SendPaymentQueryConsumer` | `send-payment-query.execution` | `api/src/modules/finance/consumers/send-payment-query.consumer.ts` |
| 16 | `ViewArrearsConsumer` | `view-arrears.execution` | `api/src/modules/finance/consumers/view-arrears.consumer.ts` |
| 17 | `ViewStatementConsumer` | `view-statement.execution` | `api/src/modules/finance/consumers/view-statement.consumer.ts` |

### Module: DISCIPLINE (Critical (Discipline))
*Total Empty Consumers: 32*

| # | Class Name | Event Name (Binding) | File Path |
| :---: | :--- | :--- | :--- |
| 1 | `AddStatementConsumer` | `add-statement.execution` | `api/src/modules/discipline/consumers/add-statement.consumer.ts` |
| 2 | `ApproveActionConsumer` | `approve-action.execution` | `api/src/modules/discipline/consumers/approve-action.consumer.ts` |
| 3 | `AssignDisciplineMasterConsumer` | `assign-discipline-master.execution` | `api/src/modules/discipline/consumers/assign-discipline-master.consumer.ts` |
| 4 | `AssignInvestigatorConsumer` | `assign-investigator.execution` | `api/src/modules/discipline/consumers/assign-investigator.consumer.ts` |
| 5 | `AssignSelectedConsumer` | `assign-selected.execution` | `api/src/modules/discipline/consumers/assign-selected.consumer.ts` |
| 6 | `CreateParentSummonsConsumer` | `create-parent-summons.execution` | `api/src/modules/discipline/consumers/create-parent-summons.consumer.ts` |
| 7 | `DownloadDisciplineReportConsumer` | `download-discipline-report.execution` | `api/src/modules/discipline/consumers/download-discipline-report.consumer.ts` |
| 8 | `ExportCasesConsumer` | `export-cases.execution` | `api/src/modules/discipline/consumers/export-cases.consumer.ts` |
| 9 | `ExportSelectedConsumer` | `export-selected.execution` | `api/src/modules/discipline/consumers/export-selected.consumer.ts` |
| 10 | `GenerateWarningLetterConsumer` | `generate-warning-letter.execution` | `api/src/modules/discipline/consumers/generate-warning-letter.consumer.ts` |
| 11 | `IssueWarningLetterConsumer` | `issue-warning-letter.execution` | `api/src/modules/discipline/consumers/issue-warning-letter.consumer.ts` |
| 12 | `MarkResolvedConsumer` | `mark-resolved.execution` | `api/src/modules/discipline/consumers/mark-resolved.consumer.ts` |
| 13 | `MarkReviewedConsumer` | `mark-reviewed.execution` | `api/src/modules/discipline/consumers/mark-reviewed.consumer.ts` |
| 14 | `NotifyParentConsumer` | `notify-parent.execution` | `api/src/modules/discipline/consumers/notify-parent.consumer.ts` |
| 15 | `NotifyParentsConsumer` | `notify-parents.execution` | `api/src/modules/discipline/consumers/notify-parents.consumer.ts` |
| 16 | `OpenCaseConsumer` | `open-case.execution` | `api/src/modules/discipline/consumers/open-case.consumer.ts` |
| 17 | `OpenSeriousCasesConsumer` | `open-serious-cases.execution` | `api/src/modules/discipline/consumers/open-serious-cases.consumer.ts` |
| 18 | `PrintCaseFileConsumer` | `print-case-file.execution` | `api/src/modules/discipline/consumers/print-case-file.consumer.ts` |
| 19 | `PrintCaseRegisterConsumer` | `print-case-register.execution` | `api/src/modules/discipline/consumers/print-case-register.consumer.ts` |
| 20 | `PrintCaseSummaryConsumer` | `print-case-summary.execution` | `api/src/modules/discipline/consumers/print-case-summary.consumer.ts` |
| 21 | `PrintDisciplineSummaryConsumer` | `print-discipline-summary.execution` | `api/src/modules/discipline/consumers/print-discipline-summary.consumer.ts` |
| 22 | `PrintSelectedConsumer` | `print-selected.execution` | `api/src/modules/discipline/consumers/print-selected.consumer.ts` |
| 23 | `RecommendSuspensionConsumer` | `recommend-suspension.execution` | `api/src/modules/discipline/consumers/recommend-suspension.consumer.ts` |
| 24 | `ReferToCounsellorConsumer` | `refer-to-counsellor.execution` | `api/src/modules/discipline/consumers/refer-to-counsellor.consumer.ts` |
| 25 | `ReferToPrincipalConsumer` | `refer-to-principal.execution` | `api/src/modules/discipline/consumers/refer-to-principal.consumer.ts` |
| 26 | `RejectActionConsumer` | `reject-action.execution` | `api/src/modules/discipline/consumers/reject-action.consumer.ts` |
| 27 | `SaveAndEscalateToPrincipalConsumer` | `save-and-escalate-to-principal.execution` | `api/src/modules/discipline/consumers/save-and-escalate-to-principal.consumer.ts` |
| 28 | `SaveAndNotifyParentConsumer` | `save-and-notify-parent.execution` | `api/src/modules/discipline/consumers/save-and-notify-parent.consumer.ts` |
| 29 | `SaveAndReferToCounsellorConsumer` | `save-and-refer-to-counsellor.execution` | `api/src/modules/discipline/consumers/save-and-refer-to-counsellor.consumer.ts` |
| 30 | `SaveIncidentConsumer` | `save-incident.execution` | `api/src/modules/discipline/consumers/save-incident.consumer.ts` |
| 31 | `ViewAuditTrailConsumer` | `view-audit-trail.execution` | `api/src/modules/discipline/consumers/view-audit-trail.consumer.ts` |
| 32 | `ViewCaseConsumer` | `view-case.execution` | `api/src/modules/discipline/consumers/view-case.consumer.ts` |

### Module: EXAMS (Critical (Exams))
*Total Empty Consumers: 38*

| # | Class Name | Event Name (Binding) | File Path |
| :---: | :--- | :--- | :--- |
| 1 | `AddAssessmentConsumer` | `add-assessment.execution` | `api/src/modules/exams/consumers/add-assessment.consumer.ts` |
| 2 | `AddPaperConsumer` | `add-paper.execution` | `api/src/modules/exams/consumers/add-paper.consumer.ts` |
| 3 | `ApproveResultsConsumer` | `approve-results.execution` | `api/src/modules/exams/consumers/approve-results.consumer.ts` |
| 4 | `AssignInvigilatorConsumer` | `assign-invigilator.execution` | `api/src/modules/exams/consumers/assign-invigilator.consumer.ts` |
| 5 | `AssignRoomConsumer` | `assign-room.execution` | `api/src/modules/exams/consumers/assign-room.consumer.ts` |
| 6 | `AssignSubjectsConsumer` | `assign-subjects.execution` | `api/src/modules/exams/consumers/assign-subjects.consumer.ts` |
| 7 | `CreateExamConsumer` | `create-exam.execution` | `api/src/modules/exams/consumers/create-exam.consumer.ts` |
| 8 | `DownloadExamProgressConsumer` | `download-exam-progress.execution` | `api/src/modules/exams/consumers/download-exam-progress.consumer.ts` |
| 9 | `DownloadMarkSheetConsumer` | `download-mark-sheet.execution` | `api/src/modules/exams/consumers/download-mark-sheet.consumer.ts` |
| 10 | `DownloadReportsConsumer` | `download-reports.execution` | `api/src/modules/exams/consumers/download-reports.consumer.ts` |
| 11 | `DuplicatePreviousExamConsumer` | `duplicate-previous-exam.execution` | `api/src/modules/exams/consumers/duplicate-previous-exam.consumer.ts` |
| 12 | `EnterMarksConsumer` | `enter-marks.execution` | `api/src/modules/exams/consumers/enter-marks.consumer.ts` |
| 13 | `EnterMyMarksConsumer` | `enter-my-marks.execution` | `api/src/modules/exams/consumers/enter-my-marks.consumer.ts` |
| 14 | `ExportProgressConsumer` | `export-progress.execution` | `api/src/modules/exams/consumers/export-progress.consumer.ts` |
| 15 | `ExportSelectedConsumer` | `export-selected.execution` | `api/src/modules/exams/consumers/export-selected.consumer.ts` |
| 16 | `FlagDelayConsumer` | `flag-delay.execution` | `api/src/modules/exams/consumers/flag-delay.consumer.ts` |
| 17 | `LockExamConsumer` | `lock-exam.execution` | `api/src/modules/exams/consumers/lock-exam.consumer.ts` |
| 18 | `LockSetupConsumer` | `lock-setup.execution` | `api/src/modules/exams/consumers/lock-setup.consumer.ts` |
| 19 | `MarkInvigilatorPresentConsumer` | `mark-invigilator-present.execution` | `api/src/modules/exams/consumers/mark-invigilator-present.consumer.ts` |
| 20 | `MessageExamsManagerConsumer` | `message-exams-manager.execution` | `api/src/modules/exams/consumers/message-exams-manager.consumer.ts` |
| 21 | `MessageTeacherConsumer` | `message-teacher.execution` | `api/src/modules/exams/consumers/message-teacher.consumer.ts` |
| 22 | `PrintInvigilationRosterConsumer` | `print-invigilation-roster.execution` | `api/src/modules/exams/consumers/print-invigilation-roster.consumer.ts` |
| 23 | `PrintInvigilationSlipConsumer` | `print-invigilation-slip.execution` | `api/src/modules/exams/consumers/print-invigilation-slip.consumer.ts` |
| 24 | `PrintMarkSheetConsumer` | `print-mark-sheet.execution` | `api/src/modules/exams/consumers/print-mark-sheet.consumer.ts` |
| 25 | `PrintReportCardsConsumer` | `print-report-cards.execution` | `api/src/modules/exams/consumers/print-report-cards.consumer.ts` |
| 26 | `RefreshConsumer` | `refresh.execution` | `api/src/modules/exams/consumers/refresh.consumer.ts` |
| 27 | `ReportExamIrregularityConsumer` | `report-exam-irregularity.execution` | `api/src/modules/exams/consumers/report-exam-irregularity.consumer.ts` |
| 28 | `ReportIrregularityConsumer` | `report-irregularity.execution` | `api/src/modules/exams/consumers/report-irregularity.consumer.ts` |
| 29 | `ReturnForCorrectionConsumer` | `return-for-correction.execution` | `api/src/modules/exams/consumers/return-for-correction.consumer.ts` |
| 30 | `SetGradingConsumer` | `set-grading.execution` | `api/src/modules/exams/consumers/set-grading.consumer.ts` |
| 31 | `SubmitMarksConsumer` | `submit-marks.execution` | `api/src/modules/exams/consumers/submit-marks.consumer.ts` |
| 32 | `SubmitToHodConsumer` | `submit-to-hod.execution` | `api/src/modules/exams/consumers/submit-to-hod.consumer.ts` |
| 33 | `UploadMarksConsumer` | `upload-marks.execution` | `api/src/modules/exams/consumers/upload-marks.consumer.ts` |
| 34 | `UploadMarksCsvConsumer` | `upload-marks-csv.execution` | `api/src/modules/exams/consumers/upload-marks-csv.consumer.ts` |
| 35 | `ViewExamConsumer` | `view-exam.execution` | `api/src/modules/exams/consumers/view-exam.consumer.ts` |
| 36 | `ViewLearnersConsumer` | `view-learners.execution` | `api/src/modules/exams/consumers/view-learners.consumer.ts` |
| 37 | `ViewPaperConsumer` | `view-paper.execution` | `api/src/modules/exams/consumers/view-paper.consumer.ts` |
| 38 | `ViewProgressConsumer` | `view-progress.execution` | `api/src/modules/exams/consumers/view-progress.consumer.ts` |

### Module: HOSTEL (Critical (Boarding))
*Total Empty Consumers: 17*

| # | Class Name | Event Name (Binding) | File Path |
| :---: | :--- | :--- | :--- |
| 1 | `DownloadStatementConsumer` | `download-statement.execution` | `api/src/modules/hostel/consumers/download-statement.consumer.ts` |
| 2 | `ExportAttendanceConsumer` | `export-attendance.execution` | `api/src/modules/hostel/consumers/export-attendance.consumer.ts` |
| 3 | `ExportOnboardingReportConsumer` | `export-onboarding-report.execution` | `api/src/modules/hostel/consumers/export-onboarding-report.consumer.ts` |
| 4 | `ExportSelectedConsumer` | `export-selected.execution` | `api/src/modules/hostel/consumers/export-selected.consumer.ts` |
| 5 | `MarkAbsentConsumer` | `mark-absent.execution` | `api/src/modules/hostel/consumers/mark-absent.consumer.ts` |
| 6 | `MarkInternalNoteConsumer` | `mark-internal-note.execution` | `api/src/modules/hostel/consumers/mark-internal-note.consumer.ts` |
| 7 | `MarkLateConsumer` | `mark-late.execution` | `api/src/modules/hostel/consumers/mark-late.consumer.ts` |
| 8 | `MarkPresentConsumer` | `mark-present.execution` | `api/src/modules/hostel/consumers/mark-present.consumer.ts` |
| 9 | `NotifyParentConsumer` | `notify-parent.execution` | `api/src/modules/hostel/consumers/notify-parent.consumer.ts` |
| 10 | `OpenSchoolTenantConsumer` | `open-school-tenant.execution` | `api/src/modules/hostel/consumers/open-school-tenant.consumer.ts` |
| 11 | `RefreshConsumer` | `refresh.execution` | `api/src/modules/hostel/consumers/refresh.consumer.ts` |
| 12 | `ResendSetupReminderConsumer` | `resend-setup-reminder.execution` | `api/src/modules/hostel/consumers/resend-setup-reminder.consumer.ts` |
| 13 | `SendMessageConsumer` | `send-message.execution` | `api/src/modules/hostel/consumers/send-message.consumer.ts` |
| 14 | `SwitchChildConsumer` | `switch-child.execution` | `api/src/modules/hostel/consumers/switch-child.consumer.ts` |
| 15 | `ViewChecklistConsumer` | `view-checklist.execution` | `api/src/modules/hostel/consumers/view-checklist.consumer.ts` |
| 16 | `ViewFeesConsumer` | `view-fees.execution` | `api/src/modules/hostel/consumers/view-fees.consumer.ts` |
| 17 | `ViewReportCardConsumer` | `view-report-card.execution` | `api/src/modules/hostel/consumers/view-report-card.consumer.ts` |

