const fs = require('fs');
function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    let p = dir + '/' + f;
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx')) {
      let c = fs.readFileSync(p, 'utf8');
      let orig = c;
      c = c.replace(/<ApprovalInbox\s*\/>/g, '<ApprovalInbox currentUserId="school" />');
      c = c.replace(/<TaskQueue\s+context=\{[^}]+\}\s*\/>/g, '<TaskQueue />');
      c = c.replace(/<NotificationBell\s+context=\{[^}]+\}\s*\/>/g, '<NotificationBell />');
      if (c !== orig) {
        fs.writeFileSync(p, c);
        console.log('Fixed ' + p);
      }
    }
  })
}
walk('apps/web/src/components');
