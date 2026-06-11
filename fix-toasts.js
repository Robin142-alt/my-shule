const fs = require('fs');
function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    let p = dir + '/' + f;
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx')) {
      let c = fs.readFileSync(p, 'utf8');
      let orig = c;
      c = c.replace(/<WorkflowToast\s*\/>/g, '');
      if (c !== orig) {
        fs.writeFileSync(p, c);
        console.log('Fixed ' + p);
      }
    }
  })
}
walk('apps/web/src/components');
