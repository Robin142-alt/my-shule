const fs = require('fs');
const path = require('path');

const dtoDir = 'apps/api/src/modules/admissions/dto';
const dtoFiles = [
  'create-enquiry.dto.ts',
  'create-interview.dto.ts',
  'create-offer.dto.ts',
  'create-appointment.dto.ts',
  'create-task.dto.ts',
  'create-template.dto.ts'
];

dtoFiles.forEach(file => {
  const filePath = path.join(dtoDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // replace `propertyName: type;` with `propertyName!: type;`
  // also handle optional properties `propertyName?: type;`
  content = content.replace(/(\w+)(: \w+;)/g, '$1!$2');
  
  fs.writeFileSync(filePath, content, 'utf8');
});
console.log('DTOs fixed.');
