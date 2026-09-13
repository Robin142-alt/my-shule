# Exam review and publication

Teacher mark entry and submission go directly to the Dean of Academics. The Dean reviews or returns marks for correction, then locks reviewed marks. The Exams Manager generates and submits report cards, the Dean approves them, and the Principal publishes the exam results. Existing reviewed marks remain in the Dean lock queue; submitted marks require no migration.

HOD and HOS do not moderate or lock marks. Their analytics and analytics PDFs include only published exam series with published marks and current published report cards. Department and subject appointments, school isolation, comparisons and requested filters all retain the same authorization boundary. Withdrawal removes those results from subsequent analytics reads. Staff who also teach continue through their Teacher dashboard and assigned teaching scope.

HOD exam links open Exam Analytics, including older moderation links. Submission notifications go to the Dean; locking notifies the Exams Manager; publication notifies HOD and HOS with links to their scoped analytics. Review and lock transitions persist their audit entries atomically with the marks change. Returned marks retain the correction reason.

Verification covers direct submission to the Dean, denial of legacy HOD/HOS review permissions, corrections, publication notifications, real PostgreSQL transitions and audit records, prepublication and withdrawal visibility, tenant isolation, existing report release controls, and interface actions and empty states.
