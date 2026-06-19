import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@/database";
import {
	getAttendanceRecoveryPlan,
	getStudentAttendanceForecast,
	getStudentAttendanceHistory,
	getStudentAttendanceSummary,
	getStudentAttendanceTrends,
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
			if (!authHeader?.startsWith("Bearer ")) {
				res.status(401).json({ message: "Unauthorized." });
				return;
			}
			const token = authHeader.split(" ")[1];
			const session = await prisma.session.findUnique({
				where: { token },
				include: { user: { include: { student: true } } },
			});
			if (!session?.user?.student) {
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

const historyQuerySchema = z.object({
	subjectId: z.string().cuid().optional(),
	limit: z.coerce.number().int().nonnegative().default(50),
	offset: z.coerce.number().int().nonnegative().default(0),
});

export async function getAttendanceHistoryHandler(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const studentIdentifier = req.params.studentId as string;

		// Validate studentIdentifier format (Student ID or User ID)
		const studentIdParse = z.string().min(1).safeParse(studentIdentifier);
		if (!studentIdParse.success) {
			res.status(400).json({ message: "Invalid studentId format" });
			return;
		}

		// Resolve student record by student ID or User ID
		const student = await prisma.student.findFirst({
			where: {
				OR: [{ id: studentIdentifier }, { userId: studentIdentifier }],
			},
		});

		if (!student) {
			res.status(400).json({ message: "Student profile not found" });
			return;
		}

		// Validate and parse query parameters
		const queryParse = historyQuerySchema.safeParse(req.query);
		if (!queryParse.success) {
			res.status(400).json({
				message: "Invalid query parameters",
				errors: queryParse.error.issues,
			});
			return;
		}

		const { subjectId, limit, offset } = queryParse.data;

		// Query historical records using the resolved student.id
		const { records, count } = await getStudentAttendanceHistory(student.id, {
			subjectId,
			limit,
			offset,
		});

		const formattedRecords = records.map((record) => ({
			id: record.id,
			date: record.date.toISOString(),
			subjectId: record.subjectId,
			subjectCode: record.subject.code,
			subjectName: record.subject.name,
			status: record.status,
			markedBy: record.markedBy,
		}));

		res.status(200).json({
			data: formattedRecords,
			count,
		});
	} catch (error) {
		next(error);
	}
}

export async function getAttendanceTrendsHandler(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const studentIdentifier = req.params.studentId as string;

		// Validate studentIdentifier format (Student ID or User ID)
		const studentIdParse = z.string().min(1).safeParse(studentIdentifier);
		if (!studentIdParse.success) {
			res.status(400).json({ message: "Invalid studentId format" });
			return;
		}

		// Resolve student record by student ID or User ID
		const student = await prisma.student.findFirst({
			where: {
				OR: [{ id: studentIdentifier }, { userId: studentIdentifier }],
			},
		});

		if (!student) {
			res.status(400).json({ message: "Student profile not found" });
			return;
		}

		const subjectId = req.query.subjectId as string | undefined;
		if (subjectId && !z.string().cuid().safeParse(subjectId).success) {
			res.status(400).json({ message: "Invalid subjectId format" });
			return;
		}

		const trends = await getStudentAttendanceTrends(student.id, subjectId);

		res.status(200).json({
			data: trends,
		});
	} catch (error) {
		next(error);
	}
}

export async function getAttendanceForecastHandler(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const studentIdentifier = req.params.studentId as string;

		// Validate studentIdentifier format (Student ID or User ID)
		const studentIdParse = z.string().min(1).safeParse(studentIdentifier);
		if (!studentIdParse.success) {
			res.status(400).json({ message: "Invalid studentId format" });
			return;
		}

		// Resolve student record by student ID or User ID
		const student = await prisma.student.findFirst({
			where: {
				OR: [{ id: studentIdentifier }, { userId: studentIdentifier }],
			},
		});

		if (!student) {
			res.status(400).json({ message: "Student profile not found" });
			return;
		}

		const forecast = await getStudentAttendanceForecast(student.id);

		res.status(200).json({
			data: forecast,
		});
	} catch (error) {
		next(error);
	}
}

const recoverSchema = z.object({
	subjectId: z.string().cuid(),
	simulatedMissedClasses: z.number().int().nonnegative(),
});

export async function postAttendanceRecoverHandler(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const studentIdentifier = req.params.studentId as string;

		// Validate studentIdentifier format (Student ID or User ID)
		const studentIdParse = z.string().min(1).safeParse(studentIdentifier);
		if (!studentIdParse.success) {
			res.status(400).json({ message: "Invalid studentId format" });
			return;
		}

		// Resolve student record by student ID or User ID
		const student = await prisma.student.findFirst({
			where: {
				OR: [{ id: studentIdentifier }, { userId: studentIdentifier }],
			},
		});

		if (!student) {
			res.status(400).json({ message: "Student profile not found" });
			return;
		}

		const bodyParse = recoverSchema.safeParse(req.body);
		if (!bodyParse.success) {
			res.status(400).json({
				message: "Invalid request body",
				errors: bodyParse.error.issues,
			});
			return;
		}

		const { subjectId, simulatedMissedClasses } = bodyParse.data;

		const plan = await getAttendanceRecoveryPlan(student.id, subjectId, simulatedMissedClasses);

		if (!plan) {
			res.status(400).json({
				message: "Attendance summary not found for this subject",
			});
			return;
		}

		res.status(200).json({
			data: plan,
		});
	} catch (error) {
		next(error);
	}
}
