import re

with open('apps/api/src/modules/finance/finance.test.ts', 'r') as f:
    content = f.read()

# Insert the mock as the first argument
content = re.sub(
    r'new LedgerService\(\s*\{\s*get: \(key: string\)',
    r'new LedgerService(\n    { withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback() } as never,\n    {\n      get: (key: string)',
    content
)
# Remove the old mock
content = re.sub(
    r'\{\s*withRequestTransaction: async <T>\(callback: \(\) => Promise<T>\): Promise<T> => callback\(\),\s*\} as never,',
    r'undefined as never,',
    content
)

with open('apps/api/src/modules/finance/finance.test.ts', 'w') as f:
    f.write(content)
