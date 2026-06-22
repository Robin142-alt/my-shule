import re

schema_path = r"c:\Users\user\Desktop\PROJECTS\Shule hub\prisma\schema.prisma"

with open(schema_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Brace matching parser
models = []
pos = 0
length = len(content)

while True:
    match = re.search(r'\bmodel\s+(\w+)\s*\{', content[pos:])
    if not match:
        break
    
    model_name = match.group(1)
    start_idx = pos + match.end()
    
    brace_count = 1
    current_idx = start_idx
    while brace_count > 0 and current_idx < length:
        char = content[current_idx]
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
        current_idx += 1
        
    block_content = content[start_idx:current_idx-1]
    models.append((model_name, block_content))
    pos = current_idx

results = []

for model_name, block_content in models:
    lines = [line.strip() for line in block_content.split('\n') if line.strip()]
    
    fields = {}
    indexes = []
    uniques = []
    pk = None
    
    for line in lines:
        if line.startswith('//'):
            continue
        
        # Check block attributes
        if line.startswith('@@index'):
            match = re.match(r'@@index\(\[([^\]]+)\]', line)
            if match:
                fields_in_index = [f.strip().split('(')[0] for f in match.group(1).split(',')]
                indexes.append(fields_in_index)
        elif line.startswith('@@unique'):
            match = re.match(r'@@unique\(\[([^\]]+)\]', line)
            if match:
                fields_in_unique = [f.strip().split('(')[0] for f in match.group(1).split(',')]
                uniques.append(fields_in_unique)
        elif line.startswith('@@id'):
            match = re.match(r'@@id\(\[([^\]]+)\]', line)
            if match:
                fields_in_pk = [f.strip().split('(')[0] for f in match.group(1).split(',')]
                pk = fields_in_pk
        else:
            # Parse field line
            parts = re.split(r'\s+', line)
            if len(parts) >= 2:
                field_name = parts[0]
                field_type = parts[1]
                fields[field_name] = {
                    'type': field_type,
                    'line': line
                }

    # Find any field name that looks like a tenant/school field
    tenant_fields = []
    for fname, info in fields.items():
        fname_lower = fname.lower()
        if 'school' in fname_lower or 'tenant' in fname_lower:
            # Skip relation fields (where type is School or starts with Capital letter and is not String/Int/DateTime/Boolean/etc.)
            if info['type'] not in ['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'String?', 'Int?', 'Float?', 'Boolean?', 'DateTime?', 'Json?']:
                continue
            tenant_fields.append(fname)

    for tf in tenant_fields:
        has_index = False
        # Check in indexes
        for idx in indexes:
            if idx[0] == tf:
                has_index = True
                break
        # Check in uniques
        for uniq in uniques:
            if uniq[0] == tf:
                has_index = True
                break
        # Check in primary key if compound
        if pk and pk[0] == tf:
            has_index = True
        # Check if the field itself is marked with @unique or @id
        tenant_info = fields[tf]
        if '@unique' in tenant_info['line'] or '@id' in tenant_info['line']:
            has_index = True
            
        results.append({
            'model': model_name,
            'tenant_field': tf,
            'has_index': has_index,
            'indexes': indexes,
            'uniques': uniques,
            'pk': pk
        })

print(f"Total model-tenant_field pairs checked: {len(results)}")
not_indexed = [r for r in results if not r['has_index']]
print(f"Total model-tenant_field pairs NOT indexed: {len(not_indexed)}")
for r in not_indexed:
    print(f"Model: {r['model']} | Field: {r['tenant_field']} (Indexes: {r['indexes']}, Uniques: {r['uniques']})")
