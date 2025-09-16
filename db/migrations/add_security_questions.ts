// Create a new file in your migrations folder
// e.g., db/migrations/add_security_questions.ts

import { sql } from 'drizzle-orm';
import { db } from '../index';

export async function addSecurityQuestions() {
  return db.execute(sql`
    ALTER TABLE users 
    ADD COLUMN security_question TEXT,
    ADD COLUMN security_answer TEXT;
  `);
} 

// Add at the bottom of add_security_questions.ts
// Execute the migration if this file is run directly
if (require.main === module) {
  addSecurityQuestions()
    .then(() => console.log('Migration completed successfully'))
    .catch((err) => console.error('Migration failed:', err))
    .finally(() => process.exit());
}