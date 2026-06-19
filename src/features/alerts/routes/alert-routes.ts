import { Router } from "express";
import {
	getStudentAlertsHandler,
	getUnreadStudentAlertsHandler,
	markAlertAsReadHandler,
} from "../controllers/alert-controller";

const router: Router = Router();

router.get("/:studentId", getStudentAlertsHandler);
router.get("/:studentId/unread", getUnreadStudentAlertsHandler);
router.patch("/:alertId/read", markAlertAsReadHandler);

export default router;
