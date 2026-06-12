const fs = require('fs');
const path = require('path');

const definitionsStr = fs.readFileSync('apps/web/src/lib/operational/generated-workspace-definitions.ts', 'utf8');

// We'll extract: id: "some-id", ... urgentActionStrip: [...], mainTable: table(..., [...rowActions], [...bulkActions])

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Map frontend workspace IDs to backend module names
function mapWorkspaceToModule(workspaceId) {
  if (workspaceId.includes('discipline')) return 'discipline';
  if (workspaceId.includes('admission')) return 'admissions';
  if (workspaceId.includes('procurement')) return 'procurement';
  if (workspaceId.includes('finance') || workspaceId.includes('fee')) return 'finance';
  if (workspaceId.includes('clinic') || workspaceId.includes('nurse')) return 'health';
  if (workspaceId.includes('store') || workspaceId.includes('inventory')) return 'inventory';
  if (workspaceId.includes('board') || workspaceId.includes('hostel')) return 'hostel';
  if (workspaceId.includes('transport')) return 'transport';
  if (workspaceId.includes('lib')) return 'library';
  if (workspaceId.includes('exam') || workspaceId.includes('grade')) return 'exams';
  if (workspaceId.includes('counsel')) return 'counselling';
  if (workspaceId.includes('secur') || workspaceId.includes('visit')) return 'security';
  if (workspaceId.includes('teacher') || workspaceId.includes('class')) return 'class-teacher';
  if (workspaceId.includes('ict')) return 'platform';
  if (workspaceId.includes('secretary') || workspaceId.includes('principal')) return 'operations';
  return 'operations'; // fallback
}

const moduleRegex = /moduleContract\(\{\s*id:\s*["']([^"']+)["'][^}]*?urgentActionStrip:\s*\[(.*?)\].*?mainTable:\s*table\([^,]+,\s*\[.*?\],\s*\[(.*?)\],\s*\[(.*?)\]\)/gs;

let match;
const moduleActions = {};

while ((match = moduleRegex.exec(definitionsStr)) !== null) {
  const workspaceId = match[1];
  const backendModule = mapWorkspaceToModule(workspaceId);
  
  if (!moduleActions[backendModule]) {
    moduleActions[backendModule] = new Set();
  }

  const parseArray = (str) => {
    if (!str || str.trim() === '') return [];
    return str.split(',')
      .map(s => s.replace(/["']/g, '').trim())
      .filter(s => s.length > 0 && s !== "View" && s !== "Edit" && !s.includes("Delete only if allowed"));
  };

  const urgent = parseArray(match[2]);
  const row = parseArray(match[3]);
  const bulk = parseArray(match[4]);

  const allActions = [...urgent, ...row, ...bulk];
  allActions.forEach(a => moduleActions[backendModule].add(slugify(a)));
}

// Ensure the target module directories exist
const apiDir = path.join(__dirname, 'apps/api/src/modules');

let scaffoldedCount = 0;

for (const [mod, actionsSet] of Object.entries(moduleActions)) {
  const actions = Array.from(actionsSet);
  if (actions.length === 0) continue;

  const targetDir = path.join(apiDir, mod);
  if (!fs.existsSync(targetDir)) {
    console.log(`Module directory does not exist, skipping: ${mod}`);
    continue;
  }

  const consumersDir = path.join(targetDir, 'consumers');
  if (!fs.existsSync(consumersDir)) {
    fs.mkdirSync(consumersDir, { recursive: true });
  }

  // Scaffold consumers for each action
  for (const action of actions) {
    const className = action.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('') + 'Consumer';
    const filename = path.join(consumersDir, `${action}.consumer.ts`);
    
    if (fs.existsSync(filename)) continue;

    const consumerCode = `import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ${className} implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = '${action}.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== '${action}' && event.payload.action_id !== '${action}') {
      return;
    }

    // TODO: Implement domain logic for ${action}
    console.log('[${className}] Executing action:', event.payload);
  }
}
`;
    fs.writeFileSync(filename, consumerCode);
    scaffoldedCount++;
  }
}

console.log(`Scaffolded ${scaffoldedCount} backend event consumers.`);
