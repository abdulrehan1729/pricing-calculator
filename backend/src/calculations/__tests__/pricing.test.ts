import { describe, expect, it } from '@jest/globals';
import { calculateDocumentTotals, calculateLine } from '../pricing';

describe('calculateLine', () => {
  it('calculates a percentage discount and tax', () => {
    const result = calculateLine({
      quantity: 2,
      unitPrice: 100,
      discountType: 'percent',
      discountValue: 10,
      taxPercent: 5,
    });

    expect(result).toEqual({
      subtotal: 200,
      discountAmount: 20,
      taxAmount: 9,
      lineTotal: 189,
    });
  });

  it('calculates tax without a discount', () => {
    const result = calculateLine({
      quantity: 1,
      unitPrice: 50,
      discountType: null,
      discountValue: 0,
      taxPercent: 5,
    });

    expect(result).toEqual({
      subtotal: 50,
      discountAmount: 0,
      taxAmount: 2.5,
      lineTotal: 52.5,
    });
  });

  it('calculates a fixed-amount discount', () => {
    const result = calculateLine({
      quantity: 1,
      unitPrice: 200,
      discountType: 'fixed',
      discountValue: 20,
      taxPercent: 0,
    });

    expect(result).toEqual({
      subtotal: 200,
      discountAmount: 20,
      taxAmount: 0,
      lineTotal: 180,
    });
  });

  it('caps a fixed discount at the line subtotal', () => {
    const result = calculateLine({
      quantity: 1,
      unitPrice: 10,
      discountType: 'fixed',
      discountValue: 20,
      taxPercent: 0,
    });

    expect(result).toEqual({
      subtotal: 10,
      discountAmount: 10,
      taxAmount: 0,
      lineTotal: 0,
    });
  });

  it('rejects quantity below 1', () => {
    expect(() => calculateLine({
      quantity: 0,
      unitPrice: 10,
      discountType: null,
      discountValue: 0,
      taxPercent: 0,
    })).toThrow('Quantity must be >= 1');
  });
});

describe('calculateDocumentTotals', () => {
  it('sums the sample document totals', () => {
    const lines = [
      calculateLine({ quantity: 2, unitPrice: 100, discountType: 'percent', discountValue: 10, taxPercent: 5 }),
      calculateLine({ quantity: 1, unitPrice: 50, discountType: null, discountValue: 0, taxPercent: 5 }),
      calculateLine({ quantity: 1, unitPrice: 200, discountType: 'fixed', discountValue: 20, taxPercent: 0 }),
    ];

    expect(calculateDocumentTotals(lines)).toEqual({
      subtotal: 450,
      totalDiscount: 40,
      totalTax: 11.5,
      grandTotal: 421.5,
    });
  });
});
