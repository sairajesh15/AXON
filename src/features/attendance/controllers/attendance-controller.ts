import type { NextFunction, Request, Response } from "express";
import { prisma } from "@/database";
import {
	getStudentAttendanceSummary,
	markAttendance,
} from "@/features/attendance/services/attendance-service";

export async function markAttendanceHandler(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { studentId, subjectId, date, status } = req.body;

		const authHeader = req.headers.authorization;
		const token = authHeader?.split(" ")[1];
		let markedBy = "system";
		if (token) {
			const session = await prisma.session.findUnique({
				where: { token },
				include: { user: true },
			});
			if (session) markedBy = session.user.id;
		}

		await markAttendance({
			studentId,
			subjectId,
			date: new Date(date),
			status,
			markedBy,
		});

		res.status(200).json({ message: "Attendance marked successfully" });
	} catch (error) {
		next(error);
	}
}

export async function getAttendanceSummaryHandler(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		let studentId = req.params.studentId as string;

		if (!studentId || studentId === "undefined") {
			const authHeader = req.headers.authorization;
			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				res.status(401).json({ message: "Unauthorized." });
				return;
			}
			const token = authHeader.split(" ")[1];
			const session = await prisma.session.findUnique({
				where: { token },
				include: { user: { include: { student: true } } },
			});
			if (!session || !session.user?.student) {
				res.status(400).json({ message: "Student profile not found." });
				return;
			}
			studentId = session.user.student.id;
		}

		const summary = await getStudentAttendanceSummary(studentId);
		res.status(200).json({ data: summary });
	} catch (error) {
		next(error);
	}
}
