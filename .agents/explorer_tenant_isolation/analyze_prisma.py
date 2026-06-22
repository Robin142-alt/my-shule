import re
import os

def analyze_prisma_file(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Regular expression to match model blocks: model ModelName { ... }
    # Let's parse them manually by tracking curly braces to handle nested brackets correctly
    models = {}
    lines = content.split('\n')
    current_model = None
    model_lines = []
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        
        # Check for model start
        match = re.match(r'^model\s+(\w+)\s*\{', stripped)
        if match:
            current_model = match.group(1)
            model_lines = []
            continue
            
        if current_model:
            if stripped == '}':
                # End of model block
                models[current_model] = model_lines
                current_model = None
            else:
                model_lines.append(stripped)
                
    tenant_fields = {'schoolId', 'school_id', 'tenantId', 'tenant_id'}
    
    print(f"=== Analysis for {os.path.basename(filepath)} ===")
    
    for model_name, fields in models.items():
        # Parse fields and directives
        has_tenant_field = False
        tenant_field_name = None
        indexes = []
        uniques = []
        model_fields = []
        
        for field_line in fields:
            # Check for comments or block directives
            if field_line.startswith('//'):
                continue
                
            if field_line.startswith('@@index'):
                indexes.append(field_line)
                continue
            if field_line.startswith('@@unique'):
                uniques.append(field_line)
                continue
            if field_line.startswith('@@id'):
                # block primary key
                continue
                
            # It's a field declaration: name type attributes
            parts = field_line.split()
            if len(parts) >= 2:
                name = parts[0]
                type_ = parts[1]
                attribs = " ".join(parts[2:]) if len(parts) > 2 else ""
                model_fields.append((name, type_, attribs))
                if name in tenant_fields:
                    has_tenant_field = True
                    tenant_field_name = name
                    
        # Check if indexed
        is_indexed = False
        indexing_details = []
        
        # Check if field has @unique attribute
        for name, type_, attribs in model_fields:
            if name == tenant_field_name and '@unique' in attribs:
                is_indexed = True
                indexing_details.append(f"field-level @unique on {name}")
                
        # Check block indexes/uniques
        for idx in indexes + uniques:
            # Extract fields in @@index([field1, field2])
            match = re.search(r'@@(index|unique)\(\[([^\]]+)\]', idx)
            if match:
                idx_fields_str = match.group(2)
                idx_fields = [f.strip().strip('"') for f in idx_fields_str.split(',')]
                # Also clean fields that might have sorting suffix e.g. field(sort: Desc)
                cleaned_idx_fields = []
                for f in idx_fields:
                    # remove nested parentheses/args
                    f_clean = f.split('(')[0].strip()
                    cleaned_idx_fields.append(f_clean)
                
                if tenant_field_name in cleaned_idx_fields:
                    is_indexed = True
                    indexing_details.append(f"{idx} (contains {tenant_field_name})")
                    
        print(f"Model: {model_name}")
        print(f"  Tenant Scoped: {has_tenant_field} (Field: {tenant_field_name if has_tenant_field else 'None'})")
        if has_tenant_field:
            print(f"  Indexed: {is_indexed}")
            if indexing_details:
                print(f"  Index Details: {', '.join(indexing_details)}")
        print()

if __name__ == "__main__":
    analyze_prisma_file("prisma/schema.prisma")
    analyze_prisma_file("prisma/exams_schema.prisma")
