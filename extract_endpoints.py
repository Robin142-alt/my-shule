import os
import re
import json

WORKSPACE_DIR = r"c:\Users\user\Desktop\PROJECTS\Shule hub"
SRC_DIR = os.path.join(WORKSPACE_DIR, "apps", "web", "src")
OUTPUT_FILE = os.path.join(WORKSPACE_DIR, ".agents", "explorer_frontend_3", "analysis.md")

KEYWORDS = ["useSchoolQuery", "useSchoolMutation", "requestDashboardApi", "fetch"]

def offset_to_line(content, offset):
    return content.count('\n', 0, offset) + 1

def split_arguments(args_str):
    args = []
    current_arg = []
    paren_depth = 0
    brace_depth = 0
    bracket_depth = 0
    in_quote = None # "'" or '"' or '`'
    escaped = False
    
    i = 0
    while i < len(args_str):
        char = args_str[i]
        
        if escaped:
            current_arg.append(char)
            escaped = False
            i += 1
            continue
            
        if char == '\\':
            current_arg.append(char)
            escaped = True
            i += 1
            continue
            
        if in_quote:
            current_arg.append(char)
            if char == in_quote:
                in_quote = None
            i += 1
            continue
            
        if char in ["'", '"', '`']:
            in_quote = char
            current_arg.append(char)
            i += 1
            continue
            
        if char == '(':
            paren_depth += 1
        elif char == ')':
            paren_depth -= 1
        elif char == '{':
            brace_depth += 1
        elif char == '}':
            brace_depth -= 1
        elif char == '[':
            bracket_depth += 1
        elif char == ']':
            bracket_depth -= 1
            
        if char == ',' and paren_depth == 0 and brace_depth == 0 and bracket_depth == 0:
            args.append("".join(current_arg).strip())
            current_arg = []
        else:
            current_arg.append(char)
        i += 1
        
    if current_arg:
        args.append("".join(current_arg).strip())
        
    return args

def extract_api_calls_from_file(file_path):
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    results = []
    
    for keyword in KEYWORDS:
        start = 0
        while True:
            # find next occurrence of keyword
            idx = content.find(keyword, start)
            if idx == -1:
                break
                
            # check boundary to make sure it's a standalone word
            before_char = content[idx - 1] if idx > 0 else ' '
            after_char = content[idx + len(keyword)] if idx + len(keyword) < len(content) else ' '
            
            is_valid_word = (not before_char.isalnum() and before_char != '_') and \
                            (not after_char.isalnum() and after_char != '_')
                            
            if not is_valid_word:
                start = idx + 1
                continue
                
            # scan generic type arguments <...> if present
            type_args = ""
            scan_idx = idx + len(keyword)
            while scan_idx < len(content) and content[scan_idx].isspace():
                scan_idx += 1
                
            if scan_idx < len(content) and content[scan_idx] == '<':
                type_start = scan_idx
                angle_depth = 1
                scan_idx += 1
                in_quote = None
                escaped = False
                while scan_idx < len(content) and angle_depth > 0:
                    c = content[scan_idx]
                    if escaped:
                        escaped = False
                    elif c == '\\':
                        escaped = True
                    elif in_quote:
                        if c == in_quote:
                            in_quote = None
                    elif c in ["'", '"', '`']:
                        in_quote = c
                    elif c == '<':
                        angle_depth += 1
                    elif c == '>':
                        angle_depth -= 1
                    scan_idx += 1
                if angle_depth == 0:
                    type_args = content[type_start:scan_idx].strip()
                    
            # scan for '('
            while scan_idx < len(content) and content[scan_idx].isspace():
                scan_idx += 1
                
            if scan_idx < len(content) and content[scan_idx] == '(':
                paren_start = scan_idx
                paren_depth = 1
                in_quote = None
                escaped = False
                scan_idx += 1
                while scan_idx < len(content) and paren_depth > 0:
                    c = content[scan_idx]
                    if escaped:
                        escaped = False
                    elif c == '\\':
                        escaped = True
                    elif in_quote:
                        if c == in_quote:
                            in_quote = None
                    elif c in ["'", '"', '`']:
                        in_quote = c
                    elif c == '(':
                        paren_depth += 1
                    elif c == ')':
                        paren_depth -= 1
                    scan_idx += 1
                    
                if paren_depth == 0:
                    args_str = content[paren_start + 1 : scan_idx - 1].strip()
                    args = split_arguments(args_str)
                    
                    line_num = offset_to_line(content, idx)
                    
                    results.append({
                        "keyword": keyword,
                        "line": line_num,
                        "type_args": type_args,
                        "args": args,
                        "raw_call": content[idx : scan_idx]
                    })
                    
            start = idx + 1
            
    return results

def process_all_files():
    all_findings = []
    
    for root, dirs, files in os.walk(SRC_DIR):
        # Skip node_modules or build output if they somehow ended up in src
        if "node_modules" in root or ".next" in root:
            continue
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, WORKSPACE_DIR)
                
                # Skip the school-hooks file itself to avoid self-reference noise,
                # as well as the api-client file itself since it defines these wrappers.
                if "school-hooks.ts" in file or "api-client.ts" in file:
                    continue
                    
                file_findings = extract_api_calls_from_file(file_path)
                for f in file_findings:
                    f["file"] = rel_path
                    all_findings.append(f)
                    
    return all_findings

def analyze_findings(findings):
    analyzed = []
    
    for f in findings:
        keyword = f["keyword"]
        file = f["file"]
        line = f["line"]
        type_args = f["type_args"]
        args = f["args"]
        raw_call = f["raw_call"]
        
        if not args:
            continue
            
        path_arg = args[0]
        
        # Clean path argument
        path_clean = path_arg.strip()
        # For fetch, we only care if it targets /api/ or has dynamic api paths.
        if keyword == "fetch":
            # If the path doesn't contain "/api/" or "api" or template literals with api/v1 or similar, skip it
            # to avoid picking up external fetch calls (like public resources or third-party APIs).
            is_internal_api = False
            if any(term in path_clean.lower() for term in ["/api/", "api/v1", "/api", "api-base", "apibase"]):
                is_internal_api = True
            elif path_clean.startswith("endpoint") or path_clean.startswith("url") or path_clean.startswith("`${api"):
                is_internal_api = True
            if not is_internal_api:
                continue
        
        # Determine HTTP Method
        method = "GET"
        if keyword == "useSchoolQuery":
            method = "GET"
        elif keyword == "useSchoolMutation":
            # In useSchoolMutation, method is the second argument (if it's a string literal like "PATCH" etc.)
            method = "POST" # default
            if len(args) > 1:
                arg2 = args[1].strip().strip("'\"`").upper()
                if arg2 in ["POST", "PATCH", "DELETE", "PUT"]:
                    method = arg2
        elif keyword in ["requestDashboardApi", "fetch"]:
            # In requestDashboardApi and fetch, method is typically in the options object (second argument)
            method = "GET" # default
            if len(args) > 1:
                options_str = args[1]
                # Look for method: "POST" etc.
                method_match = re.search(r"\bmethod\s*:\s*['\"`]([A-Z]+)['\"`]", options_str, re.IGNORECASE)
                if method_match:
                    method = method_match.group(1).upper()
                    
        # Extract parameters / body details
        params = "N/A"
        if type_args:
            # If generic type parameters exist, they might tell us the Request/Response types
            params_match = re.findall(r"<([^>]+)>", type_args)
            if params_match:
                types = [t.strip() for t in params_match[0].split(',')]
                if keyword == "useSchoolMutation" and len(types) > 1:
                    params = f"Body: {types[1]}"
                elif keyword == "useSchoolQuery":
                    params = f"Returns: {types[0]}"
                else:
                    params = f"Types: {', '.join(types)}"
        
        # If there's an options object, we can check for body
        if len(args) > 1:
            options_str = args[1]
            body_match = re.search(r"\bbody\s*:\s*([^,}]+)", options_str)
            if body_match:
                body_val = body_match.group(1).strip()
                if params == "N/A":
                    params = f"Body: {body_val}"
                else:
                    params += f" | Body: {body_val}"
                    
        # Also, check if there are query parameters in the path
        query_params_match = re.search(r"\?([^\"'`]+)", path_clean)
        if query_params_match:
            qp = query_params_match.group(1)
            if params == "N/A":
                params = f"Query: {qp}"
            else:
                params += f" | Query: {qp}"

        analyzed.append({
            "file": file,
            "line": line,
            "keyword": keyword,
            "path": path_clean,
            "method": method,
            "parameters": params,
            "raw": raw_call.replace("\n", " ").strip()
        })
        
    return analyzed

def write_markdown_report(analyzed):
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write("# Frontend API Endpoints Extraction Report\n\n")
        f.write(f"This report lists all backend API endpoints referenced in the frontend React codebase (`apps/web/src`), extracted programmatically via static analysis.\n\n")
        f.write(f"Total endpoints/references found: **{len(analyzed)}**\n\n")
        
        # Write summary table of unique endpoints
        f.write("## Unique Endpoints Summary\n\n")
        unique_endpoints = {}
        for entry in analyzed:
            # Normalize path for grouping
            p = entry["path"].strip("'\"` ")
            # Strip template brackets like ${...} to group similar endpoints
            p_norm = re.sub(r"\$\{[^}]+\}", ":param", p)
            # Remove leading /api if present for consistency
            p_norm = re.sub(r"^/api", "", p_norm)
            if not p_norm.startswith("/"):
                p_norm = "/" + p_norm
            # Group by normalized path + method
            key = (p_norm, entry["method"])
            if key not in unique_endpoints:
                unique_endpoints[key] = {
                    "raw_paths": set(),
                    "keywords": set(),
                    "files": set(),
                    "parameters": set()
                }
            unique_endpoints[key]["raw_paths"].add(p)
            unique_endpoints[key]["keywords"].add(entry["keyword"])
            unique_endpoints[key]["files"].add(f"{entry['file']}:{entry['line']}")
            if entry["parameters"] != "N/A":
                unique_endpoints[key]["parameters"].add(entry["parameters"])

        f.write("| Endpoint | Method | Hook/Function | Parameter Info | Files & Lines |\n")
        f.write("| --- | --- | --- | --- | --- |\n")
        
        # Sort keys
        sorted_keys = sorted(unique_endpoints.keys(), key=lambda x: (x[0], x[1]))
        for path_norm, method in sorted_keys:
            data = unique_endpoints[(path_norm, method)]
            hooks_str = ", ".join(sorted(data["keywords"]))
            param_str = "; ".join(sorted(data["parameters"])) if data["parameters"] else "N/A"
            files_str = "<br>".join(sorted(data["files"])[:5]) # limit to 5 files to avoid huge table rows
            if len(data["files"]) > 5:
                files_str += f"<br>and {len(data['files']) - 5} more..."
            f.write(f"| `{path_norm}` | **{method}** | `{hooks_str}` | {param_str} | {files_str} |\n")
            
        f.write("\n## All API References Details\n\n")
        f.write("| File & Line | Method | Endpoint Path | Source Hook | Parameters | Code Snippet |\n")
        f.write("| --- | --- | --- | --- | --- | --- |\n")
        
        # Sort by file and line
        sorted_details = sorted(analyzed, key=lambda x: (x["file"], x["line"]))
        for entry in sorted_details:
            snippet = entry["raw"]
            if len(snippet) > 80:
                snippet = snippet[:77] + "..."
            snippet_escaped = snippet.replace("|", "\\|").replace("`", "\\`")
            f.write(f"| `{entry['file']}:{entry['line']}` | **{entry['method']}** | `{entry['path']}` | `{entry['keyword']}` | `{entry['parameters']}` | `{snippet_escaped}` |\n")

    print(f"Report written successfully to {OUTPUT_FILE}")
    print(f"Total API references extracted: {len(analyzed)}")

if __name__ == "__main__":
    findings = process_all_files()
    analyzed = analyze_findings(findings)
    write_markdown_report(analyzed)
