const fs = require('fs');

const tsxContent = `
function ReservationsWorkspace() {
  return (
    <Panel title="Reservations" description="Manage book reservations, waiting lists, availability alerts, and reservation expiry." icon={Bookmark} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Create Reservation</button>
    }>
      <div className="flex gap-4 mb-4 border-b border-[#D8E0EC]">
        <button className="pb-2 text-sm font-black text-[#071D49] border-b-2 border-[#071D49]">Active Reservations</button>
        <button className="pb-2 text-sm font-bold text-[#64748B]">Ready for Collection</button>
        <button className="pb-2 text-sm font-bold text-[#64748B]">Waiting List</button>
        <button className="pb-2 text-sm font-bold text-[#64748B]">Expired</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Borrower</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Book Title</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Requested Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Expiry Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {[
              { borrower: "Amina Wanjiku", title: "A Doll's House", date: "09 Jun 2026", expiry: "12 Jun 2026", status: "Ready" },
              { borrower: "John Doe", title: "Secondary Math Bk 2", date: "10 Jun 2026", expiry: "-", status: "Waiting" },
            ].map((r, i) => (
              <tr key={i} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{r.borrower}</td>
                <td className="px-4 py-3 text-[#071D49]">{r.title}</td>
                <td className="px-4 py-3 text-[#64748B]">{r.date}</td>
                <td className="px-4 py-3 text-[#64748B]">{r.expiry}</td>
                <td className="px-4 py-3"><StatusChip label={r.status} tone={r.status === 'Ready' ? 'success' : 'warning'} /></td>
                <td className="px-4 py-3 text-right">
                  <button className="text-blue-600 hover:underline font-semibold mr-3">Notify</button>
                  <button className="p-1 text-[#64748B] hover:bg-[#D8E0EC] rounded"><MoreHorizontal className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function DepartmentsWorkspace() {
  return (
    <Panel title="Departments & Subject Resources" description="Manage resources assigned to subjects, departments, teachers, and learning areas." icon={Briefcase} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Issue to Department</button>
    }>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select className="rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-bold text-[#071D49]">
          <option>All Departments</option>
          <option>Science</option>
          <option>Languages</option>
          <option>Humanities</option>
          <option>Mathematics</option>
        </select>
        <select className="rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-bold text-[#071D49]">
          <option>All Resource Types</option>
          <option>Teacher Guide</option>
          <option>Reference Book</option>
          <option>Dictionary / Atlas</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Resource Title</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Department</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Assigned To</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Total</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Available</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {[
              { title: "Advanced Chemistry Guide", dept: "Science", assigned: "Mr. Omondi", total: 3, available: 1 },
              { title: "Kamusi ya Kiswahili", dept: "Languages", assigned: "Dept Office", total: 10, available: 8 },
            ].map((d, i) => (
              <tr key={i} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{d.title}</td>
                <td className="px-4 py-3 text-[#64748B]">{d.dept}</td>
                <td className="px-4 py-3 text-[#64748B]">{d.assigned}</td>
                <td className="px-4 py-3 font-medium">{d.total}</td>
                <td className="px-4 py-3 font-medium text-emerald-600">{d.available}</td>
                <td className="px-4 py-3 text-right">
                  <button className="text-blue-600 hover:underline font-semibold">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function VisitsWorkspace() {
  return (
    <Panel title="Library Visits & Reading Logs" description="Record student library visits, reading sessions, and reading program participation." icon={Footprints} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Log Visit</button>
    }>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Visits Today</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">45</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Class Sessions</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">2</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Books Read (Term)</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">320</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student/Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time In</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time Out</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Purpose</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {[
              { name: "Joy Kendi", in: "10:00 AM", out: "10:45 AM", purpose: "Reading", status: "Completed" },
              { name: "Form 1 East", in: "11:00 AM", out: "-", purpose: "Class Session", status: "Active" },
            ].map((v, i) => (
              <tr key={i} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{v.name}</td>
                <td className="px-4 py-3 text-[#64748B]">{v.in}</td>
                <td className="px-4 py-3 text-[#64748B]">{v.out}</td>
                <td className="px-4 py-3 text-[#64748B]">{v.purpose}</td>
                <td className="px-4 py-3"><StatusChip label={v.status} tone={v.status === 'Active' ? 'success' : 'neutral'} /></td>
                <td className="px-4 py-3 text-right">
                  {v.status === "Active" && <button className="text-blue-600 hover:underline font-semibold mr-3">Check Out</button>}
                  <button className="p-1 text-[#64748B] hover:bg-[#D8E0EC] rounded"><MoreHorizontal className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function RequestsApprovalsWorkspace() {
  return (
    <Panel title="Requests & Approvals" description="Handle book requests, stock purchase requests, write-off approvals, and waivers." icon={CheckSquare} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Create Request</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Request Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Target Role</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Details</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {[
              { type: "Write-off Approval", target: "Principal", details: "3 Books Damaged by Water", date: "10 Jun 2026", status: "Pending" },
              { type: "New Books Purchase", target: "Procurement", details: "CBC Grade 7 Science Books", date: "05 Jun 2026", status: "Approved" },
            ].map((r, i) => (
              <tr key={i} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{r.type}</td>
                <td className="px-4 py-3 text-[#64748B]">{r.target}</td>
                <td className="px-4 py-3 text-[#64748B]">{r.details}</td>
                <td className="px-4 py-3 text-[#64748B]">{r.date}</td>
                <td className="px-4 py-3"><StatusChip label={r.status} tone={r.status === 'Approved' ? 'success' : 'warning'} /></td>
                <td className="px-4 py-3 text-right">
                  <button className="text-blue-600 hover:underline font-semibold">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ReportsDownloadsWorkspace() {
  return (
    <Panel title="Reports & Downloads" description="Generate library reports for management, classes, departments, audits, and parents." icon={FileText}>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          "Full Library Catalogue",
          "Available Books List",
          "Active Loans Report",
          "Overdue Books by Class",
          "Lost & Damaged Books",
          "Library Fines & Payments",
          "Stocktake Summary",
          "Subject Resource Distribution"
        ].map((report, i) => (
          <div key={i} className="rounded-xl border border-[#D8E0EC] p-4 bg-white hover:border-blue-300 transition cursor-pointer flex justify-between items-center group">
            <span className="font-semibold text-[#071D49] text-sm">{report}</span>
            <Download className="w-4 h-4 text-[#64748B] group-hover:text-blue-600" />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function NoticesCommunicationWorkspace() {
  return (
    <Panel title="Notices & Communication" description="Send library notices, overdue reminders, fine alerts, and lost book notices." icon={MessageCircle} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Compose Notice</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Message Title</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Recipient Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Method</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Sent Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {[
              { title: "Form 2 Overdue Reminder", target: "Students & Parents", method: "SMS, In-app", date: "10 Jun 2026", status: "Sent (45)" },
              { title: "New Set Books Arrival", target: "Language Dept", method: "In-app", date: "08 Jun 2026", status: "Sent (8)" },
            ].map((m, i) => (
              <tr key={i} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{m.title}</td>
                <td className="px-4 py-3 text-[#64748B]">{m.target}</td>
                <td className="px-4 py-3 text-[#64748B]">{m.method}</td>
                <td className="px-4 py-3 text-[#64748B]">{m.date}</td>
                <td className="px-4 py-3"><StatusChip label={m.status} tone="success" /></td>
                <td className="px-4 py-3 text-right">
                  <button className="text-blue-600 hover:underline font-semibold">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
`;

// Read the previously generated scaffold file
let content = fs.readFileSync('scaffold_librarian.js', 'utf8');

// Insert the new workspace components before the SimpleWorkspace definition
const simpleWorkspaceIndex = content.indexOf('// Minimal placeholder for the remaining 14 workspaces');
content = content.slice(0, simpleWorkspaceIndex) + tsxContent + content.slice(simpleWorkspaceIndex);

// Update LibrarianCommandCenter to use the new workspaces
const componentMapping = `
          {activeView === "reservations" && <ReservationsWorkspace />}
          {activeView === "departments" && <DepartmentsWorkspace />}
          {activeView === "visits" && <VisitsWorkspace />}
          {activeView === "requests" && <RequestsApprovalsWorkspace />}
          {activeView === "reports" && <ReportsDownloadsWorkspace />}
          {activeView === "notices" && <NoticesCommunicationWorkspace />}
          {/* Dynamically render the rest with SimpleWorkspace */}
          {!["overview", "issue", "return", "catalogue", "add_books", "loans", "lost_damaged", "fines", "borrowers", "class_textbooks", "stocktake", "settings", "reservations", "departments", "visits", "requests", "reports", "notices"].includes(activeView) && (
`;
const replaceStart = content.indexOf('          {/* Dynamically render the rest with SimpleWorkspace */}');
const replaceEnd = content.indexOf('].includes(activeView) && (');
content = content.slice(0, replaceStart) + componentMapping + content.slice(replaceEnd + '].includes(activeView) && ('.length);

fs.writeFileSync('update_librarian_workspaces_2.js', \`
const fs = require('fs');
fs.writeFileSync('scaffold_librarian.js', \\\`\${content.replace(/\\\`/g, '\\\\\\\`').replace(/\\\$/g, '\\\\\\$')}\\\`);
\`);
