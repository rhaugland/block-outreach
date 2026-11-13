import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');

  if (id) {
    const { rows: strategies } = await sql`SELECT * FROM strategies WHERE id = ${parseInt(id)}`;
    if (!strategies.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { rows: steps } = await sql`
      SELECT * FROM sequence_steps WHERE strategy_id = ${parseInt(id)} ORDER BY step_order
    `;
    const { rows: enrollments } = await sql`
      SELECT e.*, c.email, c.name as contact_name, c.company
      FROM enrollments e
      JOIN contacts c ON c.id = e.contact_id
      WHERE e.strategy_id = ${parseInt(id)}
      ORDER BY e.enrolled_at DESC
    `;

    return NextResponse.json({ ...strategies[0], steps, enrollments });
  }

  const { rows } = await sql`
    SELECT s.*,
      (SELECT COUNT(*)::int FROM sequence_steps WHERE strategy_id = s.id) as step_count,
      (SELECT COUNT(*)::int FROM enrollments WHERE strategy_id = s.id) as enrollment_count,
      (SELECT COUNT(*)::int FROM enrollments WHERE strategy_id = s.id AND status = 'active') as active_count,
      (SELECT COUNT(*)::int FROM enrollments WHERE strategy_id = s.id AND status = 'paused') as paused_count,
      (SELECT COUNT(*)::int FROM enrollments WHERE strategy_id = s.id AND status = 'completed') as completed_count
    FROM strategies s
    ORDER BY s.created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { name, from_email } = await req.json();
  const { rows } = await sql`
    INSERT INTO strategies (name, from_email) VALUES (${name}, ${from_email}) RETURNING id
  `;
  return NextResponse.json(rows[0]);
}

export async function PUT(req: NextRequest) {
  const { id, steps } = await req.json();

  await sql`DELETE FROM sequence_steps WHERE strategy_id = ${id}`;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    await sql`
      INSERT INTO sequence_steps (strategy_id, step_order, delay_days, subject, body_html)
      VALUES (${id}, ${i}, ${step.delay_days}, ${step.subject}, ${step.body_html})
    `;
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const { id, action } = await req.json();
  if (!id || !action) return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });

  if (action === 'play') {
    await sql`UPDATE enrollments SET status = 'active' WHERE strategy_id = ${id} AND status = 'paused'`;
  } else if (action === 'pause') {
    await sql`UPDATE enrollments SET status = 'paused' WHERE strategy_id = ${id} AND status = 'active'`;
  } else if (action === 'stop') {
    await sql`UPDATE enrollments SET status = 'stopped' WHERE strategy_id = ${id} AND status IN ('active', 'paused')`;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await sql`DELETE FROM strategies WHERE id = ${parseInt(id)}`;
  return NextResponse.json({ ok: true });
}
