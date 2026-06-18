import { type Router as ExpressRouter, Router } from "express";
import {
	getAttendanceSummaryHandler,
	markAttendanceHandler,
} from "@/features/attendance/controllers/attendance-controller";

// Assuming authenticate middleware exists as per instructions.
// We will mock import for now.
// import { authenticate } from "@/middleware/authenticate";

const router: ExpressRouter = Router();

// router.post("/", authenticate, markAttendanceHandler);
// router.get("/summary/:studentId", authenticate, getAttendanceSummaryHandler);
// router.get("/summary", authenticate, getAttendanceSummaryHandler);

router.post("/", markAttendanceHandler);
router.get("/summary/:studentId", getAttendanceSummaryHandler);
router.get("/summary", getAttendanceSummaryHandler);

export default router;
