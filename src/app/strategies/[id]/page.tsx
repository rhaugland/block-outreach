'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Step {
  id?: number;
  delay_days: number;
  subject: string;
  body_html: string;
}

interface Enrollment {
  id: number;
  email: string;
  contact_name: string;
  company: string;
  current_step: number;
  status: string;
  enrolled_at: string;
}

interface Strategy {
  id: number;
  name: string;
  from_email: string;
  steps: Step[];
  enrollments: Enrollment[];
}

interface ListOption {
  id: number;
  name: string;
  contact_count: number;
}

export default function StrategyDetailPage() {
  const params = useParams();
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [saving, setSaving] = useState(false);
  const [lists, setLists] = useState<ListOption[]>([]);
  const [selectedList, setSelectedList] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const fetchStrategy = async () => {
    const res = await fetch(`/api/strategies?id=${params.id}`);
    const data = await res.json();
    setStrategy(data);
    setSteps(data.steps || []);
  };

  const fetchLists = async () => {
    const res = await fetch('/api/lists');
    setLists(await res.json());
  };

  useEffect(() => { fetchStrategy(); fetchLists(); }, []);

  const addStep = () => {
    setSteps([...steps, { delay_days: steps.length === 0 ? 0 : 3, subject: '', body_html: '' }]);
  };

  const updateStep = (i: number, field: keyof Step, value: string | number) => {
    const updated = [...steps];
    (updated[i] as any)[field] = value;
    setSteps(updated);
  };

  const removeStep = (i: number) => {
    setSteps(steps.filter((_, idx) => idx !== i));
  };

  const saveSteps = async () => {
    setSaving(true);
    await fetch('/api/strategies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: params.id, steps }),
    });
    setSaving(false);
    fetchStrategy();
  };

  const enrollList = async () => {
    if (!selectedList) return;
    setEnrolling(true);
    await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list_id: parseInt(selectedList), strategy_id: parseInt(params.id as string) }),
    });
    setEnrolling(false);
    setSelectedList('');
    fetchStrategy();
  };

  if (!strategy) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/strategies" className="text-sm text-gray-500 hover:text-gray-700">&larr; Back</Link>
        <h1 className="text-2xl font-bold">{strategy.name}</h1>
        <span className="text-sm text-gray-500">from {strategy.from_email}</span>
      </div>

      {/* Sequence Steps */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Email Sequence</h2>
          <div className="flex gap-2">
            <button onClick={addStep} className="text-sm bg-gray-100 px-3 py-1.5 rounded hover:bg-gray-200">
              + Add Step
            </button>
            <button
              onClick={saveSteps}
              disabled={saving}
              className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Sequence'}
            </button>
          </div>
        </div>

        {steps.length === 0 && (
          <p className="text-sm text-gray-500">No steps yet. Add your first email.</p>
        )}

        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500">Step {i + 1}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-500">Send</span>
                    <input
                      type="number"
                      min="0"
                      value={step.delay_days}
                      onChange={(e) => updateStep(i, 'delay_days', parseInt(e.target.value) || 0)}
                      className="border rounded w-16 px-2 py-1 text-sm text-center"
                    />
                    <span className="text-sm text-gray-500">days after {i === 0 ? 'enrollment' : `step ${i}`}</span>
                  </div>
                </div>
                <button onClick={() => removeStep(i)} className="text-sm text-red-600 hover:text-red-800">
                  Remove
                </button>
              </div>
              <input
                type="text"
                placeholder="Subject line"
                value={step.subject}
                onChange={(e) => updateStep(i, 'subject', e.target.value)}
                className="border rounded w-full px-3 py-2 text-sm mb-2"
              />
              <textarea
                placeholder="Email body (HTML supported). Use {{name}}, {{company}}, {{email}} for personalization."
                value={step.body_html}
                onChange={(e) => updateStep(i, 'body_html', e.target.value)}
                className="border rounded w-full px-3 py-2 text-sm h-32 font-mono"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Enroll a List */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="font-semibold mb-4">Enroll a List</h2>
        <div className="flex gap-3">
          <select
            value={selectedList}
            onChange={(e) => setSelectedList(e.target.value)}
            className="border rounded px-3 py-2 text-sm flex-1"
          >
            <option value="">Select a list...</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.contact_count} contacts)
              </option>
            ))}
          </select>
          <button
            onClick={enrollList}
            disabled={!selectedList || enrolling}
            className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {enrolling ? 'Enrolling...' : 'Enroll'}
          </button>
        </div>
      </div>

      {/* Enrolled Contacts */}
      <div className="bg-white rounded-lg border">
        <h2 className="font-semibold p-4 border-b">
          Enrolled Contacts ({strategy.enrollments?.length || 0})
        </h2>
        {(!strategy.enrollments || strategy.enrollments.length === 0) && (
          <p className="p-4 text-sm text-gray-500">No contacts enrolled yet.</p>
        )}
        <div className="divide-y">
          {strategy.enrollments?.map((e) => (
            <div key={e.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{e.contact_name || e.email}</p>
                <p className="text-xs text-gray-500">
                  {e.email} {e.company && `· ${e.company}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm">
                  Step {e.current_step + 1} of {steps.length || '?'}
                </p>
                <p className={`text-xs ${e.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                  {e.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
