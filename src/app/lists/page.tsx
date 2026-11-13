'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface List {
  id: number;
  name: string;
  contact_count: number;
  created_at: string;
}

export default function ListsPage() {
  const [lists, setLists] = useState<List[]>([]);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchLists = async () => {
    const res = await fetch('/api/lists');
    const data = await res.json();
    setLists(data);
  };

  useEffect(() => { fetchLists(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('file', file);

    await fetch('/api/lists', { method: 'POST', body: formData });
    setName('');
    setFile(null);
    setUploading(false);
    fetchLists();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this list and all its contacts?')) return;
    await fetch(`/api/lists?id=${id}`, { method: 'DELETE' });
    fetchLists();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Lists</h1>

      <form onSubmit={handleUpload} className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="font-semibold mb-4">Upload New List</h2>
        <p className="text-sm text-gray-500 mb-4">
          CSV with columns: email, name, company (email is required)
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="List name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded px-3 py-2 text-sm flex-1"
            required
          />
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="border rounded px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            disabled={uploading}
            className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-lg border divide-y">
        {lists.length === 0 && (
          <p className="p-6 text-sm text-gray-500">No lists yet. Upload a CSV to get started.</p>
        )}
        {lists.map((list) => (
          <div key={list.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{list.name}</p>
              <p className="text-sm text-gray-500">
                {list.contact_count} contacts &middot; {new Date(list.created_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => handleDelete(list.id)}
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
