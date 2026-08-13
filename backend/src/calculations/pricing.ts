export type DiscountType = 'fixed' | 'percent' | null;

export interface LineItemInput {
  quantity: number;
  unitPrice: number;
  discountType: DiscountType;
  discountValue: number;
  taxPercent: number;
}

export interface LineItemResult {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface DocumentTotals {
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateLine(input: LineItemInput): LineItemResult {
  const { quantity, unitPrice, discountType, discountValue, taxPercent } = input;

 
  if (quantity < 1) {
    throw new Error('Quantity must be >= 1');
  }
  if (unitPrice < 0) {
    throw new Error('Unit price must be >= 0');
  }

  const subtotal = roundMoney(quantity * unitPrice);
  
  const discountAmount = roundMoney(
    discountType === 'percent'
      ? subtotal * (discountValue / 100)
      : Math.min(discountValue, subtotal),
  );
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = roundMoney(taxableAmount * (taxPercent / 100));

  return {
    subtotal,
    discountAmount,
    taxAmount,
    lineTotal: roundMoney(taxableAmount + taxAmount),
  };
}

export function calculateDocumentTotals(lines: LineItemResult[]): DocumentTotals {
  return lines.reduce<DocumentTotals>(
    (totals, line) => ({
      subtotal: roundMoney(totals.subtotal + line.subtotal),
      totalDiscount: roundMoney(totals.totalDiscount + line.discountAmount),
      totalTax: roundMoney(totals.totalTax + line.taxAmount),
      grandTotal: roundMoney(totals.grandTotal + line.lineTotal),
    }),
    { subtotal: 0, totalDiscount: 0, totalTax: 0, grandTotal: 0 },
  );
}
