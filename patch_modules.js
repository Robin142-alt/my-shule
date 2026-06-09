const fs = require('fs');
const path = require('path');

const basePath = "c:\\Users\\user\\Desktop\\PROJECTS\\Shule hub\\apps\\api\\src\\modules";

function patchModule(moduleName, fileName) {
    const filePath = path.join(basePath, moduleName, fileName);
    if (!fs.existsSync(filePath)) {
        console.log("Not found:", filePath);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf8');

    if (!content.includes('EventsModule')) {
        content = "import { EventsModule } from '../events/events.module';\n" + content;
        
        if (content.includes('imports: [')) {
            content = content.replace(/imports:\s*\[/, "imports: [\n    EventsModule,");
        } else {
            content = content.replace(/@Module\(\{/, "@Module({\n  imports: [EventsModule],");
        }
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log("Updated", filePath);
    }
}

patchModule('discipline', 'discipline.module.ts');
patchModule('boarding', 'boarding.module.ts');
patchModule('transport', 'transport.module.ts');
patchModule('admissions', 'admissions.module.ts');
