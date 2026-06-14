const fs = require('fs'); 
const file = 'c:/Users/user/Desktop/PROJECTS/Shule hub/apps/api/src/modules/class-teacher/class-teacher.service.ts'; 
const content = fs.readFileSync(file, 'utf8'); 
let inString = false; 
const lines = content.split('\n'); 
for(let i=0; i<lines.length; i++) { 
  const l = lines[i]; 
  let backtickCount = 0;
  for(let j=0; j<l.length; j++) {
    if(l[j] === '`') backtickCount++;
  }
  if(backtickCount % 2 !== 0) { 
    inString = !inString; 
    console.log('Backtick on line ' + (i+1) + ', now inString=' + inString); 
  } 
} 
console.log('Final inString:', inString);
