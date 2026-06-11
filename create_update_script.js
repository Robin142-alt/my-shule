const fs = require('fs');

const tsxContent = `
function AddBooksWorkspace() {
  return (
    <Panel title="Add / Accession Books" description="Register new book titles, add copies, generate accession numbers, and print barcodes." icon={BookPlus}>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-[#D8E0EC] bg-white p-5">
            <h3 className="font-bold text-[#071D49] mb-4">Book Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-bold text-[#071D49] mb-1">Title *</label>
                <input type="text" className="w-full rounded-xl border border-[#D8E0EC] py-2 px-3 text-sm focus:border-[#071D49] focus:outline-none focus:ring-1 focus:ring-[#071D49]" placeholder="e.g., The River and the Source" />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#071D49] mb-1">Author *</label>
                <input type="text" className="w-full rounded-xl border border-[#D8E0EC] py-2 px-3 text-sm focus:border-[#071D49] focus:outline-none" placeholder="e.g., Margaret Ogola" />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#071D49] mb-1">ISBN</label>
                <input type="text" className="w-full rounded-xl border border-[#D8E0EC] py-2 px-3 text-sm focus:border-[#071D49] focus:outline-none" placeholder="e.g., 978-9966-..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#071D49] mb-1">Category *</label>
                <select className="w-full rounded-xl border border-[#D8E0EC] py-2 px-3 text-sm focus:border-[#071D49] focus:outline-none bg-white">
                  <option>Literature</option>
                  <option>Mathematics</option>
                  <option>Science</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#071D49] mb-1">Class Level</label>
                <select className="w-full rounded-xl border border-[#D8E0EC] py-2 px-3 text-sm focus:border-[#071D49] focus:outline-none bg-white">
                  <option>All Classes</option>
                  <option>Form 1</option>
                  <option>Form 2</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#D8E0EC] bg-white p-5">
            <h3 className="font-bold text-[#071D49] mb-4">Copy Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#071D49] mb-1">Number of Copies *</label>
                <input type="number" min="1" defaultValue="1" className="w-full rounded-xl border border-[#D8E0EC] py-2 px-3 text-sm focus:border-[#071D49] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#071D49] mb-1">Shelf Location *</label>
                <input type="text" className="w-full rounded-xl border border-[#D8E0EC] py-2 px-3 text-sm focus:border-[#071D49] focus:outline-none" placeholder="e.g., Shelf A2" />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#071D49] mb-1">Accession Mode</label>
                <select className="w-full rounded-xl border border-[#D8E0EC] py-2 px-3 text-sm focus:border-[#071D49] focus:outline-none bg-white">
                  <option>Auto-generate</option>
                  <option>Manual Entry</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#071D49] mb-1">Acquisition Source</label>
                <select className="w-full rounded-xl border border-[#D8E0EC] py-2 px-3 text-sm focus:border-[#071D49] focus:outline-none bg-white">
                  <option>Purchase</option>
                  <option>Donation</option>
                  <option>Government Supply</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button className="rounded-xl bg-[#071D49] px-6 py-2.5 text-sm font-black text-white">Save & Add Copies</button>
            <button className="rounded-xl border border-[#D8E0EC] bg-white px-6 py-2.5 text-sm font-bold text-[#071D49]">Save & Print Barcodes</button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-5">
            <h3 className="font-bold text-[#071D49] mb-2">Bulk Import</h3>
            <p className="text-sm text-[#64748B] mb-4">Got a lot of books to add? Use our CSV template.</p>
            <div className="space-y-3 flex flex-col">
              <button className="flex justify-center items-center gap-2 rounded-lg bg-white border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49]">
                <Download className="w-4 h-4" /> Download Template
              </button>
              <button className="flex justify-center items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">
                Upload CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function LoansOverduesWorkspace() {
  return (
    <Panel title="Loans & Overdues" description="Monitor issued books, due dates, overdue borrowers, reminders, and escalation status." icon={Clock} actions={
      <div className="flex gap-2">
        <button className="rounded-lg border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-bold text-[#071D49]">Export</button>
        <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Send SMS Reminders</button>
      </div>
    }>
      <div className="flex gap-4 mb-4 border-b border-[#D8E0EC]">
        <button className="pb-2 text-sm font-black text-[#071D49] border-b-2 border-[#071D49]">Overdue</button>
        <button className="pb-2 text-sm font-bold text-[#64748B]">Due Today</button>
        <button className="pb-2 text-sm font-bold text-[#64748B]">All Active Loans</button>
        <button className="pb-2 text-sm font-bold text-[#64748B]">Reminder History</button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]"><input type="checkbox" className="rounded" /></th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Borrower</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class/Dept</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Book Title</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Due Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Overdue</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Reminder</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {[
              { borrower: "Brian Otieno", class: "Form 3 Blue", title: "A Doll's House", due: "01 Jun 2026", overdue: "10 days", status: "Sent (2)" },
              { borrower: "Mercy Kipkorir", class: "Form 1 East", title: "Certificate Agriculture Form 1", due: "05 Jun 2026", overdue: "6 days", status: "Pending" },
              { borrower: "Mr. Omondi", class: "Science Dept", title: "Advanced Chemistry", due: "20 May 2026", overdue: "22 days", status: "Escalated" },
            ].map((l, i) => (
              <tr key={i} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3"><input type="checkbox" className="rounded" /></td>
                <td className="px-4 py-3 font-semibold text-[#071D49]">{l.borrower}</td>
                <td className="px-4 py-3 text-[#64748B]">{l.class}</td>
                <td className="px-4 py-3 text-[#071D49]">{l.title}</td>
                <td className="px-4 py-3 text-rose-600 font-medium">{l.due}</td>
                <td className="px-4 py-3 font-bold text-rose-600">{l.overdue}</td>
                <td className="px-4 py-3"><StatusChip label={l.status} tone={l.status === 'Pending' ? 'neutral' : l.status === 'Escalated' ? 'danger' : 'success'} /></td>
                <td className="px-4 py-3 text-right">
                  <button className="text-blue-600 hover:underline font-semibold mr-3">Remind</button>
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

function LostDamagedWorkspace() {
  return (
    <Panel title="Lost / Damaged Books" description="Record lost and damaged books, assign charges, and track replacement." icon={HeartCrack} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Record Lost Book</button>
    }>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Lost This Term</div>
          <div className="mt-1 text-2xl font-black text-rose-700">16</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Damaged This Term</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">24</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Awaiting Replacement</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">10</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Written Off</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">5</div>
        </div>
      </div>
      
      <div className="flex gap-4 mb-4 border-b border-[#D8E0EC]">
        <button className="pb-2 text-sm font-black text-[#071D49] border-b-2 border-[#071D49]">Lost Books</button>
        <button className="pb-2 text-sm font-bold text-[#64748B]">Damaged Books</button>
        <button className="pb-2 text-sm font-bold text-[#64748B]">Repair Queue</button>
        <button className="pb-2 text-sm font-bold text-[#64748B]">Written Off</button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Book Title</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Borrower</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date Reported</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Cost</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Fine Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {[
              { title: "Secondary Math Bk 2", borrower: "Kevin Ochieng (Form 2)", date: "09 Jun 2026", cost: "KES 850", status: "Sent to Accounts" },
              { title: "Blossoms of the Savannah", borrower: "Library Inventory", date: "02 Jun 2026", cost: "KES 600", status: "N/A" },
            ].map((b, i) => (
              <tr key={i} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{b.title}</td>
                <td className="px-4 py-3 text-[#64748B]">{b.borrower}</td>
                <td className="px-4 py-3 text-[#64748B]">{b.date}</td>
                <td className="px-4 py-3 font-medium">{b.cost}</td>
                <td className="px-4 py-3"><StatusChip label={b.status} tone={b.status === 'N/A' ? 'neutral' : 'info'} /></td>
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

function FinesPaymentsWorkspace() {
  return (
    <Panel title="Fines & Payments" description="Track library fines, replacement charges, waivers, and payment status." icon={Banknote} actions={
      <div className="flex gap-2">
        <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Create Fine</button>
      </div>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student/Staff</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class/Dept</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Fine Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Amount</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {[
              { borrower: "Brian Otieno", class: "Form 3 Blue", type: "Overdue", amount: "KES 200", status: "Pending" },
              { borrower: "Kevin Ochieng", class: "Form 2 East", type: "Lost Book", amount: "KES 850", status: "Sent to Accounts" },
              { borrower: "Joy Kendi", class: "Form 1 West", type: "Damage Repair", amount: "KES 300", status: "Paid" },
            ].map((f, i) => (
              <tr key={i} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{f.borrower}</td>
                <td className="px-4 py-3 text-[#64748B]">{f.class}</td>
                <td className="px-4 py-3 text-[#64748B]">{f.type}</td>
                <td className="px-4 py-3 font-medium text-rose-600">{f.amount}</td>
                <td className="px-4 py-3"><StatusChip label={f.status} tone={f.status === 'Pending' ? 'warning' : f.status === 'Paid' ? 'success' : 'info'} /></td>
                <td className="px-4 py-3 text-right">
                  <button className="text-blue-600 hover:underline font-semibold mr-3">View</button>
                  {f.status === "Pending" && <button className="text-[#071D49] hover:underline font-semibold">Send to Accounts</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function StudentsBorrowersWorkspace() {
  return (
    <Panel title="Students & Borrowers" description="View borrower profiles, active loans, and restrictions." icon={Users}>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" />
          <input type="text" placeholder="Search student by name, admission no, class..." className="w-full rounded-xl border border-[#D8E0EC] py-2 pl-9 pr-3 text-sm focus:border-[#071D49] focus:outline-none" />
        </div>
        <select className="rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-bold text-[#071D49]">
          <option>All Borrowers</option>
          <option>Students</option>
          <option>Staff</option>
          <option>Has Overdue</option>
          <option>Restricted</option>
        </select>
      </div>
      
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Borrower</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Adm/Staff No.</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class/Dept</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Active Loans</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {[
              { name: "Amina Wanjiku", adm: "ADM-2104", class: "Form 2 East", loans: 2, status: "Active" },
              { name: "Brian Otieno", adm: "ADM-2041", class: "Form 3 Blue", loans: 3, status: "Has Overdue" },
              { name: "Kevin Ochieng", adm: "ADM-2210", class: "Form 2 East", loans: 0, status: "Restricted" },
            ].map((s, i) => (
              <tr key={i} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{s.name}</td>
                <td className="px-4 py-3 text-[#64748B]">{s.adm}</td>
                <td className="px-4 py-3 text-[#64748B]">{s.class}</td>
                <td className="px-4 py-3 font-medium">{s.loans}</td>
                <td className="px-4 py-3"><StatusChip label={s.status} tone={s.status === 'Active' ? 'success' : s.status === 'Restricted' ? 'danger' : 'warning'} /></td>
                <td className="px-4 py-3 text-right">
                  <button className="text-blue-600 hover:underline font-semibold">View Profile</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ClassTextbookWorkspace() {
  return (
    <Panel title="Class Textbook Distribution" description="Distribute textbooks, readers, and subject resources to classes and teachers." icon={Layers} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Issue to Class</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class/Stream</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Subject</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Book Title</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Issued</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Teacher Responsible</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {[
              { class: "Form 1 East", subject: "English", title: "Memories We Lost", issued: 45, teacher: "Mr. Kamau", status: "Issued" },
              { class: "Form 2 Blue", subject: "Math", title: "Secondary Math Bk 2", issued: 50, teacher: "Ms. Omondi", status: "Return Pending" },
            ].map((c, i) => (
              <tr key={i} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{c.class}</td>
                <td className="px-4 py-3 text-[#64748B]">{c.subject}</td>
                <td className="px-4 py-3 text-[#071D49]">{c.title}</td>
                <td className="px-4 py-3 font-medium">{c.issued}</td>
                <td className="px-4 py-3 text-[#64748B]">{c.teacher}</td>
                <td className="px-4 py-3"><StatusChip label={c.status} tone={c.status === 'Issued' ? 'success' : 'warning'} /></td>
                <td className="px-4 py-3 text-right">
                  <button className="text-blue-600 hover:underline font-semibold mr-3">Receive</button>
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

function LibraryStocktakeWorkspace() {
  return (
    <Panel title="Library Stocktake" description="Scan, count, reconcile, and report library stock by shelf, category, or whole library." icon={ScanBarcode} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Start Stocktake</button>
    }>
      <div className="flex flex-col items-center justify-center py-16 text-center bg-[#F8FAFC] rounded-xl border border-dashed border-[#D8E0EC]">
        <ScanBarcode className="h-12 w-12 text-[#64748B]/30 mb-4" />
        <p className="text-lg font-bold text-[#071D49]">No Active Stocktake</p>
        <p className="mt-2 text-sm text-[#64748B] max-w-md">Start a new stocktake to audit books on shelves, record missing items, and generate a reconciliation report.</p>
        <div className="mt-6 flex gap-3">
          <button className="rounded-lg border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-bold text-[#071D49]">View Previous Stocktakes</button>
        </div>
      </div>
    </Panel>
  );
}

function SettingsWorkspace() {
  return (
    <Panel title="Library Settings" description="Configure library rules, borrowing limits, due dates, fines, and notification templates." icon={Settings}>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="rounded-xl border border-[#D8E0EC] p-5 bg-white">
            <h3 className="font-bold text-[#071D49] mb-4">Borrowing Rules</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-[#D8E0EC] pb-3">
                <span className="text-sm font-semibold text-[#071D49]">Max books per student</span>
                <input type="number" defaultValue="3" className="w-20 rounded-lg border border-[#D8E0EC] py-1 px-2 text-center text-sm" />
              </div>
              <div className="flex justify-between items-center border-b border-[#D8E0EC] pb-3">
                <span className="text-sm font-semibold text-[#071D49]">Max books per staff</span>
                <input type="number" defaultValue="10" className="w-20 rounded-lg border border-[#D8E0EC] py-1 px-2 text-center text-sm" />
              </div>
              <div className="flex justify-between items-center border-b border-[#D8E0EC] pb-3">
                <span className="text-sm font-semibold text-[#071D49]">Default loan duration (days)</span>
                <input type="number" defaultValue="14" className="w-20 rounded-lg border border-[#D8E0EC] py-1 px-2 text-center text-sm" />
              </div>
            </div>
            <button className="mt-4 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white w-full">Save Rules</button>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="rounded-xl border border-[#D8E0EC] p-5 bg-white">
            <h3 className="font-bold text-[#071D49] mb-4">Fine Rules</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-[#D8E0EC] pb-3">
                <span className="text-sm font-semibold text-[#071D49]">Enable overdue fines</span>
                <input type="checkbox" defaultChecked className="rounded" />
              </div>
              <div className="flex justify-between items-center border-b border-[#D8E0EC] pb-3">
                <span className="text-sm font-semibold text-[#071D49]">Fine per day (KES)</span>
                <input type="number" defaultValue="20" className="w-20 rounded-lg border border-[#D8E0EC] py-1 px-2 text-center text-sm" />
              </div>
            </div>
            <button className="mt-4 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white w-full">Save Fine Settings</button>
          </div>
        </div>
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
          {activeView === "overview" && <OverviewWorkspace onNavigate={setActiveView} />}
          {activeView === "issue" && <IssueBooksWorkspace />}
          {activeView === "return" && <ReturnBooksWorkspace />}
          {activeView === "catalogue" && <BookCatalogueWorkspace />}
          {activeView === "add_books" && <AddBooksWorkspace />}
          {activeView === "loans" && <LoansOverduesWorkspace />}
          {activeView === "lost_damaged" && <LostDamagedWorkspace />}
          {activeView === "fines" && <FinesPaymentsWorkspace />}
          {activeView === "borrowers" && <StudentsBorrowersWorkspace />}
          {activeView === "class_textbooks" && <ClassTextbookWorkspace />}
          {activeView === "stocktake" && <LibraryStocktakeWorkspace />}
          {activeView === "settings" && <SettingsWorkspace />}
          {/* Dynamically render the rest with SimpleWorkspace */}
          {!["overview", "issue", "return", "catalogue", "add_books", "loans", "lost_damaged", "fines", "borrowers", "class_textbooks", "stocktake", "settings"].includes(activeView) && (
`;
const replaceStart = content.indexOf('{activeView === "overview"');
const replaceEnd = content.indexOf('!["overview", "issue", "return", "catalogue"].includes(activeView) && (');
content = content.slice(0, replaceStart) + componentMapping + content.slice(replaceEnd + '!["overview", "issue", "return", "catalogue"].includes(activeView) && ('.length);

fs.writeFileSync('update_librarian_workspaces.js', `
const fs = require('fs');
fs.writeFileSync('scaffold_librarian.js', \`${content.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`);
`);
