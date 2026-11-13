import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';

export async function GET() {
  const { rows } = await sql`
    SELECT l.*, COUNT(c.id)::int as contact_count
    FROM lists l
    LEFT JOIN contacts c ON c.list_id = l.id
    GROUP BY l.id
    ORDER BY l.created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const name = formData.get('name') as string;
  const file = formData.get('file') as File;

  if (!name || !file) {
    return NextResponse.json({ error: 'Name and file are required' }, { status: 400 });
  }

  const text = await file.text();
  const records = parse(text, { columns: true, skip_empty_lines: true, trim: true });

  const { rows } = await sql`INSERT INTO lists (name) VALUES (${name}) RETURNING id`;
  const listId = rows[0].id;

  for (const row of records) {
    const email = row.email || row.Email || row.EMAIL;
    if (!email) continue;
    const contactName = row.name || row.Name || row.NAME || '';
    const company = row.company || row.Company || row.COMPANY || '';

    const { email: _e, Email: _E, EMAIL: _E2, name: _n, Name: _N, NAME: _N2, company: _c, Company: _C, COMPANY: _C2, ...extra } = row;

    await sql`
      INSERT INTO contacts (list_id, email, name, company, extra)
      VALUES (${listId}, ${email}, ${contactName}, ${company}, ${JSON.stringify(extra)})
    `;
  }

  return NextResponse.json({ id: listId, count: records.length });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await sql`DELETE FROM lists WHERE id = ${parseInt(id)}`;
  return NextResponse.json({ ok: true });
}
