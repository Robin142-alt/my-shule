import sys

def conditional_wrap(filepath, target_section):
    with open(filepath, 'r') as f:
        lines = f.readlines()

    out = []
    
    fee_setup_start = -1
    fee_setup_end = -1
    history_start = -1
    history_end = -1
    balances_start = -1
    balances_end = -1

    for i, line in enumerate(lines):
        if '<section className="space-y-5 rounded-xl border border-border bg-surface px-5 py-5">' in line and fee_setup_start == -1:
            fee_setup_start = i
        if '<DataTable' in line and 'title="Fee structures"' in lines[i+1]:
            fee_setup_end = i
        if '<DataTable' in line and 'title="Payment history"' in lines[i+1]:
            history_start = i
        if '<DataTable' in line and 'title="Student balances"' in lines[i+1]:
            balances_start = i
            history_end = i
        if '<Modal' in line and 'open={Boolean(statement' in lines[i+1]:
            balances_end = i

    for i, line in enumerate(lines):
        # We replace the outer section if we are in target section. If not, we just comment it out.
        if i == fee_setup_start:
            if target_section == 'fee-structures':
                out.append('{activeSection === "fee-structures" ? (\n')
                out.append('  <div className="space-y-6">\n')
                out.append(line)
            else:
                out.append('{/* \n')
                out.append(line)
        elif i == fee_setup_end:
            if target_section == 'fee-structures':
                out.append(line)
            else:
                out.append(line)
        elif i == history_start:
            if target_section == 'fee-structures':
                out.append('  </div>\n')
                out.append(') : null}\n')
                out.append('{/* \n')
                out.append(line)
            elif target_section == 'payments':
                out.append('{activeSection === "payments" ? (\n')
                out.append(line)
            else:
                out.append(line)
        elif i == history_end:
            if target_section == 'payments':
                out.append(') : null}\n')
                out.append('{/* \n')
                out.append(line)
            else:
                out.append(line)
        elif i == balances_end:
            if target_section == 'invoices':
                out.append(') : null}\n')
                out.append(line)
            else:
                out.append('*/}\n')
                out.append(line)
        elif i == balances_start and target_section == 'invoices':
            out.append('*/}\n')
            out.append('{activeSection === "invoices" ? (\n')
            out.append(line)
        else:
            out.append(line)

    with open(filepath, 'w') as f:
        f.writelines(out)

conditional_wrap('fee-structures-workspace.tsx', 'fee-structures')
conditional_wrap('invoices-workspace.tsx', 'invoices')
conditional_wrap('payments-workspace.tsx', 'payments')

print("Wrapped!")
