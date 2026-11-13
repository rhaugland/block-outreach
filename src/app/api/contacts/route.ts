import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { list_id, strategy_id } = await req.json();

  const { rows: contacts } = await sql`SELECT id FROM contacts WHERE list_id = ${list_id}`;

  let enrolled = 0;
  for (const contact of contacts) {
    try {
      await sql`
        INSERT INTO enrollments (contact_id, strategy_id)
        VALUES (${contact.id}, ${strategy_id})
        ON CONFLICT (contact_id, strategy_id) DO NOTHING
      `;
      enrolled++;
    } catch {
      // skip duplicates
    }
  }

  return NextResponse.json({ enrolled });
}
