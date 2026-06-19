import type { NextFunction, Request, Response } from "express";
import { prisma } from "@/database";

async function getAuthenticatedStudentId(
	authHeader: string | string[] | undefined,
): Promise<string | null> {
	const headerStr = Array.isArray(authHeader) ? authHeader[0] : authHeader;
	if (!headerStr?.startsWith("Bearer ")) {
		return null;
	}
	const token = headerStr.split(" ")[1];
	const session = await prisma.session.findUnique({
		where: { token },
		include: { user: { include: { student: true } } },
	});
	return session?.user?.student?.id || null;
}

export async function getStudentAlertsHandler(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const studentId = req.params.studentId as string;

		// Security Check: Verify authenticated user owns the student profile
		const authHeader = req.headers.authorization;
		const authenticatedStudentId = await getAuthenticatedStudentId(authHeader);

		if (!authenticatedStudentId) {
			res.status(401).json({ message: "Unauthorized." });
			return;
		}

		if (authenticatedStudentId !== studentId) {
			res
				.status(403)
				.json({ message: "Forbidden. You do not have access to this student's alerts." });
			return;
		}

		// Fetch all alerts for the student from AlertLog
		const alerts = await prisma.alertLog.findMany({
			where: { studentId },
			orderBy: { sentAt: "desc" },
		});

		// Resolve subject names in memory
		const subjectIds = Array.from(new Set(alerts.map((a) => a.subjectId)));
		const subjects = await prisma.subject.findMany({
			where: { id: { in: subjectIds } },
		});
		const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

		const mappedAlerts = alerts.map((alert) => ({
			id: alert.id,
			alertType: alert.alertType,
			status: alert.status,
			subjectId: alert.subjectId,
			subjectName: subjectMap.get(alert.subjectId) || "Unknown Subject",
			sentAt: alert.sentAt,
			payload: alert.payload,
		}));

		res.status(200).json({ data: mappedAlerts });
	} catch (error) {
		next(error);
	}
}

export async function getUnreadStudentAlertsHandler(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const studentId = req.params.studentId as string;

		// Security Check: Verify authenticated user owns the student profile
		const authHeader = req.headers.authorization;
		const authenticatedStudentId = await getAuthenticatedStudentId(authHeader);

		if (!authenticatedStudentId) {
			res.status(401).json({ message: "Unauthorized." });
			return;
		}

		if (authenticatedStudentId !== studentId) {
			res
				.status(403)
				.json({ message: "Forbidden. You do not have access to this student's alerts." });
			return;
		}

		// Fetch all alerts (read state is transient on DB, so we return all from DB)
		const alerts = await prisma.alertLog.findMany({
			where: { studentId },
			orderBy: { sentAt: "desc" },
		});

		// Resolve subject names
		const subjectIds = Array.from(new Set(alerts.map((a) => a.subjectId)));
		const subjects = await prisma.subject.findMany({
			where: { id: { in: subjectIds } },
		});
		const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

		const mappedAlerts = alerts.map((alert) => ({
			id: alert.id,
			alertType: alert.alertType,
			status: alert.status,
			subjectId: alert.subjectId,
			subjectName: subjectMap.get(alert.subjectId) || "Unknown Subject",
			sentAt: alert.sentAt,
			payload: alert.payload,
		}));

		res.status(200).json({ data: mappedAlerts });
	} catch (error) {
		next(error);
	}
}

export async function markAlertAsReadHandler(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const alertId = req.params.alertId as string;

		// Security Check: Verify authenticated user owns the student profile
		const authHeader = req.headers.authorization;
		const authenticatedStudentId = await getAuthenticatedStudentId(authHeader);

		if (!authenticatedStudentId) {
			res.status(401).json({ message: "Unauthorized." });
			return;
		}

		// Find the alert
		const alert = await prisma.alertLog.findUnique({
			where: { id: alertId },
		});

		if (!alert) {
			res.status(404).json({ message: "Alert not found." });
			return;
		}

		if (alert.studentId !== authenticatedStudentId) {
			res.status(403).json({ message: "Forbidden. You do not have access to this alert." });
			return;
		}

		// Success response (DB read status is ignored/non-persistent as requested)
		res.status(200).json({ success: true });
	} catch (error) {
		next(error);
	}
}
