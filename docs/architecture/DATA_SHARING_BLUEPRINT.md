# MyShule Data Sharing Blueprint

## 1. Core Meaning of Data Sharing in MyShule

Data sharing in MyShule means:

> **All dashboards inside one school must use the same real school database records, but each role only sees and edits what they are allowed to access.**

So MyShule must not behave like many separate dashboards.

It must behave like **one connected school system**.

Example:

When the **Admissions Officer admits a student**, that student should become part of the school’s shared student database.

That same student can then be accessed by:

* Principal
* Deputy Principal
* Secretary
* Class Teacher
* Grade/Form Master
* Accountant/Bursar
* Teacher
* Nurse
* Librarian
* Discipline Master
* Transport Manager
* Boarding Master
* Exams Manager
* Parent Portal
* Student Portal

But each role sees the student differently.

The **Accountant** sees fee balance.
The **Nurse** sees health records.
The **Librarian** sees book loans.
The **Class Teacher** sees attendance and class profile.
The **Principal** sees everything as oversight.
The **Parent** sees only their own child.

---

# 2. Main Rule

## One School = One Shared Data Space

Every school in MyShule is a tenant.

Every important record must have:

```ts
school_id
```

This applies to:

```ts
students
parents
staff
classes
streams
subjects
fees
receipts
attendance
exams
marks
discipline
health
library
inventory
transport
boarding
messages
approvals
audit_logs
```

So the main rule is:

```text
Every dashboard must read and write shared school data using school_id.
No dashboard should use isolated mock data, fake arrays, local-only state, or duplicated records.
```

---

# 3. The Big Architecture

MyShule should follow this structure:

```text
School Database
   ↓
Shared Backend Services
   ↓
Tenant-Scoped APIs
   ↓
Role-Based Permissions
   ↓
Dashboard Workspaces
```

Meaning:

```text
All dashboards use the same backend.
All backend services use the same database.
All records are filtered by school_id.
All role access is controlled by permissions.
```

---

# 4. Correct Data Sharing Model

## Bad Model

This is wrong:

```text
Admissions Dashboard has its own students
Secretary Dashboard has its own students
Accountant Dashboard has its own students
Class Teacher Dashboard has its own students
Nurse Dashboard has its own students
```

That creates disconnected dashboards.

## Correct Model

This is right:

```text
Shared students table
   ↓
Admissions creates student
   ↓
Secretary reads student
   ↓
Accountant creates fee account for same student
   ↓
Class Teacher assigns student to class
   ↓
Nurse adds health record to same student
   ↓
Librarian issues book to same student
   ↓
Parent sees same student in portal
```

There should be **one student record**, connected to many modules.

---

# 5. Central Shared Entities

## 5.1 School

The school is the root tenant.

```ts
School {
  id
  name
  code
  county
  curriculum_mode
  plan
  status
}
```

Everything belongs to a school.

---

## 5.2 Student

The student is one of the most important shared records.

```ts
Student {
  id
  school_id
  admission_number
  first_name
  middle_name
  last_name
  gender
  date_of_birth
  class_id
  stream_id
  status
  admission_date
  boarding_status
  transport_status
  parent_guardian_id
}
```

A student should not be recreated in each dashboard.

Instead, other modules attach records to this same student.

Example:

```ts
FeeAccount.student_id
Attendance.student_id
HealthVisit.student_id
DisciplineCase.student_id
LibraryLoan.student_id
ExamMark.student_id
TransportAssignment.student_id
BoardingAssignment.student_id
```

---

## 5.3 Parent / Guardian

```ts
ParentGuardian {
  id
  school_id
  full_name
  phone
  email
  relationship
  national_id_optional
}
```

A parent can have multiple students.

```ts
StudentGuardian {
  id
  school_id
  student_id
  guardian_id
  relationship
  is_primary
}
```

This allows the Parent Portal to show only the children linked to that parent.

---

## 5.4 Staff / Users / Roles

```ts
User {
  id
  school_id
  full_name
  email
  phone
  role
  status
}
```

Roles include:

```text
Principal
Deputy Principal
School Admin
Secretary
Admissions Officer
Accountant/Bursar
Dean of Academics
Exams Manager
HOD
Teacher
Class Teacher
Grade/Form Master
Discipline Master
Counsellor
Nurse
Librarian
Storekeeper
Boarding Master
Security Officer
Transport Manager
Lab Technician
ICT/Assets Officer
Parent
Student
```

Each user belongs to a school, except Super Admin and System Monitor, who operate at platform level.

---

# 6. Dashboard Data Sharing by Role

## 6.1 Principal Dashboard

The Principal sees the full school picture.

Reads from:

```text
students
staff
classes
attendance
fees
exams
discipline
health
library
inventory
transport
boarding
approvals
audit_logs
```

Principal actions:

```text
Approve sensitive actions
Invite staff
Review school performance
View fee summaries
View attendance trends
View discipline reports
View exam analytics
Monitor school setup
```

The Principal does not own separate data.
The Principal dashboard is an oversight window into the shared school database.

---

## 6.2 Admissions Officer Dashboard

Admissions creates new student records.

Writes to:

```text
students
student_guardians
admission_applications
documents
class_placements
```

After admitting a student, the system should automatically make the student available to:

```text
Secretary
Principal
Class Teacher
Accountant
Nurse
Librarian
Transport Manager
Boarding Master
Parent Portal
Student Portal
```

Admission should also trigger follow-up tasks:

```text
Create student profile
Link parent/guardian
Assign class/stream
Create fee account
Create student portal account if enabled
Create parent portal link if enabled
Notify Class Teacher
Notify Accountant
Notify Secretary
```

---

## 6.3 Secretary Dashboard

Secretary uses shared student, parent, staff, visitor, and communication records.

Reads from:

```text
students
parents
staff
appointments
visitor_logs
letters
messages
```

Writes to:

```text
appointments
letters
call_logs
front_office_requests
visitor_notes
messages
```

Example:

If a parent visits asking about a student, the Secretary should search the shared student database, not a separate secretary list.

---

## 6.4 Accountant / Bursar Dashboard

The Accountant works on the same students admitted by Admissions.

Reads from:

```text
students
classes
parents
fee_structures
fee_accounts
invoices
payments
receipts
arrears
```

Writes to:

```text
fee_structures
invoices
payments
receipts
waiver_requests
reconciliation_records
```

Example:

When Accountant records a payment, the updated fee balance should appear in:

```text
Principal dashboard
Class Teacher dashboard
Parent Portal
Student Portal
Secretary dashboard if allowed
```

---

## 6.5 Teacher Dashboard

Teacher uses shared class, subject, student, attendance, assignment, and exam data.

Reads from:

```text
students
classes
subjects
timetable
assignments
attendance
marks
lesson_plans
```

Writes to:

```text
attendance
assignments
lesson_logs
marks
homework
comments
```

Example:

When a teacher marks attendance, the same attendance data should appear in:

```text
Class Teacher dashboard
Principal dashboard
Parent Portal
Reports
Student profile
```

---

## 6.6 Class Teacher Dashboard

Class Teacher has class-level access.

Reads from:

```text
students in assigned class
attendance
fees summary
discipline
health alerts
exam performance
parent contacts
```

Writes to:

```text
class comments
attendance follow-ups
parent meeting notes
class reports
```

Class Teacher should not have a separate student list.
They should read from the same students table filtered by:

```ts
school_id
class_id
stream_id
assigned_class_teacher_id
```

---

## 6.7 Exams Manager Dashboard

Exams Manager uses the same students, classes, subjects, and teachers.

Reads from:

```text
students
classes
subjects
teachers
exam_sessions
marks
grading_rules
```

Writes to:

```text
exam_sessions
exam_timetables
marks
grading_rules
report_cards
results_release_status
```

When marks are entered, the results should be visible to:

```text
Principal
Dean of Academics
HOD
Teacher
Class Teacher
Parent Portal after release
Student Portal after release
```

---

## 6.8 Nurse Dashboard

Nurse uses the same student records.

Reads from:

```text
students
parents
classes
health_records
medicine_inventory
```

Writes to:

```text
sick_bay_visits
medicine_dispensing_logs
health_alerts
parent_notifications
```

Example:

When Nurse treats a student, that health note attaches to the same student profile.

Principal can see health summary.
Parent can receive notification.
Class Teacher can see limited health alert if necessary.

---

## 6.9 Librarian Dashboard

Librarian uses shared student and staff records.

Reads from:

```text
students
staff
books
book_copies
library_loans
fines
```

Writes to:

```text
book_issues
book_returns
overdue_records
lost_books
library_fines
```

Example:

If a student borrows a book, that book loan should appear in:

```text
Student profile
Parent Portal
Class Teacher dashboard if overdue
Principal reports
```

---

## 6.10 Discipline Master Dashboard

Discipline Master uses shared student records.

Reads from:

```text
students
classes
parents
staff
discipline_cases
```

Writes to:

```text
discipline_cases
actions_taken
parent_notifications
counsellor_referrals
principal_approval_requests
```

Example:

A discipline case should attach to the same student profile.

It can trigger:

```text
Parent SMS
Class Teacher alert
Counsellor referral
Principal approval
Student record update
```

---

## 6.11 Boarding Master Dashboard

Boarding Master uses the same students.

Reads from:

```text
students
boarding_assignments
hostels
rooms
beds
attendance
discipline
health_flags
```

Writes to:

```text
hostel_allocations
bed_assignments
boarding_attendance
late_return_records
dorm_discipline
```

A student should not be recreated as a boarding student.

Instead:

```ts
BoardingAssignment {
  id
  school_id
  student_id
  hostel_id
  room_id
  bed_id
  status
}
```

---

## 6.12 Transport Manager Dashboard

Transport Manager uses shared student data.

Reads from:

```text
students
parents
routes
vehicles
drivers
transport_assignments
```

Writes to:

```text
route_assignments
bus_lists
fuel_logs
maintenance_logs
transport_incidents
```

A student should be assigned to transport through:

```ts
TransportAssignment {
  id
  school_id
  student_id
  route_id
  vehicle_id
  pickup_point
  dropoff_point
  status
}
```

---

## 6.13 Parent Portal

Parent Portal reads only linked child data.

Reads from:

```text
student profile
attendance
fees
receipts
homework
exam results
discipline notifications
health notifications
library loans
transport info
boarding info
messages
```

Parent must not see other students.

Filtering should be:

```ts
school_id
guardian_id
student_guardian.student_id
```

---

## 6.14 Student Portal

Student Portal reads only the logged-in student’s own records.

Reads from:

```text
profile
timetable
assignments
attendance
exam results
fees summary if allowed
library loans
discipline status if allowed
messages
```

Filtering should be:

```ts
school_id
student_user_id
student_id
```

---

# 7. Shared Student Profile

Every student should have one central profile that connects all modules.

## Student Profile Tabs

```text
Overview
Guardians
Class & Stream
Fees
Attendance
Academics
Exams
Discipline
Health
Library
Transport
Boarding
Documents
Messages
Audit History
```

Each tab reads from a different module, but all use the same:

```ts
student_id
school_id
```

Example:

```text
Student: Brian Otieno
Admission No: MS/2026/001

Fees tab → fee records
Attendance tab → attendance records
Health tab → sick bay visits
Library tab → book loans
Discipline tab → incidents
Transport tab → route assignment
Boarding tab → dorm allocation
Exams tab → marks and report cards
```

---

# 8. How One Action Should Spread Across Dashboards

## Example 1: Student Admission

### Action

Admissions Officer admits a student.

### Backend writes:

```text
students
student_guardians
class_placements
documents
fee_accounts
audit_logs
notifications
```

### Other dashboards affected:

```text
Principal sees new student count increase
Secretary can search the student
Accountant sees fee account
Class Teacher sees student in class list
Nurse can open student health profile
Librarian can issue books to student
Transport Manager can assign route
Boarding Master can assign bed
Parent Portal can show child
Student Portal can show profile
```

---

## Example 2: Fee Payment

### Action

Accountant records payment.

### Backend writes:

```text
payments
receipts
fee_accounts
audit_logs
notifications
```

### Other dashboards affected:

```text
Principal sees collection summary update
Parent Portal sees new receipt
Student profile shows updated balance
Class Teacher sees arrears list update
Secretary can confirm fee status if allowed
```

---

## Example 3: Attendance Marking

### Action

Teacher marks attendance.

### Backend writes:

```text
attendance_records
attendance_sessions
audit_logs
notifications
```

### Other dashboards affected:

```text
Principal sees attendance percentage
Class Teacher sees absent learners
Parent receives absence notification if enabled
Student profile attendance tab updates
Reports module updates attendance report
```

---

## Example 4: Discipline Case

### Action

Discipline Master records incident.

### Backend writes:

```text
discipline_cases
discipline_actions
parent_notifications
counsellor_referrals
approval_requests
audit_logs
```

### Other dashboards affected:

```text
Principal sees pending approval if serious
Class Teacher sees student concern
Counsellor sees referral
Parent receives notification
Student profile discipline tab updates
```

---

## Example 5: Nurse Visit

### Action

Nurse treats student.

### Backend writes:

```text
health_visits
medicine_dispensing_logs
medicine_inventory_movements
parent_notifications
audit_logs
```

### Other dashboards affected:

```text
Principal sees health summary
Class Teacher sees health alert if relevant
Parent receives message
Storekeeper/Nurse inventory reduces medicine stock
Student health tab updates
```

---

## Example 6: Library Book Issue

### Action

Librarian issues book.

### Backend writes:

```text
library_loans
book_copy_status
library_fines if overdue later
audit_logs
```

### Other dashboards affected:

```text
Student profile library tab updates
Parent Portal shows borrowed book
Class Teacher sees overdue concern
Principal sees library usage report
```

---

# 9. Shared Data Access Pattern

Every API must follow this pattern:

```ts
const schoolId = getSchoolIdFromSession(user)

return db.student.findMany({
  where: {
    school_id: schoolId
  }
})
```

Never trust school_id from frontend alone.

Bad:

```ts
const schoolId = req.body.school_id
```

Good:

```ts
const schoolId = session.user.school_id
```

The logged-in user determines the school.

---

# 10. Role-Based Permission Layer

Data sharing does not mean every role can see everything.

It means everyone uses the same source of truth, but permissions decide access.

## Example Permission Matrix

| Role               |    Can View Student |     Can Edit Student |  Can View Fees | Can Edit Fees |  Can View Health | Can Edit Health |
| ------------------ | ------------------: | -------------------: | -------------: | ------------: | ---------------: | --------------: |
| Principal          |                 Yes |              Limited |            Yes |  Approve only |          Summary |              No |
| Secretary          |                 Yes |              Limited |        Limited |            No |               No |              No |
| Admissions Officer |                 Yes | Yes during admission |             No |            No |               No |              No |
| Accountant         |                 Yes |                   No |            Yes |           Yes |               No |              No |
| Class Teacher      | Assigned class only |                   No |        Summary |            No |    Limited alert |              No |
| Nurse              |                 Yes |                   No |             No |            No |              Yes |             Yes |
| Parent             |      Own child only |                   No | Own child only |            No | Own child alerts |              No |
| Student            |           Self only |                   No |       Optional |            No |          Limited |              No |

---

# 11. Backend Services Blueprint

Do not build dashboard-specific backend logic like:

```text
/admissions/students
/secretary/students
/accountant/students
/class-teacher/students
```

Instead, create shared services:

```text
StudentService
GuardianService
StaffService
ClassService
FeeService
AttendanceService
ExamService
DisciplineService
HealthService
LibraryService
InventoryService
TransportService
BoardingService
NotificationService
AuditService
ApprovalService
```

Then dashboards call the shared services with role-based filtering.

Example:

```ts
StudentService.getStudentsForRole({
  schoolId,
  userId,
  role,
  filters
})
```

The same service can return different views depending on role.

---

# 12. API Design Blueprint

## Shared APIs

```text
GET    /api/students
POST   /api/students
GET    /api/students/:id
PATCH  /api/students/:id

GET    /api/students/:id/fees
GET    /api/students/:id/attendance
GET    /api/students/:id/exams
GET    /api/students/:id/discipline
GET    /api/students/:id/health
GET    /api/students/:id/library
GET    /api/students/:id/transport
GET    /api/students/:id/boarding
```

## Module APIs

```text
POST /api/admissions/admit
POST /api/fees/payments
POST /api/attendance/mark
POST /api/exams/marks
POST /api/discipline/cases
POST /api/health/visits
POST /api/library/issue
POST /api/transport/assign
POST /api/boarding/assign
```

All APIs must internally enforce:

```text
school_id
role permission
audit logging
validation
notifications
cache invalidation
```

---

# 13. Frontend Data Sharing Blueprint

The frontend should not keep separate isolated dashboard data.

Bad:

```ts
const students = [
  { name: "Demo Student" }
]
```

Bad:

```ts
localStorage.setItem("students", JSON.stringify(students))
```

Good:

```ts
const { data: students } = useStudents({ classId, streamId })
```

All dashboards should use shared hooks:

```ts
useStudents()
useStudentProfile(studentId)
useFees(studentId)
useAttendance(studentId)
useDiscipline(studentId)
useHealth(studentId)
useLibraryLoans(studentId)
useTransportAssignment(studentId)
useBoardingAssignment(studentId)
useNotifications()
useApprovals()
```

---

# 14. Query Invalidation Rules

After any action, related dashboards must update.

Example:

When admitting a student:

```ts
invalidateQueries(["students", schoolId])
invalidateQueries(["dashboard-summary", schoolId])
invalidateQueries(["class-students", classId])
invalidateQueries(["fee-accounts", schoolId])
invalidateQueries(["notifications", schoolId])
```

When recording payment:

```ts
invalidateQueries(["student-fees", studentId])
invalidateQueries(["fee-summary", schoolId])
invalidateQueries(["parent-portal", studentId])
invalidateQueries(["principal-dashboard", schoolId])
```

When marking attendance:

```ts
invalidateQueries(["attendance", classId])
invalidateQueries(["student-attendance", studentId])
invalidateQueries(["principal-attendance-summary", schoolId])
invalidateQueries(["parent-portal", studentId])
```

This prevents stale dashboards.

---

# 15. Real-Time Updates

For important actions, MyShule should support real-time or near-real-time updates.

Examples:

```text
New admission
Fee payment
Absent student
Discipline incident
Nurse visit
Library overdue
Approval request
Visitor arrival
Low stock
Transport incident
```

Real-time update methods can include:

```text
WebSockets
Server-Sent Events
Polling
React Query refetch intervals
Notification table
Background job queue
```

Even without full WebSockets, the system should at least refetch important queries after mutations.

---

# 16. Offline Sync Rules

Some dashboards may work offline or with poor network.

Examples:

```text
Nurse sick bay
Teacher attendance
Security gate
Library issue/return
Storekeeper stock issue
```

Offline data should not become separate data.

It should be temporary only.

Correct offline flow:

```text
User submits action offline
Action saved to offline queue
UI says "Saved for sync"
When online, action syncs to backend
Backend writes to shared school database
All dashboards update
Audit log records synced action
```

Offline queue records should include:

```ts
OfflineQueueItem {
  id
  school_id
  user_id
  role
  action_type
  payload
  status
  created_at
  synced_at
  error_message
}
```

---

# 17. Notifications as Data Sharing

Notifications are part of data sharing.

When one dashboard performs an action, another dashboard may need to know.

Example:

```text
Teacher requests chalk
↓
Storekeeper receives request
↓
Storekeeper issues item
↓
Teacher receives notification
↓
Inventory count updates
↓
Principal can audit movement
```

Notification table:

```ts
Notification {
  id
  school_id
  recipient_user_id
  recipient_role
  title
  message
  type
  related_entity_type
  related_entity_id
  status
}
```

Notifications must be tenant-scoped by school_id.

---

# 18. Approval-Based Sharing

Some actions should not immediately become final.

They should create approval requests.

Examples:

```text
Fee waiver
Student suspension
Expulsion
High-value stock issue
Delete student
Change marks after release
Reverse receipt
Remove staff user
```

Approval table:

```ts
ApprovalRequest {
  id
  school_id
  requested_by_user_id
  approval_type
  entity_type
  entity_id
  status
  approver_role
  approver_user_id
  reason
}
```

Once approved, the shared data changes.

---

# 19. Audit Logs

Every sensitive shared-data action must create an audit log.

Examples:

```text
Student admitted
Student edited
Fee payment recorded
Receipt reversed
Marks changed
Discipline case created
Medicine dispensed
Book marked lost
Stock adjusted
Staff invited
Permission changed
```

Audit log:

```ts
AuditLog {
  id
  school_id
  user_id
  role
  action
  entity_type
  entity_id
  old_value
  new_value
  ip_address
  created_at
}
```

Audit logs help the Principal, Super Admin, and System Monitor understand what happened.

---

# 20. Shared Database Relationship Map

The student is central.

```text
School
 ├── Students
 │    ├── Guardians
 │    ├── Class Placement
 │    ├── Attendance
 │    ├── Fee Account
 │    ├── Payments
 │    ├── Exam Marks
 │    ├── Report Cards
 │    ├── Discipline Cases
 │    ├── Health Visits
 │    ├── Library Loans
 │    ├── Transport Assignment
 │    ├── Boarding Assignment
 │    └── Documents
 │
 ├── Staff
 │    ├── Roles
 │    ├── Timetable
 │    ├── Lessons
 │    ├── Requests
 │    └── Audit Logs
 │
 ├── Classes
 │    ├── Streams
 │    ├── Subjects
 │    ├── Teachers
 │    └── Students
 │
 ├── Finance
 ├── Inventory
 ├── Library
 ├── Transport
 ├── Boarding
 ├── Communication
 ├── Approvals
 └── Audit Logs
```

---

# 21. Data Sharing Rules for Every Dashboard

Every dashboard workspace must obey these rules:

## Rule 1: No fake dashboard-only data

No dashboard should use:

```text
mockStudents
demoFees
fakeAttendance
local dashboard arrays
hardcoded cards
localStorage as final storage
```

Mock data is allowed only for Kisumu Boys demo school or development seed data.

---

## Rule 2: Every record must have school_id

Any record without school_id is dangerous in a multi-tenant ERP.

---

## Rule 3: Frontend cannot decide tenant

The backend must derive school_id from the authenticated session.

---

## Rule 4: Roles control visibility, not data ownership

The Accountant does not own different students.
The Nurse does not own different students.
The Librarian does not own different students.

They all use the same students, but see different modules.

---

## Rule 5: Every mutation must update shared data

When a user clicks Save, Admit, Pay, Mark, Issue, Return, Assign, Approve, or Notify, the action must write to the shared backend.

---

## Rule 6: Every mutation must refresh related dashboards

After saving, invalidate/refetch related queries.

---

## Rule 7: Every sensitive mutation must be audited

Especially finance, marks, discipline, health, inventory, staff, and permissions.

---

## Rule 8: Cross-school access must be impossible

School A must never read, write, search, infer, export, or receive notifications from School B.

---

# 22. Example End-to-End Flow

## New Student Admission Flow

### Step 1: Admissions Officer admits student

Creates:

```text
Student
Guardian
StudentGuardian link
Class placement
Document records
Fee account
Audit log
Notifications
```

### Step 2: Secretary can search student

Secretary sees:

```text
Name
Admission number
Class
Guardian phone
Admission status
```

### Step 3: Accountant sees student fee account

Accountant sees:

```text
Fee structure
Invoice
Balance
Payment status
Receipt history
```

### Step 4: Class Teacher sees student in class

Class Teacher sees:

```text
Class list
Attendance register
Parent contact
Academic notes
```

### Step 5: Nurse sees student profile

Nurse sees:

```text
Student name
Class
Guardian contact
Health visits
Medicine history
```

### Step 6: Librarian can issue book

Librarian searches same student record and issues book.

### Step 7: Parent Portal activates

Parent sees:

```text
Child profile
Fees
Attendance
Messages
Homework
Results when released
```

---

# 23. Practical MyShule Implementation Structure

## Backend folders

```text
/backend
  /services
    student.service.ts
    guardian.service.ts
    fee.service.ts
    attendance.service.ts
    exam.service.ts
    discipline.service.ts
    health.service.ts
    library.service.ts
    inventory.service.ts
    transport.service.ts
    boarding.service.ts
    notification.service.ts
    approval.service.ts
    audit.service.ts

  /permissions
    roles.ts
    permissions.ts
    canAccessStudent.ts
    canAccessModule.ts

  /tenant
    getSchoolFromSession.ts
    requireSchoolScope.ts

  /api
    /students
    /admissions
    /fees
    /attendance
    /exams
    /discipline
    /health
    /library
    /inventory
    /transport
    /boarding
    /notifications
    /approvals
```

## Frontend folders

```text
/frontend
  /hooks
    useStudents.ts
    useStudentProfile.ts
    useFees.ts
    useAttendance.ts
    useExams.ts
    useDiscipline.ts
    useHealth.ts
    useLibrary.ts
    useTransport.ts
    useBoarding.ts
    useNotifications.ts
    useApprovals.ts

  /dashboards
    /principal
    /secretary
    /admissions
    /accountant
    /teacher
    /class-teacher
    /nurse
    /librarian
    /discipline
    /transport
    /boarding
    /parent
    /student
```

---

# 24. Testing Blueprint

## Test 1: Shared Student Admission

```text
Given School A has Admissions Officer
When Admissions Officer admits student Brian Otieno
Then Principal can see Brian
And Secretary can search Brian
And Accountant can create fee invoice for Brian
And Class Teacher can see Brian in class list
And Nurse can open Brian health profile
And Librarian can issue book to Brian
And Parent Portal shows Brian to linked guardian
```

---

## Test 2: Cross-School Isolation

```text
Given School A has student Brian
And School B has user Accountant
When School B Accountant searches students
Then Brian must not appear
And School B cannot access Brian by ID
And School B cannot infer Brian through reports, notifications, exports, or URLs
```

---

## Test 3: Fee Sharing

```text
When Accountant records KES 10,000 payment for Brian
Then Parent Portal shows receipt
And Principal dashboard fee collection increases
And Class Teacher arrears list updates
And Student profile balance updates
```

---

## Test 4: Attendance Sharing

```text
When Teacher marks Brian absent
Then Class Teacher sees absent student
And Principal attendance summary updates
And Parent receives notification if enabled
And Brian’s student profile attendance tab updates
```

---

## Test 5: Health Sharing

```text
When Nurse records sick bay visit for Brian
Then Brian health tab updates
And Parent notification is created
And medicine inventory reduces
And Principal sees health summary
```

---

## Test 6: Library Sharing

```text
When Librarian issues a book to Brian
Then book status changes to IN_USE
And Brian library tab shows active loan
And Parent Portal shows borrowed book
And overdue logic can later flag it
```

---

## Test 7: No Mock Data

```text
Scan all dashboards
Ensure no role dashboard uses hardcoded students, fake fee balances, fake attendance, or isolated local dashboard records when real data exists.
```

---

# 25. Final Data Sharing Principle

The final principle for MyShule is:

```text
One school. One database. Many dashboards. Role-based views. Strict school_id isolation.
```

Or even simpler:

```text
Every dashboard is just a different window into the same school.
```

The Admissions Officer does not create “admissions students.”
They create real school students.

The Accountant does not manage “accountant students.”
They manages fees for real school students.

The Nurse does not manage “nurse students.”
They records health events for real school students.

The Librarian does not manage “library students.”
They issues books to real school students.

The Parent does not see a separate portal child record.
They see the same real child record linked to them.

That is the correct MyShule data sharing blueprint.
