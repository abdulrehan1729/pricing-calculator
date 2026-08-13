import { PricingDocument, IPricingDocument, ILineItem } from "../models/PricingDocument";
import { calculateLine, calculateDocumentTotals, LineItemInput, DiscountType } from "../calculations/pricing";
import { AppError } from "../middleware/errorHandler";
import mongoose from "mongoose";
import { logger } from "../utils/logger";

interface CreateDocumentInput {
    title: string;
    customerName: string;
    issueDate: string;
}

interface UpdateMetaInput {
    title: string;
    customerName: string;
    issueDate: string;
}

interface LineItemPayload {
    description: string;
    quantity: number;
    unitPrice: number;
    discountType: DiscountType;
    discountValue: number;
    taxPercent: number;
}
interface SummaryReportInput {
    from: string;
    to: string;
}

interface SummaryReportResult {
    documentCount: number;
    sumGrandTotal: number;
    sumTotalTax: number;
    sumTotalDiscount: number;
}

// Called at the start of every mutating operation. This is the single
// enforcement point for "finalized documents are immutable" — every
// function below calls this before touching lineItems or metadata.

function assertEditable(doc: IPricingDocument): void {
    if (doc.status === "finalized") throw new AppError("Cannot modify a finalized document", 409, null);
}

// Every route handler goes through this instead of PricingDocument.findById.
async function findOwnedDocument(id: string, userId: string): Promise<IPricingDocument> {
    try {
        const doc = await PricingDocument.findOne({ _id: id, userId });
        if (!doc) {
            throw new AppError("Document not found", 404);
        }
        return doc;
    } catch (err) {
        if (err instanceof AppError) {
            throw err;
        }
        if (err instanceof mongoose.Error.CastError) {
            throw new AppError("Invalid document ID format", 400);
        }
        logger.error("documentService.findOwnedDocument failed", {
            documentId: id,
            userId,
            error: err,
        });
        throw new AppError("Something went wrong while retrieving the document", 500);
    }
}

/*Recomputes every line's totals and the document's totals, mutating doc
in place. This is the ONLY place in the whole service where the
calculation engine is invoked — every mutation that touches lineItems
ends by calling this, so there is no path where totals go stale.*/
function recalculateTotals(doc: IPricingDocument): void {
    const results = doc.lineItems.map((line) => {
        const input: LineItemInput = {
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountType: line.discountType,
            discountValue: line.discountValue,
            taxPercent: line.taxPercent,
        };
        try {
            const result = calculateLine(input);
            line.subtotal = result.subtotal;
            line.discountAmount = result.discountAmount;
            line.taxAmount = result.taxAmount;
            line.lineTotal = result.lineTotal;
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : "Invalid line item";
            throw new AppError(message, 400, { field: "lineItems", description: line.description });
        }
    });

    const totals = calculateDocumentTotals(results);
    doc.subtotal = totals.subtotal;
    doc.totalDiscount = totals.totalDiscount;
    doc.totalTax = totals.totalTax;
    doc.grandTotal = totals.grandTotal;
}

export async function createDocument(userId: string, input: CreateDocumentInput): Promise<IPricingDocument> {
    const issueDate = new Date(input.issueDate);
    if (isNaN(issueDate.getTime())) {
        throw new AppError("Invalid issue date", 400, { field: "issueDate" });
    }
    try {
        const doc = new PricingDocument({
            userId,
            title: input.title,
            customerName: input.customerName,
            issueDate,
            status: "draft",
            lineItems: [],
        });

        recalculateTotals(doc);
        await doc.save();
        return doc;
    } catch (err) {
        if (err instanceof AppError) {
            throw err;
        }

        if (err instanceof mongoose.Error.ValidationError) {
            const details = Object.values(err.errors).map((e) => ({
                field: e.path,
                message: e.message,
            }));
            throw new AppError("Validation failed", 400, details);
        }

        logger.error("documentService.createDocument failed", {
            userId,
            input,
            error: err,
        });
        throw new AppError("Something went wrong while creating the document", 500);
    }
}

export async function listDocuments(userId: string): Promise<IPricingDocument[]> {
    try {
        return await PricingDocument.find({ userId }).sort({ createdAt: -1 });
    } catch (err) {
        logger.error("documentService.listDocuments failed", {
            userId,
            error: err,
        });
        throw new AppError("Something went wrong while listing documents", 500);
    }
}

export async function getDocument(id: string, userId: string): Promise<IPricingDocument> {
    return findOwnedDocument(id, userId);
}

export async function updateDocumentMeta(
    id: string,
    userId: string,
    input: UpdateMetaInput,
): Promise<IPricingDocument> {
    const doc = await findOwnedDocument(id, userId);
    assertEditable(doc);
    if (input.issueDate !== undefined) {
        const issueDate = new Date(input.issueDate);
        if (isNaN(issueDate.getTime())) {
            throw new AppError("Invalid issue date", 400, { field: "issueDate" });
        }
        doc.issueDate = issueDate;
    }
    if (input.title !== undefined) doc.title = input.title;
    if (input.customerName !== undefined) doc.customerName = input.customerName;

    try {
        await doc.save();
        return doc;
    } catch (err) {
        if (err instanceof mongoose.Error.ValidationError) {
            const details = Object.values(err.errors).map((e) => ({
                field: e.path,
                message: e.message,
            }));
            throw new AppError("Validation failed", 400, details);
        }

        logger.error("documentService.updateDocumentMeta failed", {
            documentId: id,
            userId,
            error: err,
        });
        throw new AppError("Something went wrong while updating the document", 500);
    }
}

export async function deleteDocument(id: string, userId: string): Promise<void> {
    const doc = await findOwnedDocument(id, userId);

    if (doc.status === "finalized") {
        throw new AppError("Cannot delete a finalized document", 409);
    }

    try {
        await doc.deleteOne();
    } catch (err) {
        logger.error("documentService.deleteDocument failed", {
            documentId: id,
            userId,
            error: err,
        });
        throw new AppError("Something went wrong while deleting the document", 500);
    }
}

export async function addLineItem(id: string, userId: string, payload: LineItemPayload): Promise<IPricingDocument> {
    const doc = await findOwnedDocument(id, userId);
    assertEditable(doc);

    doc.lineItems.push({
        description: payload.description,
        quantity: payload.quantity,
        unitPrice: payload.unitPrice,
        discountType: payload.discountType,
        discountValue: payload.discountValue,
        taxPercent: payload.taxPercent,
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        lineTotal: 0,
    } as ILineItem);

    recalculateTotals(doc);

    try {
        await doc.save();
        return doc;
    } catch (err) {
        if (err instanceof AppError) throw err;

        if (err instanceof mongoose.Error.ValidationError) {
            const details = Object.values(err.errors).map((e) => ({
                field: e.path,
                message: e.message,
            }));
            throw new AppError("Validation failed", 400, details);
        }

        logger.error("documentService.addLineItem failed", {
            documentId: id,
            userId,
            error: err,
        });
        throw new AppError("Something went wrong while adding the line item", 500);
    }
}

export async function updateLineItem(
    id: string,
    userId: string,
    lineId: string,
    payload: Partial<LineItemPayload>,
): Promise<IPricingDocument> {
    const doc = await findOwnedDocument(id, userId);
    assertEditable(doc);

    const line = doc.lineItems.find((line) => line._id.toString() === lineId);
    if (!line) {
        throw new AppError("Line item not found", 404);
    }
    Object.assign(line, payload);
    recalculateTotals(doc);
    try {
        await doc.save();
        return doc;
    } catch (err) {
        if (err instanceof AppError) throw err;

        if (err instanceof mongoose.Error.ValidationError) {
            const details = Object.values(err.errors).map((e) => ({
                field: e.path,
                message: e.message,
            }));
            throw new AppError("Validation failed", 400, details);
        }

        logger.error("documentService.updateLineItem failed", {
            documentId: id,
            userId,
            lineId,
            error: err,
        });
        throw new AppError("Something went wrong while updating the line item", 500);
    }
}

export async function removeLineItem(id: string, userId: string, lineId: string): Promise<IPricingDocument> {
    const doc = await findOwnedDocument(id, userId);
    assertEditable(doc);

    const line = doc.lineItems.find((line) => line._id.toString() === lineId);
    if (!line) {
        throw new AppError("Line item not found", 404);
    }
    doc.lineItems = doc.lineItems.filter((l) => l._id.toString() !== lineId) as typeof doc.lineItems;

    recalculateTotals(doc);
    try {
        await doc.save();
        return doc;
    } catch (err) {
        if (err instanceof AppError) throw err;

        logger.error("documentService.removeLineItem failed", {
            documentId: id,
            userId,
            lineId,
            error: err,
        });
        throw new AppError("Something went wrong while removing the line item", 500);
    }
}

export async function finalizeDocument(id: string, userId: string): Promise<IPricingDocument> {
    const doc = await findOwnedDocument(id, userId);
    if (doc.status === "finalized") {
        throw new AppError("Document is already finalized", 409);
    }

    if (doc.lineItems.length === 0) {
        throw new AppError("Cannot finalize a document with no line items", 400);
    }
    const invalidLines = doc.lineItems.filter((line) => line.quantity <= 0 || line.unitPrice < 0);
    if (invalidLines.length > 0) {
        throw new AppError(
            "Cannot finalize: one or more line items have invalid quantity or price",
            400,
            invalidLines.map((l) => ({ description: l.description, id: l._id.toString() })),
        );
    }
    recalculateTotals(doc);
    doc.status = "finalized";
    try {
        await doc.save();
        return doc;
    } catch (err) {
        if (err instanceof AppError) throw err;

        logger.error("documentService.finalizeDocument failed", {
            documentId: id,
            userId,
            error: err,
        });
        throw new AppError("Something went wrong while finalizing the document", 500);
    }
}

export async function getSummaryReport(userId: string, input: SummaryReportInput): Promise<SummaryReportResult> {
    const fromDate = new Date(input.from);
    const toDate = new Date(input.to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new AppError("Invalid date range", 400, { fields: ["from", "to"] });
    }
    if (fromDate > toDate) {
        throw new AppError('"from" date must be before or equal to "to" date', 400);
    }

    try {
        const result = await PricingDocument.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    issueDate: { $gte: fromDate, $lte: toDate },
                },
            },
            {
                $group: {
                    _id: null,
                    documentCount: { $sum: 1 },
                    sumGrandTotal: { $sum: "$grandTotal" },
                    sumTotalTax: { $sum: "$totalTax" },
                    sumTotalDiscount: { $sum: "$totalDiscount" },
                },
            },
        ]);

        if (result.length === 0) {
            return { documentCount: 0, sumGrandTotal: 0, sumTotalTax: 0, sumTotalDiscount: 0 };
        }

        const { documentCount, sumGrandTotal, sumTotalTax, sumTotalDiscount } = result[0];
        return {
            documentCount,
            sumGrandTotal: Math.round((sumGrandTotal + Number.EPSILON) * 100) / 100,
            sumTotalTax: Math.round((sumTotalTax + Number.EPSILON) * 100) / 100,
            sumTotalDiscount: Math.round((sumTotalDiscount + Number.EPSILON) * 100) / 100,
        };
    } catch (err) {
        if (err instanceof AppError) throw err;

        logger.error("documentService.getSummaryReport failed", {
            userId,
            input,
            error: err,
        });
        throw new AppError("Something went wrong while generating the report", 500);
    }
}
