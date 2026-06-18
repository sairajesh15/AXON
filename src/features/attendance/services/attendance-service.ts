import type { AttendanceStatus } from "@prisma/client";
import { prisma } from "@/database";
import { processAlertForSummary } from "@/features/alerts/services/alert-service";
import { calculateRiskTier } from "@/features/alerts/services/risk-calculator";

interface MarkAttendanceInput {
	studentId: string;
	subjectId: string;
	date: Date;
	status: AttendanceStatus;
	markedBy: string;
}

export async function markAttendance(input: MarkAttendanceInput): Promise<void> {
	// 1. Upsert the attendance record
	await prisma.attendanceRecord.upsert({
		where: {
			studentId_subjectId_date: {
				studentId: input.studentId,
				subjectId: input.subjectId,
				date: input.date,
			},
		},
		create: {
			studentId: input.studentId,
			subjectId: input.subjectId,
			date: input.date,
			status: input.status,
			markedBy: input.markedBy,
		},
		update: {
			status: input.status,
			markedBy: input.markedBy,
		},
	});

	// 2. Recalculate summary for this student + subject
	const summary = await recalculateSummary(input.studentId, input.subjectId);

	// 3. Trigger alert check immediately after marking
	if (summary.riskTier !== "SAFE") {
		await processAlertForSummary(summary.id);
	}
}

export async function recalculateSummary(studentId: string, subjectId: string) {
	const records = await prisma.attendanceRecord.findMany({
		where: { studentId, subjectId },
	});

	const totalClasses = records.length;
	const attended = records.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
	const percentage = totalClasses > 0 ? (attended / totalClasses) * 100 : 0;
	const riskTier = calculateRiskTier(percentage);

	const summary = await prisma.attendanceSummary.upsert({
		where: {
			studentId_subjectId: { studentId, subjectId },
		},
		create: {
			studentId,
			subjectId,
			totalClasses,
			attended,
			percentage,
			riskTier,
			lastUpdated: new Date(),
		},
		update: {
			totalClasses,
			attended,
			percentage,
			riskTier,
			lastUpdated: new Date(),
		},
	});

	return summary;
}

export async function getStudentAttendanceSummary(studentId: string) {
	return prisma.attendanceSummary.findMany({
		where: { studentId },
		include: { subject: true },
		orderBy: { percentage: "asc" },
	});
}
