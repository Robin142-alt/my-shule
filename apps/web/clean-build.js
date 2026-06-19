const { execSync } = require('child_process');
const fs = require('fs');

console.log('Listing all running node.exe processes and their command lines:');
try {
  const queryCmd = `powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' } | Select-Object ProcessId, CommandLine | Format-Table -AutoSize"`;
  const output = execSync(queryCmd).toString();
  console.log(output);
} catch (e) {
  console.log('Error listing processes:', e.message);
}

console.log('Cleaning up orphaned node.exe processes...');
try {
  // Let's kill any node.exe process that has 'next' or 'web' or 'npm' in its command line, EXCEPT the current process and its parent
  // We can get the parent PID of the current process using process.ppid
  const pidsToKeep = [process.pid, process.ppid];
  console.log(`Current PID: ${process.pid}, Parent PID: ${process.ppid}`);
  
  // Let's use PowerShell to fetch processes and filter them in JS
  const getPidsCmd = `powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' } | ForEach-Object { \\"\\$(\\$.ProcessId),\\$(\\$.CommandLine)\\" }"`;
  const procLines = execSync(getPidsCmd).toString().split('\n');
  for (const line of procLines) {
    if (!line.trim()) continue;
    const commaIdx = line.indexOf(',');
    if (commaIdx === -1) continue;
    const pid = parseInt(line.substring(0, commaIdx).trim(), 10);
    const cmdLine = line.substring(commaIdx + 1).trim();
    if (isNaN(pid)) continue;
    
    // Check if we should kill it
    if (!pidsToKeep.includes(pid)) {
      // If it contains next, web, npm, tsc, and is not our current tree
      if (cmdLine.toLowerCase().includes('next') || cmdLine.toLowerCase().includes('tsc') || cmdLine.toLowerCase().includes('webpack')) {
        console.log(`Killing process ${pid}: ${cmdLine}`);
        try {
          execSync(`powershell -Command "Stop-Process -Id ${pid} -Force"`);
          console.log(`Killed ${pid}`);
        } catch (err) {
          console.log(`Failed to kill ${pid}: ${err.message}`);
        }
      }
    }
  }
} catch (e) {
  console.log('Error cleaning processes:', e.message);
}

console.log('Removing .next directory...');
try {
  fs.rmSync('.next', { recursive: true, force: true });
  console.log('Successfully removed .next directory.');
} catch (e) {
  console.log('Error removing .next directory:', e.message);
}
