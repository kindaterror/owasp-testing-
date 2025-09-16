import { sql } from 'drizzle-orm';
import { db } from '../index';

async function addTeacherRole() {
  try {
    await db.execute(sql`
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'teacher';
    `);
    console.log('Migration completed successfully: Added teacher role to user_role enum');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit();
  }
}

// Execute the migration if this file is run directly
if (require.main === module) {
  addTeacherRole();
}

export { addTeacherRole };