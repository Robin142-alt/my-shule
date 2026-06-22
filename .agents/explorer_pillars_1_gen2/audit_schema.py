import re
import os

schema_path = r"c:\Users\user\Desktop\PROJECTS\Shule hub\prisma\schema.prisma"

with open(schema_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's write a proper brace-matching parser for models
models = []
pos = 0
length = len(content)

while True:
    match = re.search(r'\bmodel\s+(\w+)\s*\{', content[pos:])
    if not match:
        break
    
    model_name = match.group(1)
    start_idx = pos + match.end()
    
    # Track braces to find the matching '}'
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

print(f"Parsed {len(models)} models using brace matching.")

missing_indexes = []
all_models_info = []

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

    # Identify tenant field
    tenant_field = None
    for fname, info in fields.items():
        if fname in ['schoolId', 'tenant_id', 'tenantId', 'school_id']:
            tenant_field = fname
            break
        if '@map("school_id")' in info['line'] or '@map("tenant_id")' in info['line']:
            tenant_field = fname
            break
            
    if tenant_field:
        has_index = False
        
        # Check in indexes
        for idx in indexes:
            if idx[0] == tenant_field:
                has_index = True
                break
                
        # Check in uniques
        for uniq in uniques:
            if uniq[0] == tenant_field:
                has_index = True
                break
                
        # Check in primary key if compound
        if pk and pk[0] == tenant_field:
            has_index = True
            
        # Check if the field itself is marked with @unique or @id
        tenant_info = fields[tenant_field]
        if '@unique' in tenant_info['line'] or '@id' in tenant_info['line']:
            has_index = True
            
        all_models_info.append({
            'model': model_name,
            'tenant_field': tenant_field,
            'has_index': has_index,
            'indexes': indexes,
            'uniques': uniques,
            'pk': pk
        })
        
        if not has_index:
            missing_indexes.append((model_name, tenant_field, indexes, uniques))

print(f"\nFound {len(all_models_info)} models with tenant field.")
print(f"Found {len(missing_indexes)} models missing index/unique constraint starting with tenant field.")

print("\n--- Missing Indexes Details ---")
for model, tf, idxs, unqs in missing_indexes:
    print(f"Model: {model} | Tenant Field: {tf}")
    print(f"  Existing Indexes: {idxs}")
    print(f"  Existing Uniques: {unqs}")
