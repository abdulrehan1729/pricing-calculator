import { getToken } from "./auth";
import type { PricingDocument, SummaryReport } from "../types/document";
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
    status: number;
    details?: unknown;

    constructor(message: string, status: number, details?: unknown) {
        super(message);
        this.status = status;
        this.details = details;
    }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (res.status === 204) {
        return undefined as T;
    }

    const data = await res.json();

    if (!res.ok) {
        throw new ApiError(data.error || "Request failed", res.status, data.details);
    }
    return data as T;
}

export function signup(email: string, password: string): Promise<{ token: string }> {
    return request<{ token: string }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
}

export function login(email: string, password: string): Promise<{ token: string }> {
    return request<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
}

export function createDocument(input: { title: string; customerName: string; issueDate: string }) {
    return request<PricingDocument>("/documents", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export function listDocuments(): Promise<PricingDocument[]> {
    return request<PricingDocument[]>("/documents");
}

export function getDocument(id: string): Promise<PricingDocument> {
    return request<PricingDocument>(`/documents/${id}`);
}

export function updateDocument(id: string, document: PricingDocument): Promise<PricingDocument> {
    return request<PricingDocument>(`/documents/${id}`, {
        method: "PUT",
        body: JSON.stringify(document),
    });
}

export function deleteDocument(id: string): Promise<void> {
    return request<void>(`/documents/${id}`, {
        method: "DELETE",
    });
}

export function finalizeDocument(id: string) {
    return request<PricingDocument>(`/documents/${id}/finalize`, { method: "PATCH" });
}

export interface LineItemInput {
    description: string;
    quantity: number;
    unitPrice: number;
    discountType: "percent" | "fixed" | null;
    discountValue: number;
    taxPercent: number;
}

export function addLineItem(docId: string, input: LineItemInput) {
    return request<PricingDocument>(`/documents/${docId}/lines`, {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export function updateLineItem(docId: string, lineId: string, input: Partial<LineItemInput>) {
    return request<PricingDocument>(`/documents/${docId}/lines/${lineId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
    });
}

export function removeLineItem(docId: string, lineId: string) {
    return request<PricingDocument>(`/documents/${docId}/lines/${lineId}`, {
        method: "DELETE",
    });
}

export function getSummaryReport(from: string, to: string) {
    return request<SummaryReport>(`/reports/summary?from=${from}&to=${to}`);
}
