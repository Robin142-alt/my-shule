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

for model_name, block_content in models:
    lines = [line.strip() for line in block_content.split('\n') if line.strip()]
    
    # Let's find fields referencing School
    relation_to_school = None
    for line in lines:
        if line.startswith('//'):
            continue
        if 'School' in line and '@relation' in line:
            # Found relation to School!
            relation_to_school = line
            break
            
    if relation_to_school:
        # Check what field is used for relation
        match = re.search(r'fields:\s*\[([^\]]+)\]', relation_to_school)
        if match:
            field_names = [f.strip() for f in match.group(1).split(',')]
            # Let's print model and the fields used
            print(f"Model: {model_name} | School Relation Fields: {field_names}")
