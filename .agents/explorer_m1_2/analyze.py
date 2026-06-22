import re

def analyze_schema_lines():
    filepath = r"c:\Users\user\Desktop\PROJECTS\Shule hub\prisma\schema.prisma"
    target_tables = [
        "StudentClassAssignment",
        "StudentNote",
        "ParentMeeting",
        "ClassRequest",
        "AcademicAuditLog",
        "AcademicAssignment",
        "AcademicResource",
        "LessonLog",
        "ClassTeacherAssignment",
        "ReportCardSetting"
    ]
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        content = "".join(lines)
        
    model_regex = re.compile(r'model\s+(\w+)\s*\{')
    
    for match in model_regex.finditer(content):
        model_name = match.group(1)
        if model_name not in target_tables:
            continue
        start_idx = match.start()
        
        # Calculate line number (1-based)
        start_line = content[:start_idx].count('\n') + 1
        
        brace_count = 0
        end_line = -1
        for i in range(start_idx, len(content)):
            if content[i] == '{':
                brace_count += 1
            elif content[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_line = content[:i].count('\n') + 1
                    break
                    
        body = content[start_idx:i+1]
        has_school_id = "schoolId" in body
        school_id_indices = []
        index_regex = re.compile(r'@@(index|unique)\(\[([^\]]+)\]\)')
        for idx_match in index_regex.finditer(body):
            fields = [f.strip().strip('"') for f in idx_match.group(2).split(',')]
            if "schoolId" in fields:
                school_id_indices.append(idx_match.group(0))
                
        print(f"{model_name}: Lines {start_line}-{end_line}, has index: {school_id_indices}")

if __name__ == "__main__":
    analyze_schema_lines()
