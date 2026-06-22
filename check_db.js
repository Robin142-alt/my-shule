const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/myshule'
});

async function main() {
  await client.connect();
  try {
    const schools = await client.query('SELECT id, slug, name FROM schools');
    console.log('SCHOOLS:', schools.rows);
    
    const students = await client.query('SELECT s.id, s.school_id, sch.slug FROM students s JOIN schools sch ON s.school_id = sch.id LIMIT 5');
    console.log('STUDENTS:', students.rows);

    const users = await client.query('SELECT id, email FROM users LIMIT 10');
    console.log('USERS:', users.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
