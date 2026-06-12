const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'apps/web/src/components/school');

const template = `"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function COMPONENT_NAME() {
  return (
    <div className="space-y-6">
      <Card className="border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-white">Workspace</h2>
        </div>
        <div className="mt-4">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-white/20 mb-4" />
            <p className="text-lg font-semibold text-white">This workspace is currently under construction to match the MyShule production blueprint.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
`;

function scanAndScaffold() {
  const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('-command-center.tsx') || f.endsWith('-command-center-full.tsx'));
  let totalMissing = 0;

  for (const file of files) {
    const filePath = path.join(componentsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Match: import { ComponentName } from "./folder/file" or "../folder/file"
    const importRegex = /import\s*{\s*([A-Za-z0-9_]+)\s*}\s*from\s*["'](\.\.?)\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)["']/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const componentName = match[1];
      const dotDot = match[2]; // '.' or '..'
      const folder = match[3];
      const filename = match[4];
      
      const targetDir = path.join(componentsDir, folder);
      const targetFile = path.join(targetDir, filename + '.tsx');
      
      // If the folder is outside componentsDir, we skip (it shouldn't be based on regex)
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      if (!fs.existsSync(targetFile)) {
        console.log(`Missing file detected: ${folder}/${filename}.tsx for component ${componentName}`);
        
        const fileContent = template.replace('COMPONENT_NAME', componentName);
        fs.writeFileSync(targetFile, fileContent, 'utf-8');
        totalMissing++;
      }
    }
  }
  console.log(`\nTotal files scaffolded: ${totalMissing}`);
}

scanAndScaffold();
