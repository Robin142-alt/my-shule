const { execSync } = require('child_process');
const fs = require('fs');

console.log('Listing all running node.exe processes and their command lines:');
try {
  if (process.platform === 'win32') {
    const queryCmd = `powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' } | Select-Object ProcessId, CommandLine | Format-Table -AutoSize"`;
    const output = execSync(queryCmd).toString();
    console.log(output);
  } else {
    console.log('Skipping Windows node.exe process listing on this platform.');
  }
} catch (e) {
  console.log('Error listing processes:', e.message);
}

console.log('Cleaning up orphaned node.exe processes...');
try {
  if (process.platform === 'win32') {
    const pidsToKeep = [process.pid, process.ppid];
    console.log(`Current PID: ${process.pid}, Parent PID: ${process.ppid}`);

    const getPidsCmd = `powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' } | ForEach-Object { \\"$($_.ProcessId),$($_.CommandLine)\\" }"`;
    const procLines = execSync(getPidsCmd).toString().split('\n');
    for (const line of procLines) {
      if (!line.trim()) continue;
      const commaIdx = line.indexOf(',');
      if (commaIdx === -1) continue;
      const pid = parseInt(line.substring(0, commaIdx).trim(), 10);
      const cmdLine = line.substring(commaIdx + 1).trim();
      if (isNaN(pid)) continue;

      if (!pidsToKeep.includes(pid)) {
        if (cmdLine.toLowerCase().includes('next') || cmdLine.toLowerCase().includes('tsc') || cmdLine.toLowerCase().includes('webpack')) {
          console.log(`Killing process ${pid}: ${cmdLine}`);
          try {
            execSync(`powershell -NoProfile -Command "Stop-Process -Id ${pid} -Force"`);
            console.log(`Killed ${pid}`);
          } catch (err) {
            console.log(`Failed to kill ${pid}: ${err.message}`);
          }
        }
      }
    }
  } else {
    console.log('Skipping Windows node.exe process cleanup on this platform.');
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
