import re

def analyze_schema():
    with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    current_model = None
    model_body = []
    
    models = {}
    
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
            
        # Detect model start
        model_start_match = re.match(r'^model\s+(\w+)\s+\{', line_stripped)
        if model_start_match:
            current_model = model_start_match.group(1)
            model_body = []
            continue
            
        if current_model:
            if line_stripped == '}':
                models[current_model] = model_body
                current_model = None
            else:
                model_body.append(line_stripped)

    missing_indices = []
    
    for name, body in models.items():
        has_school_id = False
        has_tenant_id = False
        
        # Check fields
        for line in body:
            if line.startswith('//') or line.startswith('@@'):
                continue
            parts = line.split()
            if len(parts) >= 2:
                field_name = parts[0]
                if field_name == 'schoolId':
                    has_school_id = True
                elif field_name == 'tenant_id':
                    has_tenant_id = True
                    
        if not (has_school_id or has_tenant_id):
            continue
            
        # Check indexes/uniques starting with schoolId or tenant_id
        has_index = False
        
        for line in body:
            if line.startswith('@@index') or line.startswith('@@unique'):
                # Extract fields list
                match = re.search(r'@@(?:index|unique)\(\[([^\]]+)\]\)', line)
                if match:
                    fields_str = match.group(1)
                    fields = [f.strip().strip('"') for f in fields_str.split(',')]
                    if len(fields) > 0:
                        first_field = fields[0]
                        if has_school_id and first_field == 'schoolId':
                            has_index = True
                        elif has_tenant_id and first_field == 'tenant_id':
                            has_index = True
                            
        if not has_index:
            missing_indices.append((name, has_school_id, has_tenant_id))
            
    print(f"Total models with missing indices: {len(missing_indices)}")
    for name, has_sid, has_tid in missing_indices:
        field = 'schoolId' if has_sid else 'tenant_id'
        print(f"Model {name} has {field} but is missing a leading index/unique on it.")

if __name__ == '__main__':
    analyze_schema()
