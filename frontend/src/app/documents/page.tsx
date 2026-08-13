'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/src/lib/useRequireAuth';
import { listDocuments, ApiError } from '@lib/api';
import { clearToken } from '@lib/auth';
import { PricingDocument } from '../../types/document'

export default function DocumentsPage() {
  const authed = useRequireAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<PricingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authed) return;

    listDocuments()
      .then(setDocuments)
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : 'Failed to load documents';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [authed]);

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  if (!authed) return null; // useRequireAuth is mid-redirect

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <div className="flex gap-3">
          <Link href="/reports" className="text-sm underline">
            Reports
          </Link>
          <Link
            href="/documents/new"
            className="bg-black text-white px-4 py-2 rounded text-sm"
          >
            New Document
          </Link>
          <button onClick={handleLogout} className="text-sm text-gray-600 underline">
            Log out
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && documents.length === 0 && (
        <p className="text-gray-500">No documents yet. Create your first one.</p>
      )}

      {documents.length > 0 && (
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b">
              <th className="py-2">Title</th>
              <th className="py-2">Customer</th>
              <th className="py-2">Status</th>
              <th className="py-2 text-right">Grand Total</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr
                key={doc._id}
                className="border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/documents/${doc._id}`)}
              >
                <td className="py-3">{doc.title}</td>
                <td className="py-3">{doc.customerName}</td>
                <td className="py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      doc.status === 'finalized'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {doc.status}
                  </span>
                </td>
                <td className="py-3 text-right">${doc.grandTotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}