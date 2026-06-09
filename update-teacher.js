const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/school/teacher-command-center.tsx', 'utf8');
code = code.replace('import { useState, type ReactNode } from "react";', 'import { useState, type ReactNode } from "react";\nimport { useQueryClient } from "@tanstack/react-query";');
code = code.replace('type TeacherAction = "attendance" | "marks" | "assignment" | "resource" | "sms" | "cbt" | "report" | null;', 'type TeacherAction = "attendance" | "marks" | "assignment" | "resource" | "sms" | "cbt" | "report" | "requisition" | null;');

code = code.replace('["Generate report", "reports", "report", "Subject report options ready."],', '["Generate report", "reports", "report", "Subject report options ready."],\n    ["Request item", "home", "requisition", "Item request form ready."],');

code = code.replace('onSubmitSms: (record: Omit<MessageRecord, "id" | "status" | "time">) => void;', 'onSubmitSms: (record: Omit<MessageRecord, "id" | "status" | "time">) => void;\n  onSubmitRequisition: (item: string, quantity: string) => void;');
code = code.replace('onPrintSubjectReport,\n}: {', 'onPrintSubjectReport,\n  onSubmitRequisition,\n}: {');

code = code.replace('const [smsBody, setSmsBody] = useState("");', 'const [smsBody, setSmsBody] = useState("");\n  const [requisitionItem, setRequisitionItem] = useState("");\n  const [requisitionQuantity, setRequisitionQuantity] = useState("");');

code = code.replace('{activeAction === "cbt" ? "Start CBT supervision" : null}', '{activeAction === "cbt" ? "Start CBT supervision" : null}\n            {activeAction === "requisition" ? "Request item from Store" : null}');

const requisitionForm = `
      {activeAction === "requisition" ? (
        <form
          className="grid gap-3 md:grid-cols-[1fr_140px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitRequisition(requisitionItem, requisitionQuantity);
            setRequisitionItem("");
            setRequisitionQuantity("");
          }}
        >
          <input value={requisitionItem} onChange={(event) => setRequisitionItem(event.target.value)} className={inputClass} aria-label="Item to request" placeholder="Item name (e.g. Chalk, Pens)" required />
          <input value={requisitionQuantity} onChange={(event) => setRequisitionQuantity(event.target.value)} className={inputClass} aria-label="Quantity" placeholder="Quantity" required />
          <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Submit request</button>
        </form>
      ) : null}
`;
code = code.replace('{activeAction === "sms" ? (', requisitionForm + '\n      {activeAction === "sms" ? (');

code = code.replace('onSubmitSms={submitSms}\n                onPrintSubjectReport={printSubjectReport}', 'onSubmitSms={submitSms}\n                onSubmitRequisition={submitRequisition}\n                onPrintSubjectReport={printSubjectReport}');

code = code.replace('const smsMutation = useSchoolMutation("/api/communication/sms");', 'const smsMutation = useSchoolMutation("/api/communication/sms");\n  const reqMutation = useSchoolMutation("/api/inventory/requisitions");\n  const queryClient = useQueryClient();');

code = code.replace(/onSuccess: \(\) => {/g, 'onSuccess: () => {\n          queryClient.invalidateQueries();');

const submitRequisitionFn = `
  function submitRequisition(item: string, quantity: string) {
    const schoolId = getCurrentSchoolId();
    reqMutation.mutate(
      { item, quantity, department: "Academics", requester: "Teacher" },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["school", schoolId, "/api/inventory/requisitions"] });
          publishSchoolOperationalEvent({
            schoolId,
            type: "REQUISITION_SUBMITTED",
            module: "inventory",
            actorRole: "teacher",
            title: "Item requested",
            body: \`Requested \${quantity} of \${item} from Storekeeper.\`,
            entityId: runtimeId("req"),
            severity: "info",
            payload: { item, quantity },
            notifications: []
          });
          setNotice("Requisition sent to Storekeeper.");
          setActiveAction(null);
        },
        onError: (err) => setNotice(\`Action failed: \${err.message}\`)
      }
    );
  }
`;

code = code.replace('function submitSms', submitRequisitionFn + '\n\n  function submitSms');

fs.writeFileSync('apps/web/src/components/school/teacher-command-center.tsx', code);
console.log('teacher-command-center.tsx updated');
