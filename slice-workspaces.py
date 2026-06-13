import os

src = 'c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/school-finance-page.tsx'

def build_workspace(dest, component_name, keep_fee, keep_payments, keep_balances):
    with open(src, 'r') as f:
        lines = f.readlines()

    out = []
    
    # 0 to 1061
    for i in range(1062):
        out.append(lines[i])
        
    # 1062 to 1557
    if keep_fee:
        for i in range(1062, 1558):
            out.append(lines[i])
            
    # 1558 to 1572
    if keep_payments:
        for i in range(1558, 1573):
            out.append(lines[i])
            
    # 1573 to 1640
    if keep_balances:
        for i in range(1573, 1641):
            out.append(lines[i])
            
    # 1641 to end
    for i in range(1641, len(lines)):
        out.append(lines[i])

    content = "".join(out)
    content = content.replace('export function SchoolFinancePage(', f'export function {component_name}(')
    
    if keep_fee:
        content = content.replace('title="Billing & Collections"', 'title="Fee Structures"')
        content = content.replace('description="Termly fee generation, payment collection, and ledger reconciliation."', 'description="Manage termly fee templates and generate bulk invoices."')
    elif keep_payments:
        content = content.replace('title="Billing & Collections"', 'title="Payments & Receipts"')
        content = content.replace('description="Termly fee generation, payment collection, and ledger reconciliation."', 'description="View payment history and manual receipts."')
    elif keep_balances:
        content = content.replace('title="Billing & Collections"', 'title="Arrears & Balances"')
        content = content.replace('description="Termly fee generation, payment collection, and ledger reconciliation."', 'description="Track student fee arrears, credits, and statements."')

    with open(dest, 'w') as f:
        f.write(content)

build_workspace('c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/accountant/fee-structures-workspace.tsx', 'FeeStructuresWorkspace', True, False, False)
build_workspace('c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/accountant/invoices-workspace.tsx', 'InvoicesWorkspace', False, False, True)
build_workspace('c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/accountant/payments-workspace.tsx', 'PaymentsWorkspace', False, True, False)

print("Generated sliced workspaces!")
