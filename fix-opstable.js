const fs = require('fs');
function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    let p = dir + '/' + f;
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx')) {
      let c = fs.readFileSync(p, 'utf8');
      let orig = c;
      if (c.includes('<OpsTable') && !c.includes('getRowId')) {
        c = c.replace(/loading=\{false\}/g, 'loading={false}\n        getRowId={(row) => row.id}\n        totalRows={data.length}\n        page={1}\n        pageSize={10}\n        onPageChange={() => {}}');
      }
      if (c !== orig) {
        fs.writeFileSync(p, c);
        console.log('Fixed ' + p);
      }
    }
  })
}
walk('apps/web/src/components/school/admissions-dashboard');
