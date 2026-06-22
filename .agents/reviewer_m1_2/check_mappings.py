import re

def analyze_mappings():
    with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    current_model = None
    model_body = []
    
    models = {}
    
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
            
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

    # We want to find:
    # 1. Models with schoolId field and their @map definition
    # 2. Models with tenant_id field and their type/@map definition
    # 3. Models with relations to School and their details
    
    print("=== FIELD MAPPINGS AND RELATION ANALYSIS ===")
    
    for name, body in models.items():
        schoolId_def = None
        tenant_id_def = None
        school_rel_def = None
        
        for line in body:
            if line.startswith('//') or line.startswith('@@'):
                continue
            parts = line.split()
            if len(parts) >= 2:
                field_name = parts[0]
                if field_name == 'schoolId':
                    schoolId_def = line
                elif field_name == 'tenant_id':
                    tenant_id_def = line
                elif field_name == 'school' and 'School' in parts[1]:
                    school_rel_def = line
                    
        if schoolId_def or tenant_id_def:
            print(f"\nModel: {name}")
            if schoolId_def:
                print(f"  schoolId field: {schoolId_def}")
            if tenant_id_def:
                print(f"  tenant_id field: {tenant_id_def}")
            if school_rel_def:
                print(f"  school relation: {school_rel_def}")

if __name__ == '__main__':
    analyze_mappings()
