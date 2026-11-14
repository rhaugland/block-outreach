import { sql } from './db';

async function setup() {
  await sql`
    CREATE TABLE IF NOT EXISTS lists (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      name TEXT,
      company TEXT,
      extra JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS strategies (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      from_email TEXT NOT NULL DEFAULT 'support@blockandmortar.co',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sequence_steps (
      id SERIAL PRIMARY KEY,
      strategy_id INTEGER NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL,
      delay_days INTEGER NOT NULL DEFAULT 0,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS enrollments (
      id SERIAL PRIMARY KEY,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      strategy_id INTEGER NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
      current_step INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      enrolled_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(contact_id, strategy_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sent_emails (
      id SERIAL PRIMARY KEY,
      enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
      step_id INTEGER NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
      resend_id TEXT,
      message_id TEXT,
      sent_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS inbox_messages (
      id SERIAL PRIMARY KEY,
      contact_id INTEGER REFERENCES contacts(id),
      from_email TEXT NOT NULL,
      to_email TEXT NOT NULL,
      subject TEXT,
      body_text TEXT,
      body_html TEXT,
      direction TEXT NOT NULL DEFAULT 'inbound',
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  console.log('Database setup complete');
}

setup().catch(console.error);
