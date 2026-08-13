'use client';

import { useState, FormEvent } from 'react';
import { useRequireAuth } from '@lib/useRequireAuth';
import { getSummaryReport, ApiError } from '@lib/api';
import { SummaryReport } from '../../types/document';

export default function ReportsPage() {
  const authed = useRequireAuth();

  // Default to the current month as a sensible starting range
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(todayStr);
  const [report, setReport] = useState<SummaryReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setReport(null);

    try {
      const data = await getSummaryReport(from, to);
      setReport(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load report';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (!authed) return null;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <a href="/documents" className="text-sm underline mb-4 inline-block">
        ← Back to documents
      </a>

      <h1 className="text-2xl font-semibold mb-6">Summary Report</h1>

      <form onSubmit={handleSubmit} className="flex items-end gap-3 mb-8">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            required
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Run Report'}
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {report && (
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded p-4">
            <p className="text-xs text-gray-500 mb-1">Documents</p>
            <p className="text-2xl font-semibold">{report.documentCount}</p>
          </div>
          <div className="border rounded p-4">
            <p className="text-xs text-gray-500 mb-1">Grand Total</p>
            <p className="text-2xl font-semibold">${report.sumGrandTotal.toFixed(2)}</p>
          </div>
          <div className="border rounded p-4">
            <p className="text-xs text-gray-500 mb-1">Total Tax</p>
            <p className="text-2xl font-semibold">${report.sumTotalTax.toFixed(2)}</p>
          </div>
          <div className="border rounded p-4">
            <p className="text-xs text-gray-500 mb-1">Total Discount</p>
            <p className="text-2xl font-semibold">${report.sumTotalDiscount.toFixed(2)}</p>
          </div>
        </div>
      )}

      {report && report.documentCount === 0 && (
        <p className="text-sm text-gray-400 mt-4">No documents found in this date range.</p>
      )}
    </div>
  );
}