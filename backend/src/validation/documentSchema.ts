import { z } from 'zod';

export const createDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  issueDate: z.string().min(1, 'Issue date is required'),
});

export const updateDocumentMetaSchema = z.object({
  title: z.string().min(1).optional(),
  customerName: z.string().min(1).optional(),
  issueDate: z.string().min(1).optional(),
});

const discountTypeSchema = z.enum(['percent', 'fixed']).nullable();

export const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unitPrice: z.number().min(0, 'Unit price must be >= 0'),
  discountType: discountTypeSchema.default(null),
  discountValue: z.number().min(0, 'Discount value must be >= 0').default(0),
  taxPercent: z.number().min(0, 'Tax percent must be >= 0').default(0),
});

export const summaryReportQuerySchema = z.object({
  from: z.string().min(1, 'from date is required'),
  to: z.string().min(1, 'to date is required'),
});

export const updateLineItemSchema = lineItemSchema.partial();