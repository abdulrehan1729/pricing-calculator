'use client';

import { useState, type SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@lib/useRequireAuth';
import { createDocument, ApiError } from '@lib/api';

export default function NewDocumentPage() {
  const authed = useRequireAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const doc = await createDocument({ title, customerName, issueDate });
     
      router.push(`/documents/${doc._id}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create document';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!authed) return null;

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-6">New Document</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. Invoice #001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Customer Name</label>
          <input
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Issue Date</label>
          <input
            type="date"
            required
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Document'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/documents')}
            className="text-sm text-gray-600 underline"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
