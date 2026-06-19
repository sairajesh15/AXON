import type { NextFunction, Request, Response } from "express";
import { prisma } from "@/database";
import { generateAttendanceExcel, generateAttendancePdf } from "../services/report-service";

async function getAuthenticatedStudentId(authHeader: string | undefined): Promise<string | null> {
	if (!authHeader?.startsWith("Bearer ")) {
		return null;
	}
	const token = authHeader.split(" ")[1];
	const session = await prisma.session.findUnique({
		where: { token },
		include: { user: { include: { student: true } } },
	});
	return session?.user?.student?.id || null;
}

export async function getAttendancePdfReportHandler(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { studentId } = req.params;

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
				.json({ message: "Forbidden. You do not have access to this student's reports." });
			return;
		}

		const pdfBuffer = await generateAttendancePdf(studentId);

		res.setHeader("Content-Type", "application/pdf");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="AXON_Attendance_Report_${studentId}.pdf"`,
		);
		res.status(200).send(pdfBuffer);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "";
		if (message === "No attendance records found") {
			res.status(404).json({ message: "No attendance records available to generate a report." });
			return;
		}
		next(error);
	}
}

export async function getAttendanceExcelReportHandler(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { studentId } = req.params;

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
				.json({ message: "Forbidden. You do not have access to this student's reports." });
			return;
		}

		const excelBuffer = await generateAttendanceExcel(studentId);

		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		);
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="AXON_Attendance_Report_${studentId}.xlsx"`,
		);
		res.status(200).send(excelBuffer);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "";
		if (message === "No attendance records found") {
			res.status(404).json({ message: "No attendance records available to generate a report." });
			return;
		}
		next(error);
	}
}
