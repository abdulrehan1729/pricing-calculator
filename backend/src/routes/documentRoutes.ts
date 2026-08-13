import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { AppError } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import {
    createDocumentSchema,
    updateDocumentMetaSchema,
    updateLineItemSchema,
    lineItemSchema,
} from "../validation/documentSchema";
import * as documentService from '../services/documentService';

const router = Router();

router.use(requireAuth);

function getRouteParam(
  value: string | string[],
  name: string,
): string {
  if (typeof value === "string") {
    return value;
  }

  throw new AppError(`Invalid ${name} route parameter`, 400);
}

router.post(
  '/',
  validate(createDocumentSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const doc = await documentService.createDocument(req.userId!, req.body);
    res.status(201).json(doc);
  })
);

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const docs = await documentService.listDocuments(req.userId!);
    res.json(docs);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getRouteParam(req.params.id, "document ID");
    const doc = await documentService.getDocument(id, req.userId!);
    res.json(doc);
  })
);

router.patch(
  '/:id',
  validate(updateDocumentMetaSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getRouteParam(req.params.id, "document ID");
    const doc = await documentService.updateDocumentMeta(id, req.userId!, req.body);
    res.json(doc);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getRouteParam(req.params.id, "document ID");
    await documentService.deleteDocument(id, req.userId!);
    res.status(204).send();
  })
);

router.post(
  '/:id/lines',
  validate(lineItemSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getRouteParam(req.params.id, "document ID");
    const doc = await documentService.addLineItem(id, req.userId!, req.body);
    res.status(201).json(doc);
  })
);

router.patch(
  '/:id/lines/:lineId',
  validate(updateLineItemSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getRouteParam(req.params.id, "document ID");
    const lineId = getRouteParam(req.params.lineId, "line item ID");
    const doc = await documentService.updateLineItem(
      id,
      req.userId!,
      lineId,
      req.body
    );
    res.json(doc);
  })
);

router.delete(
  '/:id/lines/:lineId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getRouteParam(req.params.id, "document ID");
    const lineId = getRouteParam(req.params.lineId, "line item ID");
    const doc = await documentService.removeLineItem(
      id,
      req.userId!,
      lineId
    );
    res.json(doc);
  })
);

router.patch(
  '/:id/finalize',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getRouteParam(req.params.id, "document ID");
    const doc = await documentService.finalizeDocument(id, req.userId!);
    res.json(doc);
  })
);

export default router;
