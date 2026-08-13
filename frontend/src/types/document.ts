export type DiscountType = 'percent' | 'fixed' | null;
export type DocStatus = 'draft' | 'finalized';

export interface LineItem {
  _id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountType: DiscountType;
  discountValue: number;
  taxPercent: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface PricingDocument {
  _id: string;
  title: string;
  customerName: string;
  issueDate: string;
  status: DocStatus;
  lineItems: LineItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface SummaryReport {
  documentCount: number;
  sumGrandTotal: number;
  sumTotalTax: number;
  sumTotalDiscount: number;
}
