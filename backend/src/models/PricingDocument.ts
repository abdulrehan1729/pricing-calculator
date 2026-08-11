import mongoose, { Schema, Document as MongooseDocument, Types } from "mongoose";

export type DiscountType = "percent" | "fixed" | null;
export type DocStatus = "draft" | "finalized";

export interface ILineItem {
    _id: Types.ObjectId;
    description: string;
    quantity: number;
    unitPriceCents: number;
    discountType: DiscountType;
    discountValue: number; // percent (0-100) if discountType is 'percent', cents if 'fixed'
    taxPercent: number; // 0 if none
    subtotalCents: number;
    discountAmountCents: number;
    taxAmountCents: number;
    lineTotalCents: number;
}

export interface IPricingDocument extends MongooseDocument {
    userId: Types.ObjectId;
    title: string;
    customerName: string;
    issueDate: Date;
    status: DocStatus;
    lineItems: ILineItem[];
    subtotalCents: number;
    totalDiscountCents: number;
    totalTaxCents: number;
    grandTotalCents: number;
    createdAt: Date;
    upatedAt: Date;
}

const lineItemSchema = new Schema<ILineItem>({
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPriceCents: { type: Number, required: true, min: 0 },
    discountType: { type: String, enum: ["fixed", "percent", null], default: null },
    discountValue: { type: Number, default: 0, min: 0 },
    taxPercent: { type: Number, default: 0, min: 0 },
    subtotalCents: { type: Number, required: true },
    discountAmountCents: { type: Number, required: true },
    taxAmountCents: { type: Number, required: true },
    lineTotalCents: { type: Number, required: true },
});

const pricingDocumentSchema = new Schema<IPricingDocument>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        title: { type: String, required: true, trim: true },
        customerName: { type: String, required: true, trim: true },
        issueDate: { type: Date, required: true },
        status: { type: String, enum: ["draft", "finalized"], default: "draft" },
        lineItems: { type: [lineItemSchema], default: [] },

        subtotalCents: { type: Number, default: 0 },
        totalDiscountCents: { type: Number, default: 0 },
        totalTaxCents: { type: Number, default: 0 },
        grandTotalCents: { type: Number, default: 0 },
    },
    { timestamps: true },
);

pricingDocumentSchema.index({userId:1, issueDate:1})

export const PricingDocument = mongoose.model<IPricingDocument>('PricingDocument',pricingDocumentSchema)