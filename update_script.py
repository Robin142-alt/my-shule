import sys

filepath = 'apps/web/src/components/school/role-operational-command-center.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    'import { dispatchOperationalWorkflowAction } from "@/lib/workflows/operational-workflow-client";',
    'import { dispatchOperationalWorkflowAction } from "@/lib/workflows/operational-workflow-client";\nimport { TeacherCommandCenter } from "./teacher-command-center";'
)

# 2. Hooks
content = content.replace(
    'const [healthById, setHealthById] = useState<Record<string, OperationalActionHealth>>({});',
    'const [healthById, setHealthById] = useState<Record<string, OperationalActionHealth>>({});\n  const { data: teacherClasses } = useSchoolQuery<any[]>("/api/academics/teacher/classes");\n  const hasTeachingAssignments = Array.isArray(teacherClasses) && teacherClasses.length > 0;\n  const [isMyTeachingMode, setIsMyTeachingMode] = useState(false);'
)

# 3. Main header
content = content.replace(
    '<main className="flex min-h-dvh min-w-0 flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">\n          <header className="shrink-0 border-b border-[#D7E0EF] bg-[linear-gradient(135deg,#071D49_0%,#123A7A_58%,#0F172A_100%)] px-4 py-2.5 text-white shadow-[0_18px_48px_rgba(7,29,73,0.16)] md:px-5">',
    '''<main className="flex min-h-dvh min-w-0 flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">
          {hasTeachingAssignments && (
            <div className="flex shrink-0 border-b border-[#D7E0EF] bg-[linear-gradient(135deg,#071D49_0%,#123A7A_58%,#0F172A_100%)] px-4">
              <button
                type="button"
                onClick={() => setIsMyTeachingMode(false)}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${!isMyTeachingMode ? "border-cyan-200 text-white" : "border-transparent text-white/60 hover:text-white"}`}
              >
                {roleTitle} Workspace
              </button>
              <button
                type="button"
                onClick={() => setIsMyTeachingMode(true)}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${isMyTeachingMode ? "border-cyan-200 text-white" : "border-transparent text-white/60 hover:text-white"}`}
              >
                My Teaching
              </button>
            </div>
          )}
          {isMyTeachingMode ? (
            <div className="flex-1 min-h-0 bg-[#F3F6FA] overflow-hidden">
              <TeacherCommandCenter routeMode="marks" isEmbedded={true} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <header className="shrink-0 border-b border-[#D7E0EF] bg-[linear-gradient(135deg,#071D49_0%,#123A7A_58%,#0F172A_100%)] px-4 py-2.5 text-white shadow-[0_18px_48px_rgba(7,29,73,0.16)] md:px-5">'''
)

# 4. Closing the ternary operator at the end
# The block ends after </section>
# But wait, there are two matching occurrences of:
end_block = '''            </div>
          </section>
        </main>'''

new_end_block = '''            </div>
          </section>
          </div>
          )}
        </main>'''
content = content.replace(end_block, new_end_block)

# 5. Wrap OperationalAuditLog
# Replace:
#           <div className="fixed bottom-0 right-0 z-50 p-4 lg:p-6">
#             <OperationalAuditLog log={executionLog} />
#           </div>
audit_log = '''          <div className="fixed bottom-0 right-0 z-50 p-4 lg:p-6">
            <OperationalAuditLog log={executionLog} />
          </div>'''
new_audit_log = '''          {!isMyTeachingMode && (
            <div className="fixed bottom-0 right-0 z-50 p-4 lg:p-6">
              <OperationalAuditLog log={executionLog} />
            </div>
          )}'''
content = content.replace(audit_log, new_audit_log)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
