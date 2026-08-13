import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { validateQuery } from "../middleware/validateQuery";
import { asyncHandler } from "../utils/asyncHandler";
import { summaryReportQuerySchema } from "../validation/documentSchema";
import * as documentService from '../services/documentService';


const router = Router();

router.use(requireAuth);

router.get(
  '/summary',
  validateQuery(summaryReportQuerySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { from, to } = res.locals.validatedQuery as { from: string; to: string };
    const report = await documentService.getSummaryReport(req.userId!, { from, to });
    res.json(report);
  })
);

export default router;
