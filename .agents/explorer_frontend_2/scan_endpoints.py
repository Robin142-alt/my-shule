import os
import re

# Target directory
SRC_DIR = r"C:\Users\user\Desktop\PROJECTS\Shule hub\apps\web\src"
OUTPUT_FILE = r"C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_frontend_2\analysis.md"

endpoints = []

def extract_parenthesized_args(text, start_pos):
    open_paren = text.find('(', start_pos)
    if open_paren == -1:
        return None, start_pos
    
    paren_count = 1
    current = open_paren + 1
    while paren_count > 0 and current < len(text):
        if text[current] == '(':
            paren_count += 1
        elif text[current] == ')':
            paren_count -= 1
        current += 1
    
    if paren_count == 0:
        return text[open_paren+1:current-1], current
    return None, start_pos

def split_top_level_commas(args_str):
    parts = []
    current = []
    paren_count = 0
    bracket_count = 0
    brace_count = 0
    quote_char = None
    escaped = False
    
    i = 0
    while i < len(args_str):
        char = args_str[i]
        if escaped:
            current.append(char)
            escaped = False
            i += 1
            continue
        
        if char == '\\':
            current.append(char)
            escaped = True
            i += 1
            continue
            
        if quote_char:
            current.append(char)
            if char == quote_char:
                quote_char = None
            i += 1
            continue
            
        if char in ("'", '"', '`'):
            quote_char = char
            current.append(char)
            i += 1
            continue
            
        if char == '(':
            paren_count += 1
        elif char == ')':
            paren_count -= 1
        elif char == '[':
            bracket_count += 1
        elif char == ']':
            bracket_count -= 1
        elif char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            
        if char == ',' and paren_count == 0 and bracket_count == 0 and brace_count == 0:
            parts.append("".join(current).strip())
            current = []
        else:
            current.append(char)
        i += 1
        
    parts.append("".join(current).strip())
    return [p for p in parts if p]

def validate_and_extract_args(content, identifier, pos):
    # Ensure it's a full word match
    if pos > 0 and (content[pos-1].isalnum() or content[pos-1] == '_'):
        return None, pos + len(identifier)
    
    # Ensure it's not part of another word
    next_char_idx = pos + len(identifier)
    if next_char_idx < len(content) and (content[next_char_idx].isalnum() or content[next_char_idx] == '_'):
        return None, next_char_idx
        
    open_paren_idx = content.find('(', pos)
    if open_paren_idx == -1:
        return None, pos + len(identifier)
        
    intermediate = content[pos + len(identifier):open_paren_idx]
    
    # Check for invalid boundaries
    if any(char in intermediate for char in (';', '{', '}')) or any(kw in intermediate for kw in ('import', 'const', 'let', 'var', 'function', 'class', 'export')):
        return None, pos + len(identifier)
        
    args_str, end_pos = extract_parenthesized_args(content, pos)
    return args_str, end_pos

def clean_expr(expr):
    if not expr:
        return ""
    # Strip whitespace, quotes, template markers
    return expr.strip().strip("'\"`").strip()

def parse_file(filepath):
    rel_path = os.path.relpath(filepath, os.path.dirname(os.path.dirname(SRC_DIR)))
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    lines = content.splitlines()

    # 1. Search for useSchoolQuery
    pos = 0
    while True:
        pos = content.find("useSchoolQuery", pos)
        if pos == -1:
            break
        
        line_num = content[:pos].count("\n") + 1
        args_str, end_pos = validate_and_extract_args(content, "useSchoolQuery", pos)
        if args_str is not None:
            args = split_top_level_commas(args_str)
            raw_path = args[0] if args else ""
            clean_path = clean_expr(raw_path)
            
            endpoints.append({
                "file": rel_path,
                "line": line_num,
                "type": "useSchoolQuery",
                "endpoint": clean_path,
                "method": "GET",
                "params": "Query / Path variables from context",
                "raw": f"useSchoolQuery({args_str[:60]}...)" if len(args_str) > 60 else f"useSchoolQuery({args_str})"
            })
            pos = end_pos
        else:
            pos += 14

    # 2. Search for useSchoolMutation
    pos = 0
    while True:
        pos = content.find("useSchoolMutation", pos)
        if pos == -1:
            break
        
        line_num = content[:pos].count("\n") + 1
        args_str, end_pos = validate_and_extract_args(content, "useSchoolMutation", pos)
        if args_str is not None:
            args = split_top_level_commas(args_str)
            raw_path = args[0] if args else ""
            clean_path = clean_expr(raw_path)
            
            method = "POST"
            if len(args) > 1:
                method = clean_expr(args[1])
                # Validate it's a method, not options object
                if method not in ("GET", "POST", "PUT", "PATCH", "DELETE"):
                    method = "POST"
            
            endpoints.append({
                "file": rel_path,
                "line": line_num,
                "type": "useSchoolMutation",
                "endpoint": clean_path,
                "method": method,
                "params": "Variables passed to mutate function",
                "raw": f"useSchoolMutation({args_str[:60]}...)" if len(args_str) > 60 else f"useSchoolMutation({args_str})"
            })
            pos = end_pos
        else:
            pos += 17

    # 3. Search for fetch(url, options)
    pos = 0
    while True:
        pos = content.find("fetch", pos)
        if pos == -1:
            break
            
        line_num = content[:pos].count("\n") + 1
        args_str, end_pos = validate_and_extract_args(content, "fetch", pos)
        if args_str is not None:
            args = split_top_level_commas(args_str)
            raw_path = args[0] if args else ""
            clean_path = clean_expr(raw_path)
            
            is_valid_api = False
            if clean_path.startswith("http") or clean_path.startswith("/") or clean_path.startswith("`/") or clean_path.startswith("'/") or clean_path.startswith("\"/"):
                is_valid_api = True
            elif "api" in clean_path or "dashboard" in clean_path or "notifications" in clean_path:
                is_valid_api = True
            
            # Exclude false matches like css properties
            if clean_path.startswith("--") or "var(" in clean_path:
                is_valid_api = False
            
            if is_valid_api:
                method = "GET"
                options = args[1] if len(args) > 1 else ""
                if options:
                    method_match = re.search(r"method:\s*[\"'](GET|POST|PUT|PATCH|DELETE)[\"']", options, re.IGNORECASE)
                    if method_match:
                        method = method_match.group(1).upper()
                
                endpoints.append({
                    "file": rel_path,
                    "line": line_num,
                    "type": "fetch",
                    "endpoint": clean_path,
                    "method": method,
                    "params": "Request options: " + options.strip().replace("\n", " ") if options else "None",
                    "raw": f"fetch({args_str[:60]}...)" if len(args_str) > 60 else f"fetch({args_str})"
                })
            pos = end_pos
        else:
            pos += 5

    # 4. Search for fetchWithTenant(url, options)
    pos = 0
    while True:
        pos = content.find("fetchWithTenant", pos)
        if pos == -1:
            break
        
        line_num = content[:pos].count("\n") + 1
        args_str, end_pos = validate_and_extract_args(content, "fetchWithTenant", pos)
        if args_str is not None:
            args = split_top_level_commas(args_str)
            raw_path = args[0] if args else ""
            clean_path = clean_expr(raw_path)
            
            method = "GET"
            options = args[1] if len(args) > 1 else ""
            if options:
                method_match = re.search(r"method:\s*[\"'](GET|POST|PUT|PATCH|DELETE)[\"']", options, re.IGNORECASE)
                if method_match:
                    method = method_match.group(1).upper()
            
            prefix_path = f"/api{clean_path}" if not clean_path.startswith("/api") else clean_path
            
            endpoints.append({
                "file": rel_path,
                "line": line_num,
                "type": "fetchWithTenant",
                "endpoint": prefix_path,
                "method": method,
                "params": "Request options: " + options.strip().replace("\n", " ") if options else "None",
                "raw": f"fetchWithTenant({args_str[:60]}...)" if len(args_str) > 60 else f"fetchWithTenant({args_str})"
            })
            pos = end_pos
        else:
            pos += 15

    # 5. Search for direct API call usages (DashboardApi or ApprovalsApi)
    for api_class in ("DashboardApi", "ApprovalsApi"):
        pos = 0
        while True:
            pos = content.find(api_class, pos)
            if pos == -1:
                break
            
            line_num = content[:pos].count("\n") + 1
            # Ensure it's a full word
            if pos > 0 and (content[pos-1].isalnum() or content[pos-1] == '_'):
                pos += len(api_class)
                continue
            
            # Must be followed by '.'
            dot_idx = pos + len(api_class)
            if dot_idx >= len(content) or content[dot_idx] != '.':
                pos += len(api_class)
                continue
                
            # Get the method name
            method_start = dot_idx + 1
            method_end = method_start
            while method_end < len(content) and (content[method_end].isalnum() or content[method_end] == '_'):
                method_end += 1
            method_name = content[method_start:method_end]
            
            if not method_name:
                pos += len(api_class)
                continue
                
            identifier = api_class + '.' + method_name
            args_str, end_pos = validate_and_extract_args(content, identifier, pos)
            if args_str is not None:
                endpoints.append({
                    "file": rel_path,
                    "line": line_num,
                    "type": f"{api_class} usage",
                    "endpoint": f"{api_class}.{method_name}",
                    "method": "Depends on wrapper API definition",
                    "params": args_str.strip().replace("\n", " "),
                    "raw": f"{api_class}.{method_name}({args_str[:60]}...)" if len(args_str) > 60 else f"{api_class}.{method_name}({args_str})"
                })
                pos = end_pos
            else:
                pos += len(api_class)

    # 6. Look for general /api/ strings in lines to catch anything missed
    api_string_re = re.compile(r"(['\"`])/api/[a-zA-Z0-9_\-\/${}?.&=+]*\1")
    for i, line in enumerate(lines):
        line_stripped = line.strip()
        if line_stripped.startswith("//") or line_stripped.startswith("*") or "import" in line_stripped:
            continue
        for match in api_string_re.finditer(line):
            clean_str = clean_expr(match.group(0))
            
            # Skip if it is not actually a route
            if clean_str == "/api/" or clean_str == "/api":
                continue
                
            # Avoid duplicate recordings from the exact same line if we already caught it
            already_caught = any(
                e["file"] == rel_path and e["line"] == i + 1 for e in endpoints
            )
            if not already_caught:
                # Guess method
                method = "GET"
                if "post" in line.lower() or "create" in line.lower() or "add" in line.lower() or "admit" in line.lower() or "enroll" in line.lower():
                    method = "POST (Guess)"
                elif "patch" in line.lower() or "update" in line.lower():
                    method = "PATCH (Guess)"
                elif "delete" in line.lower() or "remove" in line.lower():
                    method = "DELETE (Guess)"
                
                endpoints.append({
                    "file": rel_path,
                    "line": i + 1,
                    "type": "apiString",
                    "endpoint": clean_str,
                    "method": method,
                    "params": "Literal string usage",
                    "raw": line.strip()
                })

# Traverse files
for root, dirs, files in os.walk(SRC_DIR):
    for file in files:
        if file.endswith((".ts", ".tsx")):
            parse_file(os.path.join(root, file))

# Deduplicate identical records
unique_endpoints = []
seen = set()
for e in endpoints:
    key = (e["file"], e["line"], e["endpoint"], e["method"])
    if key not in seen:
        seen.add(key)
        unique_endpoints.append(e)

# Sort by file, then line
unique_endpoints.sort(key=lambda x: (x["file"], x["line"]))

# Generate report content
report = []
report.append("# Backend API Endpoints Extracted from React Frontend")
report.append(f"\nExtracted from: `{SRC_DIR}`")
report.append(f"\nTotal unique API integration references found: {len(unique_endpoints)}")

report.append("\n## Summary Table")
report.append("| File | Line | Type | Endpoint / Method Call | Method | Parameters | Raw Usage |")
report.append("| --- | --- | --- | --- | --- | --- | --- |")

for e in unique_endpoints:
    file_link = f"`{e['file']}`"
    raw_escaped = e['raw'].replace("|", "\\|")
    report.append(f"| {file_link} | {e['line']} | `{e['type']}` | `{e['endpoint']}` | `{e['method']}` | {e['params']} | `{raw_escaped}` |")

report.append("\n## Analysis of Endpoints and Modules")
by_prefix = {}
for e in unique_endpoints:
    endpoint = e["endpoint"]
    if endpoint.startswith("/api/"):
        parts = endpoint.split("/")
        if len(parts) > 2:
            prefix = parts[2]
            by_prefix.setdefault(prefix, []).append(e)
        else:
            by_prefix.setdefault("root", []).append(e)
    elif endpoint.startswith("DashboardApi.") or endpoint.startswith("ApprovalsApi."):
        by_prefix.setdefault("wrapper-api-calls", []).append(e)
    else:
        by_prefix.setdefault("others", []).append(e)

for prefix, list_e in sorted(by_prefix.items()):
    report.append(f"\n### Module: {prefix.capitalize()} ({len(list_e)} references)")
    report.append("| Endpoint / Call | Method | Location |")
    report.append("| --- | --- | --- |")
    for e in list_e:
        report.append(f"| `{e['endpoint']}` | `{e['method']}` | `{e['file']}:{e['line']}` |")

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    f.write("\n".join(report))

print(f"Successfully wrote {len(unique_endpoints)} endpoint references to {OUTPUT_FILE}")
