const { Client } = require('pg');
const fs = require('fs');

const tables = [
  'exam_assessment_components',
  'exam_assessments',
  'exam_attendance_records',
  'exam_grade_boundaries',
  'exam_grading_policies',
  'exam_invigilators',
  'exam_mark_audit_logs',
  'exam_mark_entry_windows',
  'exam_mark_versions',
  'exam_marks',
  'exam_series',
  'exam_student_cases',
  'exam_subject_weightings',
  'exam_timetable_slots',
  'report_card_artifacts',
  'report_card_generation_batches',
  'student_report_card_audit_logs',
  'student_report_cards'
];

function toPascalCase(str) {
  return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

function mapType(pgType, colName) {
  if (pgType === 'uuid') return 'String';
  if (pgType === 'text' || pgType === 'character varying') return 'String';
  if (pgType === 'timestamp without time zone' || pgType === 'timestamp with time zone' || pgType === 'date') return 'DateTime';
  if (pgType === 'boolean') return 'Boolean';
  if (pgType === 'integer' || pgType === 'smallint') return 'Int';
  if (pgType === 'numeric' || pgType === 'double precision') return 'Decimal';
  if (pgType === 'jsonb' || pgType === 'json') return 'Json';
  return 'String';
}

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5433/my_shule'
  });
  await client.connect();

  let output = '';
  for (const table of tables) {
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [table]);

    const columns = res.rows;
    if (!columns || columns.length === 0) {
      console.log(`Table ${table} not found in database!`);
      continue;
    }

    const modelName = toPascalCase(table);
    output += `\nmodel ${modelName} {\n`;

    let hasId = false;

    for (const col of columns) {
      let type = mapType(col.data_type, col.column_name);
      if (col.is_nullable === 'YES' && col.column_name !== 'id') {
        type += '?';
      }

      let decorators = '';
      if (col.column_name === 'id') {
        decorators = ' @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid';
        type = 'String';
        hasId = true;
      } else if (col.data_type === 'uuid') {
        decorators = ' @db.Uuid';
      } else if (col.column_name === 'created_at') {
        decorators = ' @default(now())';
      } else if (col.column_name === 'updated_at') {
        decorators = ' @updatedAt';
      } else if (col.column_name === 'tenant_id') {
        // no special decorators usually, unless required
      }

      output += `  ${col.column_name} ${type}${decorators}\n`;
    }
    
    if (!hasId) {
       output += `\n  @@ignore // No ID column found\n`
    }

    output += `\n  @@map("${table}")\n`;
    output += `}\n`;
  }

  fs.writeFileSync('C:/Users/user/Desktop/PROJECTS/Shule hub/prisma/exams_schema.prisma', output);
  console.log('Successfully generated exams_schema.prisma');
  await client.end();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
