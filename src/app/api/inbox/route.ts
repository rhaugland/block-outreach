import { sql } from '@/lib/db';
import { getResend } from '@/lib/resend';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  // Get all inbox threads grouped by contact email
  const { rows } = await sql`
    SELECT
      m.*,
      c.name as contact_name,
      c.company
    FROM inbox_messages m
    LEFT JOIN contacts c ON c.id = m.contact_id
    ORDER BY m.created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { to, subject, body_html, from_email } = await req.json();

  const result = await getResend().emails.send({
    from: from_email || process.env.RESEND_FROM_EMAIL || 'ryan@loveablecreechurs.com',
    to,
    subject,
    html: body_html,
  });

  // Match contact
  const { rows: contacts } = await sql`
    SELECT id FROM contacts WHERE email = ${to} LIMIT 1
  `;
  const contactId = contacts.length > 0 ? contacts[0].id : null;

  await sql`
    INSERT INTO inbox_messages (contact_id, from_email, to_email, subject, body_text, body_html, direction)
    VALUES (${contactId}, ${from_email || process.env.RESEND_FROM_EMAIL || 'ryan@loveablecreechurs.com'}, ${to}, ${subject}, ${body_html}, ${body_html}, 'outbound')
  `;

  return NextResponse.json({ ok: true, id: result.data?.id });
}

export async function PUT(req: NextRequest) {
  const { id } = await req.json();
  await sql`UPDATE inbox_messages SET is_read = TRUE WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
