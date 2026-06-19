import { type Router as ExpressRouter, Router } from "express";
import {
	getAttendanceExcelReportHandler,
	getAttendancePdfReportHandler,
} from "../controllers/report-controller";

const router: ExpressRouter = Router();

router.get("/attendance/:studentId/pdf", getAttendancePdfReportHandler);
router.get("/attendance/:studentId/excel", getAttendanceExcelReportHandler);

export default router;
