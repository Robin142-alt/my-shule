import re

files_to_fix_any = [
    'apps/api/src/modules/discipline/repositories/counselling.repository.ts',
    'apps/api/src/modules/discipline/repositories/discipline.repository.ts'
]

for file in files_to_fix_any:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('.executeWithTenant<any>(', '.executeWithTenant(')
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

# LedgerService
ledger_file = 'apps/api/src/modules/finance/ledger.service.ts'
with open(ledger_file, 'r', encoding='utf-8') as f:
    content = f.read()
content = re.sub(r"this\.requireRuntimeDependency\(\s*this\.prisma,\s*'PrismaService',\s*\)", "this.requireRuntimeDependency(this.databaseService, 'PrismaService')", content)
with open(ledger_file, 'w', encoding='utf-8') as f:
    f.write(content)

# MpesaCallbackController
mpesa_file = 'apps/api/src/modules/payments/controllers/mpesa-callback.controller.ts'
with open(mpesa_file, 'r', encoding='utf-8') as f:
    content = f.read()
# Inject private readonly prisma?: any; inside the class definition
content = re.sub(r'(export class MpesaCallbackController[^{]*\{)', r'\1\n  private readonly prisma?: any;\n', content)
with open(mpesa_file, 'w', encoding='utf-8') as f:
    f.write(content)
