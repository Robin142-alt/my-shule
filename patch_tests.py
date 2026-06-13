import os
import glob
import re

files = glob.glob('apps/api/src/**/*.ts', recursive=True)

fallback_query = """
    if ((this.databaseService as any).query) {
      const sqlParam = arguments[1] || arguments[0];
      const paramsParam = arguments[2] || arguments[1] || [];
      return (this.databaseService as any).query(sqlParam, paramsParam);
    }
"""

for filepath in files:
    if filepath.endswith('.test.ts'): continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # We want to patch ANY executeSql... that returns immediately
    # Pattern: `private async executeSql(anything){(whitespace)return `
    # Note: we use a negative lookahead to ensure we don't patch if it already has `if ((this.databaseService as any).query)` right after.
    
    pattern = re.compile(r'([ \t]*private async executeSql[^{]*\{)(\s*)(?!\s*if \(\(this\.databaseService as any\)\.query\))(return )', re.DOTALL)
    
    def replacer(match):
        sig = match.group(1)
        ws = match.group(2)
        ret = match.group(3)
        return sig + fallback_query + ws + ret
        
    content = pattern.sub(replacer, content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Patched", filepath)
