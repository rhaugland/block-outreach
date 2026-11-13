import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Verify webhook signature if secret is set
  if (process.env.RESEND_WEBHOOK_SECRET) {
    const signature = req.headers.get('svix-signature');
    const timestamp = req.headers.get('svix-timestamp');
    const svixId = req.headers.get('svix-id');

    if (!signature || !timestamp || !svixId) {
      return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 });
    }
  }

  const { type, data } = body;

  // Handle inbound email
  if (type === 'email.received' || data?.from) {
    const fromEmail = typeof data.from === 'string' ? data.from : data.from?.email || data.from?.[0]?.email || '';
    const toEmail = typeof data.to === 'string' ? data.to : data.to?.email || data.to?.[0]?.email || '';
    const subject = data.subject || '(no subject)';
    const bodyText = data.text || data.body || '';
    const bodyHtml = data.html || '';

    // Try to match to a known contact
    const { rows: contacts } = await sql`
      SELECT id FROM contacts WHERE email = ${fromEmail} LIMIT 1
    `;
    const contactId = contacts.length > 0 ? contacts[0].id : null;

    await sql`
      INSERT INTO inbox_messages (contact_id, from_email, to_email, subject, body_text, body_html, direction)
      VALUES (${contactId}, ${fromEmail}, ${toEmail}, ${subject}, ${bodyText}, ${bodyHtml}, 'inbound')
    `;

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
