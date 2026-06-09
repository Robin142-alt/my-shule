# Implementation 1370 - MyShule Frontend Practicality Test Suite

## Non-Negotiable Emphasis

This implementation gate applies to **everything** in the MyShule frontend:

- every dashboard
- every role
- every sidebar workspace
- every queue
- every form
- every input
- every button
- every modal
- every print/export flow
- every SMS trigger
- every approval flow
- every audit trail
- every cross-dashboard update
- every offline or weak-internet state
- every real Kenyan school daily operation

No dashboard passes Implementation 1370 because it looks good. It passes only when a real Kenyan school can use it for daily operations without falling back to exercise books, Excel sheets, WhatsApp messages, manual receipt books, or scattered files.

# MYSHULE FRONTEND PRACTICALITY TEST SUITE

## 1. The Main Question

Your frontend must answer this:

> "Can a real Kenyan school run daily operations using this system without going back to exercise books, Excel sheets, WhatsApp chaos, manual receipt books, and scattered files?"

If the answer is not clearly **yes**, improve the dashboard.

---

# A. Daily School Operations Test

## Test 1: Morning Opening Test

Simulate a normal school morning from **6:30 AM to 9:00 AM**.

The system should support:

* Security officer checking in many visitors quickly.
* Boarding master confirming hostel roll call.
* Teachers marking lesson attendance.
* Secretary handling parent walk-ins.
* Accountant receiving school fees.
* Nurse recording morning sick-bay cases.
* Principal viewing live school status.
* Deputy principal seeing discipline, attendance, and teacher movement.
* Transport manager confirming buses/routes.
* Storekeeper issuing daily consumables.
* Librarian issuing or receiving books.
* System monitor seeing SMS, M-Pesa, sync, and failed jobs.

### Pass Condition

The principal dashboard should show a live operations summary such as:

* Students present today
* Teachers present
* Visitors currently inside
* Fees received today
* Pending parent complaints
* Sick-bay cases today
* Discipline cases today
* Boarding roll call status
* Transport route status
* System health
* Failed SMS or M-Pesa callbacks

### Fail Condition

If the principal has to open ten separate dashboards manually to know what is happening, the frontend is not practical enough.

---

# B. Kenyan School Office Pressure Test

## Test 2: Secretary Heavy Queue Test

Scenario: It is Monday morning. Parents are coming in for:

* Fee balance inquiries
* Admission inquiries
* Student transfer letters
* Report card collection
* Meeting appointments
* Discipline follow-ups
* Medical follow-ups
* Lost item complaints
* Visitor registration

The secretary dashboard must have:

* Quick search student by name/admission number/parent phone
* Parent profile summary
* Fee balance preview
* Print fee statement
* Print admission letter
* Print transfer letter
* Log parent complaint
* Book appointment with principal/deputy/class teacher
* Visitor pass printing
* Document request queue
* SMS parent from dashboard
* Escalate issue to relevant department

### Pass Condition

A secretary should handle a parent in **under 2 minutes** without leaving the dashboard.

### Fail Condition

If the secretary must ask the accountant, teacher, principal, or deputy for basic information, the frontend is weak.

---

# C. Fee Collection Practicality Test

## Test 3: Accountant Fee Workflow Test

Scenario: Parents pay using cash, bank, M-Pesa, bursary, partial payment, or overpayment.

The accountant dashboard must support:

* Student fee search
* Fee structure setup
* Vote heads
* Term-based billing
* Boarding fees
* Transport fees
* Lunch fees
* Exam fees
* Arrears
* Discounts
* Scholarships/bursaries
* Partial payments
* Overpayments
* Refund tracking
* M-Pesa confirmation
* Manual payment entry
* Receipt printing
* Parent SMS receipt
* Daily collection report
* Class fee balance report
* Defaulters list
* Payment reversal with approval
* Audit trail

### Pass Condition

The accountant can complete these actions:

1. Search student.
2. View balance.
3. Record payment.
4. Print receipt.
5. Send SMS.
6. Update principal dashboard automatically.

### Fail Condition

If fee payment does not automatically update parent, principal, secretary, and student records, the system is not interconnected enough.

---

# D. Librarian Scanner Test

## Test 4: Real Library Barcode Workflow Test

Scenario: A librarian receives 200 new books and needs to add them quickly.

The librarian dashboard must support:

* Add book manually
* Add book by barcode scanner
* Bulk upload books
* Generate barcode labels
* Scan book to issue
* Scan student ID/admission number
* Scan book to return
* Mark damaged book
* Mark lost book
* Apply fine
* Print issue slip
* Print return slip
* Send overdue SMS to parent/student
* View currently borrowed books
* View overdue books
* View lost/damaged reports
* View book stock count

### Pass Condition

The librarian can issue a book by scanning:

1. Student card/admission number.
2. Book barcode.
3. Confirm issue.
4. Print/SMS issue record.

### Fail Condition

If the librarian must type every book title manually during issue/return, the system is not practical.

---

# E. Nurse Medical Inventory Test

## Test 5: Sick Bay + Medicine Stock Test

Scenario: A student reports sick. The nurse gives medicine and informs parent.

The nurse dashboard must support:

* Search student
* Record symptoms
* Record temperature/vitals
* Select medicine given
* Quantity dispensed
* Auto-deduct from stock
* Show low stock warning
* Show expired medicine warning
* Record referral to hospital
* Notify parent by SMS
* Notify class teacher
* Notify boarding master if boarder
* Print medical slip
* View student medical history
* Load new medicine stock
* Record supplier/batch/expiry
* Reorder alerts

### Pass Condition

When medicine is given, stock should reduce automatically and the parent should be notified if needed.

### Fail Condition

If medicine stock is separate from sick-bay records, the system is not practical enough.

---

# F. Security Officer Visitor Rush Test

## Test 6: Many Visitors at Once Test

Scenario: There is a school event or visiting day. Many visitors arrive.

Security dashboard must support:

* Fast visitor registration
* Search returning visitor by phone/ID
* Capture name, ID/passport, phone
* Select student/staff being visited
* Select reason for visit
* Capture vehicle number
* Print visitor slip
* Mark visitor inside
* Mark visitor exited
* Currently inside board
* Flag overstayed visitors
* Emergency visitor list
* Blocklisted visitor alert
* Notify office or staff being visited

### Pass Condition

Security can register a returning visitor in **under 30 seconds**.

### Fail Condition

If security has to fill a long form for every visitor during rush hours, the dashboard is not realistic.

---

# G. Storekeeper Practical Inventory Test

## Test 7: School Store Workflow Test

Scenario: Teachers, boarding, kitchen, lab, and office request items.

Storekeeper dashboard must support:

* Add stock item
* Categorize as consumable/asset
* Record supplier
* Record quantity
* Record unit cost
* Issue items to department
* Require approval for high-value items
* Track stock movement
* Track low stock
* Track damaged items
* Stock take
* Procurement request
* Print issue slip
* Print stock report
* View movement history
* Link assets to departments

Items should include:

* Chalk/markers
* Exercise books
* Cleaning supplies
* Food supplies
* Lab apparatus
* Printer papers
* Toners
* Mattresses
* Uniform items
* Sports equipment
* Office supplies

### Pass Condition

Every item entering and leaving the store has a clear movement history.

### Fail Condition

If the school cannot know who took what, when, and for what purpose, the system is not practical.

---

# H. Asset Tracking Test

## Test 8: High-Value Asset Test

Scenario: School owns laptops, projectors, printers, routers, tablets, cameras, lab equipment, and library devices.

The system must track:

* Asset name
* Asset tag/code
* Serial number
* Purchase date
* Assigned department
* Assigned staff
* Current location
* Condition
* Maintenance history
* Issue/return history
* Damage/loss report
* Approval before movement
* Audit trail

### Pass Condition

The principal can search a projector and know:

* Where it is
* Who has it
* Its condition
* Movement history
* Repair history

### Fail Condition

If assets are only listed but not traceable, the frontend is incomplete.

---

# I. Computer Lab / ICT Dashboard Test

## Test 9: ICT Practicality Test

The ICT/computer lab dashboard must support:

* Register computers
* Register laptops
* Register projectors
* Register printers
* Register routers
* Register software licenses
* Track lab bookings
* Track damaged devices
* Track repairs
* Track assigned devices
* Track internet issues
* Record maintenance
* View device status
* Print asset report
* Request replacement parts
* Notify administration of major issues

### Pass Condition

ICT staff can know which computer is working, faulty, assigned, under repair, or missing.

### Fail Condition

If the ICT dashboard is just a list of computers, improve it.

---

# J. Boarding / Hostel Test

## Test 10: Boarding Daily Dependency Test

Scenario: Boarding master does evening roll call.

The boarding dashboard must support:

* Dormitory setup
* Bed allocation
* Student hostel assignment
* Morning roll call
* Evening roll call
* Missing student alert
* Exeat request
* Exeat approval
* Parent SMS
* Sick referral to nurse
* Discipline referral
* Dorm supplies request
* Bed/mattress asset tracking
* Hostel incident report
* Print hostel roll call

### Pass Condition

If a boarder is missing, deputy/principal/security/class teacher should be alerted.

### Fail Condition

If hostel information is isolated from discipline, nurse, parent, and administration, the system is weak.

---

# K. Discipline Interconnection Test

## Test 11: Discipline Case Workflow Test

Scenario: A teacher reports a student for indiscipline.

The system must support:

* Teacher creates case
* Class teacher reviews
* Discipline master investigates
* Parent is notified
* Deputy principal approves action
* Counsellor referral if needed
* Boarding master notified if boarder
* Security notified if serious
* Principal sees serious cases
* Record punishment/action taken
* Attach evidence
* Print discipline letter
* Track repeat cases

### Pass Condition

One discipline case should flow across all relevant dashboards.

### Fail Condition

If discipline is just a static table, it is not practical.

---

# L. Academic Workflow Test

## Test 12: Exams + Academics Test

Scenario: Exams are being prepared and marks are being entered.

The system must support:

* Subject setup
* Class/grade setup
* Stream setup
* Teacher-subject allocation
* Exam creation
* Marks entry
* Bulk marks upload
* Grade calculation
* Report card generation
* Missing marks alert
* Class performance analysis
* Subject performance analysis
* Student ranking if school uses it
* Teacher performance view
* Parent report access
* Principal academic overview
* Print report cards

### Pass Condition

The dean/exams manager can move from exam setup to report card printing inside the system.

### Fail Condition

If report cards still require Excel, the frontend is not complete.

---

# M. Admissions Practicality Test

## Test 13: Full Student Admission Test

Scenario: A new student joins the school.

Admissions dashboard must support:

* Inquiry registration
* Application form
* Document upload/checklist
* Interview/assessment status
* Admission decision
* Fee structure assignment
* Class/stream assignment
* Parent account creation
* Student admission number generation
* Admission letter printing
* First invoice generation
* Parent SMS onboarding
* Student profile creation

### Pass Condition

A student should move from inquiry to active student without duplicate data entry.

### Fail Condition

If admissions, fees, parent account, and student profile are disconnected, improve it.

---

# N. Parent Dashboard Test

## Test 14: Parent Dependency Test

Parent dashboard must show:

* Fee balance
* Fee statement
* Receipts
* Student attendance
* Academic reports
* Discipline cases
* Medical alerts
* Library borrowed books
* Transport route
* Boarding status
* Announcements
* Meeting requests
* Messages from school
* Downloads/letters

### Pass Condition

A parent should not need to call the school for basic updates.

### Fail Condition

If the parent dashboard only shows announcements and fee balance, it is too shallow.

---

# O. Student Dashboard Test

## Test 15: Student Usefulness Test

Student dashboard must show:

* Timetable
* Assignments
* Exam results
* Library books borrowed
* Discipline status
* Announcements
* Club/activity notices
* Fee reminders where appropriate
* Teacher messages
* Academic progress

### Pass Condition

Students should have a reason to log in regularly.

### Fail Condition

If the student dashboard is decorative, improve it.

---

# P. Super Admin Test

## Test 16: Configuration Completeness Test

Super Admin must configure:

* School profile
* Academic years
* Terms
* Classes/grades/forms
* Streams
* Subjects
* Departments
* Roles
* Permissions
* Fee structures
* Vote heads
* SMS provider
* SMS templates
* M-Pesa settings
* Receipt settings
* Report card templates
* Admission letter templates
* User accounts
* Approval rules
* Audit logs
* Backup settings

### Pass Condition

A new school can be onboarded without developer intervention.

### Fail Condition

If settings are hardcoded, the SaaS frontend is not ready.

---

# Q. System Monitor Test

## Test 17: Reliability Dashboard Test

System Monitor must show:

* Server status
* Database status
* Failed background jobs
* Failed SMS
* Failed M-Pesa callbacks
* Failed report generation
* Backup status
* Offline devices
* Sync status
* Error logs
* User activity anomalies
* Storage usage
* API health

### Pass Condition

Admin can know what is broken before users complain.

### Fail Condition

If system problems are invisible, the system is not production-ready.

---

# R. Offline / Weak Internet Test

## Test 18: Kenyan Connectivity Test

Scenario: Internet is unstable.

The frontend should handle:

* Slow loading
* Retry buttons
* Offline warning
* Saved draft forms
* Pending sync queue
* Clear error messages
* No data loss on refresh
* Lightweight pages for weak devices
* Printable fallback documents

### Pass Condition

A user filling a long form should not lose work because the network failed.

### Fail Condition

If forms reset after network failure, the system will frustrate schools.

---

# S. Print and Document Test

## Test 19: School Printing Center Test

The system must print:

* Fee receipts
* Fee statements
* Admission letters
* Report cards
* Visitor slips
* Library issue slips
* Library return slips
* Stock issue slips
* Asset movement slips
* Hostel roll call sheets
* Transport route lists
* Discipline letters
* Medical referral slips
* Meeting appointment slips
* Board reports
* Staff reports

### Pass Condition

Every major workflow should have a print/export option.

### Fail Condition

If staff still need Microsoft Word to prepare basic school documents, improve the frontend.

---

# T. Role-Based Permission Test

## Test 20: Access Control Test

Test whether users see only what they should.

Examples:

* Teacher should not reverse payments.
* Nurse should not edit fee structures.
* Accountant should not edit exam marks.
* Security should not view confidential medical history.
* Parent should only see their own children.
* Student should not see staff dashboards.
* Librarian should only access library workflows.
* Principal should have broad oversight.
* Super Admin should configure but not fake school operations without audit.

### Pass Condition

Every sensitive action has permissions and audit logs.

### Fail Condition

If all users can access everything, the frontend is dangerous.

---

# U. Dependency Loop Test

## Test 21: "Does One Action Update Other Dashboards?" Test

This is very important.

When one user acts, other dashboards should update automatically.

Examples:

| Action                             | Dashboards That Should Update                            |
| ---------------------------------- | -------------------------------------------------------- |
| Fee payment recorded               | Accountant, Parent, Student, Principal, Secretary        |
| Student marked absent              | Teacher, Class Teacher, Parent, Deputy, Principal        |
| Medicine dispensed                 | Nurse, Parent, Class Teacher, Boarding Master if boarder |
| Visitor checked in                 | Security, Secretary, Principal                           |
| Book overdue                       | Librarian, Student, Parent, Class Teacher                |
| Discipline case created            | Teacher, Discipline Master, Parent, Deputy, Principal    |
| Asset issued                       | Storekeeper, Department Head, Principal, System Audit    |
| Student admitted                   | Admissions, Accountant, Parent, Class Teacher, Principal |
| Bus route changed                  | Transport, Parent, Student, Principal                    |
| Boarding roll call missing student | Boarding, Deputy, Security, Parent, Principal            |

### Pass Condition

The system feels alive and connected.

### Fail Condition

If every dashboard works alone, MyShule is not yet a real ERP.

---

# V. Frontend Usability Test

## Test 22: Non-Technical Staff Test

Give the system to:

* A secretary
* A teacher
* A bursar/accountant
* A security guard
* A librarian
* A nurse
* A boarding master

Ask them to perform their daily work.

### They should not need:

* Developer explanation
* Hidden instructions
* Training manual for basic tasks
* Too many clicks
* Confusing forms
* Technical language

### Pass Condition

A normal school worker can understand the dashboard within minutes.

### Fail Condition

If the system looks beautiful but staff cannot use it fast, improve it.

---

# W. Dashboard Completeness Scorecard

Score every dashboard out of 10.

| Area                          | Score |
| ----------------------------- | ----: |
| Clear sidebar navigation      |   /10 |
| Daily task cards              |   /10 |
| Urgent alerts                 |   /10 |
| Search function               |   /10 |
| Main data tables              |   /10 |
| Forms and inputs              |   /10 |
| Buttons/actions               |   /10 |
| Modals and confirmations      |   /10 |
| Print/export options          |   /10 |
| SMS triggers                  |   /10 |
| Approval flows                |   /10 |
| Audit trail                   |   /10 |
| Reports                       |   /10 |
| Graphs/charts                 |   /10 |
| Cross-dashboard updates       |   /10 |
| Mobile/tablet usability       |   /10 |
| Offline/poor network handling |   /10 |
| Role-based permissions        |   /10 |
| Kenyan school realism         |   /10 |
| Daily dependency strength     |   /10 |

## Interpretation

| Score      | Meaning                      |
| ---------- | ---------------------------- |
| 90% - 100% | Very practical               |
| 75% - 89%  | Good but needs strengthening |
| 50% - 74%  | Still shallow                |
| Below 50%  | Not ready for real schools   |

Your target should be **95%+**.

---

# X. Red Flag Checklist

If any of these are true, improve the frontend immediately:

* No fast search on dashboards.
* No print buttons.
* No SMS triggers.
* No M-Pesa workflow.
* No audit trail.
* No approval workflow.
* No low-stock alerts.
* No visitor exit tracking.
* No parent notification flow.
* No offline/error handling.
* No role permissions.
* No daily task queues.
* No urgent cards.
* No cross-dashboard updates.
* No school setup forms.
* No class/grade/stream setup.
* No fee structure setup.
* No report card generation.
* No asset movement history.
* No barcode/scanner library workflow.
* No medicine stock workflow.
* No boarding roll call workflow.
* No discipline escalation workflow.
* No system monitor dashboard.

---

# Y. Improvement Prompt for Codex

Use this prompt to force Codex to improve the frontend after testing:

```text
You are a senior frontend engineer, ERP architect, UX researcher, and Kenyan school operations specialist.

I am building MyShule, a Kenyan-school-focused ERP/SaaS platform. Your task is to audit and improve the frontend so that it becomes extremely practical for real daily school operations.

Do not treat this as a normal dashboard UI. Treat it as a real school operating system that must reduce dependency on exercise books, Excel files, WhatsApp messages, manual receipts, and disconnected office processes.

Evaluate every dashboard using the following practicality tests:

1. Morning operations test
2. Secretary parent queue test
3. Accountant fee collection test
4. Librarian barcode/scanner workflow test
5. Nurse sick-bay and medicine inventory test
6. Security visitor rush test
7. Storekeeper inventory test
8. High-value asset tracking test
9. ICT/computer lab management test
10. Boarding/hostel roll call test
11. Discipline escalation test
12. Academic/exam/report card workflow test
13. Admissions onboarding test
14. Parent dependency test
15. Student usefulness test
16. Super Admin configuration test
17. System Monitor reliability test
18. Weak internet/offline handling test
19. Printing/document center test
20. Role-based permission test
21. Cross-dashboard dependency loop test
22. Non-technical staff usability test

For every dashboard, check whether it has:

- Sidebar navigation
- Urgent cards
- Daily task queues
- Search
- Tables
- Forms
- Inputs
- Buttons
- Modals
- Filters
- Bulk actions
- Print/export actions
- SMS triggers
- Approval flows
- Audit trails
- Reports
- Charts
- Empty states
- Loading states
- Error states
- Permission restrictions
- Cross-dashboard updates
- Mobile/tablet responsiveness
- Weak internet handling

Dashboards to audit and improve:

- Principal
- Deputy Principal
- Secretary
- Accountant
- Teacher
- Dean of Academics
- Exams Manager
- Head of Department
- Class Teacher
- Grade/Form Master
- Nurse
- School Counsellor
- Discipline Master
- Librarian
- Parent
- Student
- Storekeeper
- Boarding Master
- Security Officer
- Transport Manager
- Laboratory Technician
- Admissions Officer
- Super Admin
- System Monitor

Specific improvement requirements:

1. Librarian must support barcode/scanner workflows for adding books, issuing books, returning books, fines, lost books, damaged books, overdue tracking, and slips.

2. Nurse must support medicine inventory loading, dispensing, stock deduction, expiry tracking, reorder alerts, parent SMS, referrals, and medical history.

3. Storekeeper must support advanced stock management, consumables, high-value assets, procurement, stock take, movement history, issue slips, approval flows, and low-stock alerts.

4. ICT/computer lab dashboard must track computers, laptops, projectors, printers, routers, software, lab bookings, repairs, device status, and asset movement.

5. Security dashboard must support fast visitor check-in during high traffic, returning visitor search, currently-inside board, visitor slips, exit tracking, blocklisted visitor alerts, and emergency visitor lists.

6. Boarding dashboard must support dorm setup, bed allocation, roll call, missing student alerts, exeats, supplies, sick referrals, discipline referrals, and parent SMS.

7. Discipline module must connect teacher, class teacher, parent, counsellor, boarding master, security, deputy principal, and principal.

8. Fee settings must include fee structures, vote heads, transport fees, boarding fees, lunch fees, M-Pesa settings, receipt settings, reminders, waivers, bursaries, discounts, and payment reversals.

9. School setup must include class/grade/form naming, stream setup, subject setup, department setup, term setup, academic year setup, and role setup.

10. Principal/admin must be able to add, edit, suspend, deactivate, and delete staff with audit logs and permission control.

11. Super Admin must configure SMS provider, templates, credits, delivery reports, module SMS rules, M-Pesa callback settings, backups, school onboarding, and tenant settings.

12. Universal asset tracking must cover laptops, projectors, lab equipment, library devices, tablets, routers, printers, cameras, school furniture, dormitory items, and office equipment.

13. Laboratory technician dashboard must support practical requests, chemicals, apparatus, breakages, safety, lab assets, stock levels, issue/return, and hazard warnings.

14. Transport dashboard must support routes, vehicles, drivers, trips, student route assignment, trip attendance, fuel, maintenance, transport fees, and parent alerts.

15. Admissions dashboard must support inquiries, applications, document verification, decisions, admission letters, student creation, fee assignment, parent onboarding, and class placement.

16. System Monitor must show uptime, sync, failed jobs, failed SMS, failed M-Pesa callbacks, failed report generation, backups, offline devices, and error logs.

17. Document/printing center must generate receipts, statements, admission letters, report cards, visitor slips, library slips, stock issue slips, asset movement slips, hostel roll calls, transport routes, discipline letters, medical referrals, and board reports.

For each dashboard, improve the frontend by adding:

- Real daily workflows
- Practical action buttons
- Complete forms and input fields
- Useful tables
- Search and filters
- Graphs where useful
- Quick actions
- Bulk actions
- Print actions
- SMS actions
- Approval modals
- Confirmation modals
- Audit trails
- Reports
- Empty states
- Error states
- Loading states
- Permission-aware UI
- Cross-dashboard notifications
- Mobile-friendly layouts

Do not give shallow placeholder cards. Every card, table, form, and button must have a real school purpose.

After improving, output:

1. Practicality audit report
2. Failed areas found
3. Improvements made
4. Dashboard-by-dashboard changes
5. Remaining risks
6. Final practicality score out of 100
```

---

# Final Rule

A practical Kenyan school ERP frontend should not just answer:

> "Does the page look good?"

It must answer:

> "Can the school actually depend on this every day?"

For MyShule, the strongest test is this:

**If the school loses access to MyShule for one day, do operations become painful?**

If yes, your frontend is becoming truly practical.

