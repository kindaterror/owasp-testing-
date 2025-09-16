import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

export async function up() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  await client.connect();
  const db = drizzle(client);
  
  // Add subject column to books table
  await db.execute(sql`
    ALTER TABLE books 
    ADD COLUMN subject text;
  `);
  
  await client.end();
}

export async function down() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  await client.connect();
  const db = drizzle(client);
  
  // Remove subject column from books table
  await db.execute(sql`
    ALTER TABLE books 
    DROP COLUMN subject;
  `);
  
  await client.end();
}