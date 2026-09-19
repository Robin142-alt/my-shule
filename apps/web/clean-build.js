const fs = require('node:fs');
const path = require('node:path');

// Explicit recovery command only. Normal builds let Next.js refresh its output
// while preserving .next/cache. Never terminate other workspaces' processes.
const outputDirectory = path.resolve(__dirname, '.next');
fs.rmSync(outputDirectory, { recursive: true, force: true });
console.log('Removed this web app\'s .next directory.');
