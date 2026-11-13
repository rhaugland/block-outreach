import { sql } from '@/lib/db';
import { getResend } from '@/lib/resend';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Verify cron secret in production
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find all active enrollments that need an email sent
  const { rows: pending } = await sql`
    SELECT
      e.id as enrollment_id,
      e.contact_id,
      e.current_step,
      e.enrolled_at,
      c.email,
      c.name as contact_name,
      c.company,
      s.from_email,
      s.name as strategy_name,
      ss.id as step_id,
      ss.subject,
      ss.body_html,
      ss.delay_days
    FROM enrollments e
    JOIN contacts c ON c.id = e.contact_id
    JOIN strategies s ON s.id = e.strategy_id
    JOIN sequence_steps ss ON ss.strategy_id = e.strategy_id AND ss.step_order = e.current_step
    WHERE e.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM sent_emails se WHERE se.enrollment_id = e.id AND se.step_id = ss.id
      )
  `;

  let sent = 0;
  let skipped = 0;

  for (const row of pending) {
    // Check if enough days have passed
    const referenceDate = row.current_step === 0
      ? new Date(row.enrolled_at)
      : await getLastSentDate(row.enrollment_id);

    if (!referenceDate) continue;

    const daysSince = Math.floor((Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince < row.delay_days) {
      skipped++;
      continue;
    }

    // Personalize the email
    const body = row.body_html
      .replace(/\{\{name\}\}/g, row.contact_name || '')
      .replace(/\{\{company\}\}/g, row.company || '')
      .replace(/\{\{email\}\}/g, row.email || '');

    const subject = row.subject
      .replace(/\{\{name\}\}/g, row.contact_name || '')
      .replace(/\{\{company\}\}/g, row.company || '')
      .replace(/\{\{email\}\}/g, row.email || '');

    try {
      const result = await getResend().emails.send({
        from: row.from_email,
        to: row.email,
        subject,
        html: body,
      });

      await sql`
        INSERT INTO sent_emails (enrollment_id, step_id, resend_id, message_id)
        VALUES (${row.enrollment_id}, ${row.step_id}, ${result.data?.id || ''}, ${result.data?.id || ''})
      `;

      // Check if there's a next step
      const { rows: nextStep } = await sql`
        SELECT id FROM sequence_steps
        WHERE strategy_id = (SELECT strategy_id FROM enrollments WHERE id = ${row.enrollment_id})
          AND step_order = ${row.current_step + 1}
      `;

      if (nextStep.length > 0) {
        await sql`UPDATE enrollments SET current_step = current_step + 1 WHERE id = ${row.enrollment_id}`;
      } else {
        await sql`UPDATE enrollments SET status = 'completed' WHERE id = ${row.enrollment_id}`;
      }

      sent++;
    } catch (err) {
      console.error(`Failed to send to ${row.email}:`, err);
    }
  }

  return NextResponse.json({ sent, skipped, pending: pending.length });
}

async function getLastSentDate(enrollmentId: number): Promise<Date | null> {
  const { rows } = await sql`
    SELECT sent_at FROM sent_emails
    WHERE enrollment_id = ${enrollmentId}
    ORDER BY sent_at DESC LIMIT 1
  `;
  return rows.length > 0 ? new Date(rows[0].sent_at) : null;
}
