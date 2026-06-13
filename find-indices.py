with open('c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/school-finance-page.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '<section className="space-y-5 rounded-xl border border-border bg-surface px-5 py-5">' in line:
        print(f'section at {i}')
    if '<DataTable' in line and 'title="Fee structures"' in lines[i+1]:
        print(f'Fee structures at {i}')
    if '<DataTable' in line and 'title="Payment history"' in lines[i+1]:
        print(f'Payment history at {i}')
    if '<DataTable' in line and 'title="Student balances"' in lines[i+1]:
        print(f'Student balances at {i}')
    if '<Modal' in line and 'open={Boolean(statement' in lines[i+1]:
        print(f'Modal at {i}')
