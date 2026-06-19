const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\user\\Desktop\\PROJECTS\\Shule hub\\apps\\web\\src';
const outDir = 'C:\\Users\\user\\Desktop\\PROJECTS\\Shule hub\\.agents\\explorer_frontend_1';

const results = [];

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        walk(fullPath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      scanFile(fullPath);
    }
  }
}

function extractParenthesizedBlock(text, startIdx) {
  let depth = 0;
  let block = '';
  let foundOpen = false;
  for (let i = startIdx; i < text.length; i++) {
    const char = text[i];
    if (char === '(') {
      foundOpen = true;
      depth++;
      if (depth === 1) continue;
    } else if (char === ')') {
      depth--;
      if (depth === 0 && foundOpen) {
        return block;
      }
    }
    if (foundOpen) {
      block += char;
    }
  }
  return block;
}

function extractStringLiterals(text) {
  const list = [];
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === '"' || char === "'" || char === '`') {
      const quoteType = char;
      let val = '';
      i++;
      while (i < text.length) {
        if (text[i] === '\\') {
          val += text[i] + (text[i+1] || '');
          i += 2;
        } else if (text[i] === quoteType) {
          list.push(val);
          break;
        } else {
          val += text[i];
          i++;
        }
      }
    }
    i++;
  }
  return list;
}

function scanFile(filePath) {
  const relativePath = path.relative('C:\\Users\\user\\Desktop\\PROJECTS\\Shule hub', filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Let's also do a full-content match to handle multiline statements easily
  const keywords = [
    'useSchoolQuery',
    'useSchoolMutation',
    'fetchWithTenant',
    'requestDashboardApi',
    'requestSchoolApiProxy',
    'fetch',
    'axios',
    'useQuery',
    'useMutation'
  ];

  for (const keyword of keywords) {
    let pos = 0;
    while (true) {
      pos = content.indexOf(keyword, pos);
      if (pos === -1) break;

      // Ensure it's a distinct word
      const prevChar = pos > 0 ? content[pos - 1] : '';
      const nextChar = pos + keyword.length < content.length ? content[pos + keyword.length] : '';
      const isWord = /^[a-zA-Z0-9_$]$/;
      if (isWord.test(prevChar) || isWord.test(nextChar)) {
        pos += keyword.length;
        continue;
      }

      // Skip function declarations/imports
      const lineStart = content.lastIndexOf('\n', pos) + 1;
      const lineEnd = content.indexOf('\n', pos);
      const lineContent = content.substring(lineStart, lineEnd !== -1 ? lineEnd : content.length);

      if (lineContent.includes('import ') || lineContent.includes('export function ') || lineContent.includes('function ') || lineContent.includes('const ' + keyword + ' =')) {
        pos += keyword.length;
        continue;
      }

      // Find line number
      const beforeContent = content.substring(0, pos);
      const lineNumber = beforeContent.split('\n').length;

      // Extract parentheses block
      const block = extractParenthesizedBlock(content, pos);
      const literals = extractStringLiterals(block);

      let apiPath = null;
      let method = null;
      let params = [];

      if (keyword === 'useSchoolQuery') {
        method = 'GET';
        apiPath = literals[0] || null;
      } else if (keyword === 'useSchoolMutation') {
        apiPath = literals[0] || null;
        // Check if second argument is a string literal (method)
        if (literals.length > 1) {
          const possibleMethod = literals[1].toUpperCase();
          if (['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(possibleMethod)) {
            method = possibleMethod;
          }
        }
        if (!method) {
          // If not in literals, look for a method string in the block
          const methodMatch = block.match(/['"`](GET|POST|PATCH|PUT|DELETE)['"`]/i);
          method = methodMatch ? methodMatch[1].toUpperCase() : 'POST';
        }
      } else if (keyword === 'fetch' || keyword === 'fetchWithTenant' || keyword === 'requestDashboardApi' || keyword === 'requestSchoolApiProxy') {
        apiPath = literals[0] || null;
        const methodMatch = block.match(/method\s*:\s*['"`](GET|POST|PATCH|PUT|DELETE)['"`]/i);
        method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';
      } else if (keyword === 'axios') {
        // e.g. axios.get(...) or axios.post(...) or axios(...)
        apiPath = literals[0] || null;
        // check if method is in the axios property name
        const methodPropMatch = content.substring(pos, pos + 20).match(/axios\.(get|post|patch|put|delete)/i);
        if (methodPropMatch) {
          method = methodPropMatch[1].toUpperCase();
        } else {
          const methodMatch = block.match(/method\s*:\s*['"`](GET|POST|PATCH|PUT|DELETE)['"`]/i);
          method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';
        }
      } else if (keyword === 'useQuery' || keyword === 'useMutation') {
        // Tanstack query often uses queryKey or queryFn. We look for path strings inside.
        // Let's look for any string that looks like a path in the block
        const pathMatch = block.match(/['"`](\/(?:api\/)?[a-zA-Z0-9_\-\/\$\{\}\?\&\=\:]+)['"`]/);
        apiPath = pathMatch ? pathMatch[1] : null;
        const methodMatch = block.match(/method\s*:\s*['"`](GET|POST|PATCH|PUT|DELETE)['"`]/i);
        method = methodMatch ? methodMatch[1].toUpperCase() : (keyword === 'useQuery' ? 'GET' : 'POST');
      }

      // If we got a path, let's normalize it
      if (apiPath) {
        // Strip query params from path for indexing, but save params
        const qIdx = apiPath.indexOf('?');
        if (qIdx !== -1) {
          const queryStr = apiPath.substring(qIdx + 1);
          apiPath = apiPath.substring(0, qIdx);
          const queryParts = queryStr.split('&');
          for (const part of queryParts) {
            const eqIdx = part.indexOf('=');
            if (eqIdx !== -1) {
              params.push(part.substring(0, eqIdx));
            } else {
              params.push(part);
            }
          }
        }

        // Extract path parameters like ${id}
        const dynamicParams = apiPath.match(/\$\{[a-zA-Z0-9_]+\}/g) || [];
        for (const dp of dynamicParams) {
          const name = dp.replace(/[\$\{\}]/g, '');
          if (!params.includes(name)) {
            params.push(name + ' (path)');
          }
        }
      }

      // Only record if we found an api-like path
      // Api-like path starts with / or has / in it (and is not a standard file path/content type)
      const isApiPath = apiPath && (apiPath.startsWith('/') || apiPath.includes('/')) && 
                        !apiPath.includes('application/') && !apiPath.includes('multipart/') &&
                        !apiPath.endsWith('.css') && !apiPath.endsWith('.json') && !apiPath.endsWith('.js');

      if (isApiPath) {
        results.push({
          file: relativePath,
          line: lineNumber,
          keyword,
          path: apiPath,
          method: method || 'GET',
          params: params.filter(Boolean),
          raw: lineContent.trim()
        });
      }

      pos += keyword.length;
    }
  }
}

walk(srcDir);

fs.writeFileSync(path.join(outDir, 'raw_endpoints.json'), JSON.stringify(results, null, 2));
console.log(`Scan complete. Found ${results.length} endpoint references.`);
