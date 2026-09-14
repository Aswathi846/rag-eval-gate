/**
 * Saves every message to the Neon Postgres database.
 *
 * If DATABASE_URL is missing the app still works, it just does not save
 * anything. That is deliberate so a missing database never breaks the chat.
 *
 * Everyone on the course shares one database, so every row is labelled with
 * STUDENT_NAME. That is how you find your own messages, and how the
 * instructor finds them too.
 */

import { neon } from "@neondatabase/serverless";

export type Role = "user" | "assistant";

/** One row of the messages table, as the /data page reads it back. */
export type StoredMessage = {
  id: number;
  session_id: string;
  role: string;
  content: string;
  student_name: string | null;
  created_at: string;
};

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

export function databaseIsConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Your name, as it gets written onto every row you save.
 *
 * Set STUDENT_NAME in your environment variables. If you forget, your rows
 * are labelled "unknown", which still works but makes them hard to find.
 */
export function studentName(): string {
  const name = process.env.STUDENT_NAME;
  if (typeof name !== "string" || name.trim() === "") return "unknown";
  return name.trim();
}

/**
 * Creates the messages table the first time it is needed.
 *
 * Every statement here is written so that running it a second time changes
 * nothing. That matters, because this runs on every single chat request.
 * The ALTER is what adds student_name to a table that was created before
 * this column existed.
 */
export async function ensureTable(): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id            BIGSERIAL PRIMARY KEY,
      session_id    TEXT        NOT NULL,
      role          TEXT        NOT NULL,
      content       TEXT        NOT NULL,
      student_name  TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS student_name TEXT
  `;

  // Everyone's rows live in one table, so looking up one student's messages
  // is the only query this app ever runs. An index makes that fast.
  await sql`
    CREATE INDEX IF NOT EXISTS messages_student_name_idx
    ON messages (student_name)
  `;
}

export async function saveMessage(
  sessionId: string,
  role: Role,
  content: string,
  student: string = studentName()
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    INSERT INTO messages (session_id, role, content, student_name)
    VALUES (${sessionId}, ${role}, ${content}, ${student})
  `;
}

/** The most recent messages saved by one student, newest first. */
export async function getMessages(
  student: string = studentName(),
  limit = 100
): Promise<StoredMessage[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = await sql`
    SELECT id, session_id, role, content, student_name, created_at
    FROM messages
    WHERE student_name = ${student}
    ORDER BY created_at DESC, id DESC
    LIMIT ${limit}
  `;
  return rows as StoredMessage[];
}

/** How many messages that student has saved in total, not just the recent ones. */
export async function countMessages(
  student: string = studentName()
): Promise<number> {
  const sql = getSql();
  if (!sql) return 0;
  const rows = await sql`
    SELECT COUNT(*) AS total
    FROM messages
    WHERE student_name = ${student}
  `;
  return Number((rows as { total: string | number }[])[0]?.total ?? 0);
}

export type DocumentSearchResult = {
  section_title: string;
  content: string;
  similarity: number;
};

export async function searchDocuments(
  queryEmbedding: number[],
  limit = 3,
  similarityThreshold = 0.3
): Promise<DocumentSearchResult[]> {
  const sql = getSql();
  if (!sql) return [];

  const embeddingString = `[${queryEmbedding.join(",")}]`;

  const rows = await sql`
    SELECT 
      section_title, 
      content, 
      1 - (embedding <=> ${embeddingString}::vector) AS similarity
    FROM meridian_documents
    WHERE 1 - (embedding <=> ${embeddingString}::vector) >= ${similarityThreshold}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `;

  return rows as DocumentSearchResult[];
}