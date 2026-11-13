'use client';

import { useState, useEffect } from 'react';

interface Message {
  id: number;
  contact_id: number | null;
  contact_name: string | null;
  company: string | null;
  from_email: string;
  to_email: string;
  subject: string;
  body_text: string;
  body_html: string;
  direction: 'inbound' | 'outbound';
  is_read: boolean;
  created_at: string;
}

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Message | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [sending, setSending] = useState(false);
  const [fromEmail, setFromEmail] = useState('');

  const fetchMessages = async () => {
    const res = await fetch('/api/inbox');
    setMessages(await res.json());
  };

  useEffect(() => { fetchMessages(); }, []);

  const selectMessage = async (msg: Message) => {
    setSelected(msg);
    setReplySubject(`Re: ${msg.subject}`);
    setReplyBody('');
    setFromEmail(msg.to_email);

    if (!msg.is_read && msg.direction === 'inbound') {
      await fetch('/api/inbox', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: msg.id }),
      });
      fetchMessages();
    }
  };

  const sendReply = async () => {
    if (!selected || !replyBody) return;
    setSending(true);

    await fetch('/api/inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: selected.from_email,
        subject: replySubject,
        body_html: replyBody,
        from_email: fromEmail,
      }),
    });

    setSending(false);
    setReplyBody('');
    setSelected(null);
    fetchMessages();
  };

  // Group messages by thread (same contact email)
  const threads = messages.reduce((acc, msg) => {
    const key = msg.direction === 'inbound' ? msg.from_email : msg.to_email;
    if (!acc[key]) acc[key] = [];
    acc[key].push(msg);
    return acc;
  }, {} as Record<string, Message[]>);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Inbox</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message List */}
        <div className="lg:col-span-1 bg-white rounded-lg border divide-y max-h-[70vh] overflow-y-auto">
          {messages.length === 0 && (
            <p className="p-4 text-sm text-gray-500">No messages yet.</p>
          )}
          {messages.filter(m => m.direction === 'inbound').map((msg) => (
            <button
              key={msg.id}
              onClick={() => selectMessage(msg)}
              className={`w-full text-left p-4 hover:bg-gray-50 ${
                selected?.id === msg.id ? 'bg-blue-50' : ''
              } ${!msg.is_read ? 'font-semibold' : ''}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm truncate">
                  {msg.contact_name || msg.from_email}
                </p>
                {!msg.is_read && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2" />
                )}
              </div>
              <p className="text-sm text-gray-700 truncate">{msg.subject}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(msg.created_at).toLocaleDateString()} {new Date(msg.created_at).toLocaleTimeString()}
              </p>
            </button>
          ))}
        </div>

        {/* Message Detail + Reply */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
              Select a message to view
            </div>
          ) : (
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b">
                <h2 className="font-semibold">{selected.subject}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  From: {selected.contact_name ? `${selected.contact_name} <${selected.from_email}>` : selected.from_email}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>

              <div className="p-4 border-b min-h-[200px]">
                {selected.body_html ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selected.body_html }}
                  />
                ) : (
                  <pre className="text-sm whitespace-pre-wrap">{selected.body_text}</pre>
                )}
              </div>

              {/* Thread: show all messages with this contact */}
              {(() => {
                const threadKey = selected.direction === 'inbound' ? selected.from_email : selected.to_email;
                const threadMsgs = threads[threadKey]?.filter(m => m.id !== selected.id) || [];
                if (threadMsgs.length === 0) return null;
                return (
                  <div className="border-b">
                    <p className="px-4 pt-3 text-xs font-semibold text-gray-400 uppercase">Thread</p>
                    <div className="divide-y">
                      {threadMsgs.map(m => (
                        <div key={m.id} className="p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              m.direction === 'outbound' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {m.direction === 'outbound' ? 'You' : m.contact_name || m.from_email}
                            </span>
                            <span className="text-xs text-gray-400">{new Date(m.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-gray-600">{m.body_text || '(HTML email)'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Reply */}
              <div className="p-4">
                <input
                  type="text"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  className="border rounded w-full px-3 py-2 text-sm mb-2"
                  placeholder="Subject"
                />
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Write your reply..."
                  className="border rounded w-full px-3 py-2 text-sm h-32 mb-2"
                />
                <div className="flex justify-end">
                  <button
                    onClick={sendReply}
                    disabled={!replyBody || sending}
                    className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-800 disabled:opacity-50"
                  >
                    {sending ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
