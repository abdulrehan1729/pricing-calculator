'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRequireAuth } from '@lib/useRequireAuth';
import {
  getDocument,
  addLineItem,
  removeLineItem,
  finalizeDocument,
  ApiError,
  LineItemInput,
} from '@lib/api';
import { PricingDocument } from '../../../types/document';

export default function DocumentDetailPage() {
  const authed = useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const docId = params.id as string;

  const [doc, setDoc] = useState<PricingDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Add-line form state
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [discountType, setDiscountType] = useState<'' | 'percent' | 'fixed'>('');
  const [discountValue, setDiscountValue] = useState('');
  const [taxPercent, setTaxPercent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // The single source of truth for this page's data is always a fresh
  // fetch, never a locally-patched copy — every mutation below calls this
  // afterward. This reinforces the spec's rule that the client must
  // never be the source of truth for totals.
  const refresh = useCallback(async () => {
    try {
      const data = await getDocument(docId);
      setDoc(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load document';
      setPageError(message);
    }
  }, [docId]);

  useEffect(() => {
    if (!authed) return;

    async function loadDocument() {
      setLoading(true);
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    }

    void loadDocument();
  }, [authed, refresh]);

  function resetForm() {
    setDescription('');
    setQuantity('1');
    setUnitPrice('');
    setDiscountType('');
    setDiscountValue('');
    setTaxPercent('');
  }

  async function handleAddLine(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const input: LineItemInput = {
      description,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      discountType: discountType === '' ? null : discountType,
      discountValue: discountValue === '' ? 0 : Number(discountValue),
      taxPercent: taxPercent === '' ? 0 : Number(taxPercent),
    };

    try {
      await addLineItem(docId, input);
      resetForm();
      await refresh();
    } catch (err) {
      // ApiError.message here is the exact server-side validation message
      // (e.g. "Fixed discount cannot exceed line subtotal") — surfaced
      // directly rather than re-interpreted, per the spec's requirement
      // for specific, actionable error messages.
      const message = err instanceof ApiError ? err.message : 'Failed to add line item';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveLine(lineId: string) {
    setRemovingId(lineId);
    setPageError(null);
    try {
      await removeLineItem(docId, lineId);
      await refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to remove line item';
      setPageError(message);
    } finally {
      setRemovingId(null);
    }
  }

  async function handleFinalize() {
    setFinalizeError(null);
    setFinalizing(true);
    try {
      await finalizeDocument(docId);
      await refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to finalize document';
      setFinalizeError(message);
    } finally {
      setFinalizing(false);
    }
  }

  if (!authed) return null;
  if (loading) return <div className="max-w-3xl mx-auto p-8 text-gray-500">Loading...</div>;
  if (pageError && !doc) return <div className="max-w-3xl mx-auto p-8 text-red-600">{pageError}</div>;
  if (!doc) return null;

  const isDraft = doc.status === 'draft';

  return (
    <div className="max-w-3xl mx-auto p-8">
      <button onClick={() => router.push('/documents')} className="text-sm underline mb-4">
        ← Back to documents
      </button>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{doc.title}</h1>
          <p className="text-gray-500">
            {doc.customerName} · {new Date(doc.issueDate).toLocaleDateString()}
          </p>
        </div>
        <span
          className={`text-xs px-3 py-1 rounded ${
            isDraft ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {doc.status}
        </span>
      </div>

      {pageError && <p className="text-sm text-red-600 mb-4">{pageError}</p>}

      {/* Line items table */}
      <div className="border rounded mb-6">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b bg-gray-50">
              <th className="py-2 px-3">Description</th>
              <th className="py-2 px-3 text-right">Qty</th>
              <th className="py-2 px-3 text-right">Unit Price</th>
              <th className="py-2 px-3 text-right">Discount</th>
              <th className="py-2 px-3 text-right">Tax %</th>
              <th className="py-2 px-3 text-right">Line Total</th>
              {isDraft && <th className="py-2 px-3"></th>}
            </tr>
          </thead>
          <tbody>
            {doc.lineItems.length === 0 && (
              <tr>
                <td colSpan={isDraft ? 7 : 6} className="py-4 px-3 text-gray-400 text-center">
                  No line items yet.
                </td>
              </tr>
            )}
            {doc.lineItems.map((line) => (
              <tr key={line._id} className="border-b">
                <td className="py-2 px-3">{line.description}</td>
                <td className="py-2 px-3 text-right">{line.quantity}</td>
                <td className="py-2 px-3 text-right">${line.unitPrice.toFixed(2)}</td>
                <td className="py-2 px-3 text-right">
                  {line.discountType === 'percent'
                    ? `${line.discountValue}%`
                    : line.discountType === 'fixed'
                    ? `$${line.discountValue.toFixed(2)}`
                    : '—'}
                </td>
                <td className="py-2 px-3 text-right">{line.taxPercent || '—'}</td>
                <td className="py-2 px-3 text-right font-medium">${line.lineTotal.toFixed(2)}</td>
                {isDraft && (
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => handleRemoveLine(line._id)}
                      disabled={removingId === line._id}
                      className="text-red-600 text-xs underline disabled:opacity-50"
                    >
                      {removingId === line._id ? 'Removing...' : 'Remove'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add line item form — draft only */}
      {isDraft && (
        <form onSubmit={handleAddLine} className="border rounded p-4 mb-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Add Line Item</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <input
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Quantity</label>
              <input
                type="number"
                required
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Unit Price</label>
              <input
                type="number"
                required
                min={0}
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as '' | 'percent' | 'fixed')}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="">None</option>
                <option value="percent">Percent</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Discount Value {discountType === 'percent' ? '(%)' : discountType === 'fixed' ? '($)' : ''}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                disabled={discountType === ''}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Tax %</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          {formError && (
            <p className="text-sm text-red-600" role="alert">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add Line Item'}
          </button>
        </form>
      )}

      {/* Totals summary — always exactly what the server last returned */}
      <div className="border rounded p-4 mb-6 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Subtotal</span>
          <span>${doc.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Total Discount</span>
          <span>-${doc.totalDiscount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Total Tax</span>
          <span>${doc.totalTax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-semibold text-base pt-2 border-t mt-2">
          <span>Grand Total</span>
          <span>${doc.grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Finalize action */}
      {isDraft ? (
        <div>
          <button
            onClick={handleFinalize}
            disabled={finalizing || doc.lineItems.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {finalizing ? 'Finalizing...' : 'Finalize Document'}
          </button>
          {doc.lineItems.length === 0 && (
            <p className="text-xs text-gray-400 mt-2">Add at least one line item to finalize.</p>
          )}
          {finalizeError && <p className="text-sm text-red-600 mt-2">{finalizeError}</p>}
        </div>
      ) : (
        <p className="text-sm text-gray-500">This document is finalized and cannot be edited.</p>
      )}
    </div>
  );
}
