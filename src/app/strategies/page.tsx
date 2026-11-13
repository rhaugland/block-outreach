'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Strategy {
  id: number;
  name: string;
  from_email: string;
  step_count: number;
  enrollment_count: number;
  created_at: string;
}

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [name, setName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const router = useRouter();

  const fetchStrategies = async () => {
    const res = await fetch('/api/strategies');
    setStrategies(await res.json());
  };

  useEffect(() => { fetchStrategies(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const res = await fetch('/api/strategies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, from_email: fromEmail }),
    });
    const data = await res.json();
    router.push(`/strategies/${data.id}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this strategy?')) return;
    await fetch(`/api/strategies?id=${id}`, { method: 'DELETE' });
    fetchStrategies();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Strategies</h1>

      <form onSubmit={handleCreate} className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="font-semibold mb-4">New Strategy</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Strategy name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded px-3 py-2 text-sm flex-1"
            required
          />
          <input
            type="email"
            placeholder="From email (e.g. you@domain.com)"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            className="border rounded px-3 py-2 text-sm flex-1"
            required
          />
          <button
            type="submit"
            className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-800"
          >
            Create
          </button>
        </div>
      </form>

      <div className="bg-white rounded-lg border divide-y">
        {strategies.length === 0 && (
          <p className="p-6 text-sm text-gray-500">No strategies yet.</p>
        )}
        {strategies.map((s) => (
          <div key={s.id} className="p-4 flex items-center justify-between">
            <button
              onClick={() => router.push(`/strategies/${s.id}`)}
              className="text-left"
            >
              <p className="font-medium hover:underline">{s.name}</p>
              <p className="text-sm text-gray-500">
                {s.step_count} steps &middot; {s.enrollment_count} enrolled &middot; from {s.from_email}
              </p>
            </button>
            <button
              onClick={() => handleDelete(s.id)}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
