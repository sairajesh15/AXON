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

export async function getStudentAttendanceHistory(
	studentId: string,
	filters: { subjectId?: string; limit?: number; offset?: number },
) {
	const limit = filters.limit ?? 50;
	const offset = filters.offset ?? 0;

	const whereClause = {
		studentId,
		...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
	};

	const [records, count] = await prisma.$transaction([
		prisma.attendanceRecord.findMany({
			where: whereClause,
			include: {
				subject: true,
			},
			orderBy: {
				date: "desc",
			},
			take: limit,
			skip: offset,
		}),
		prisma.attendanceRecord.count({
			where: whereClause,
		}),
	]);

	return { records, count };
}

export async function getStudentAttendanceTrends(studentId: string, subjectId?: string) {
	const records = await prisma.attendanceRecord.findMany({
		where: {
			studentId,
			...(subjectId ? { subjectId } : {}),
		},
		orderBy: { date: "asc" },
	});

	if (records.length === 0) {
		return [];
	}

	const weeklyGroups = new Map<string, { total: number; attended: number }>();

	for (const record of records) {
		const date = new Date(record.date);
		const day = date.getUTCDay();
		const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
		const monday = new Date(date.setUTCDate(diff));
		monday.setUTCHours(0, 0, 0, 0);
		const key = monday.toISOString().split("T")[0];

		const group = weeklyGroups.get(key) ?? { total: 0, attended: 0 };
		group.total += 1;
		if (record.status === "PRESENT" || record.status === "LATE") {
			group.attended += 1;
		}
		weeklyGroups.set(key, group);
	}

	const months = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];

	const sortedWeeks = Array.from(weeklyGroups.entries())
		.map(([dateStr, stats]) => {
			const d = new Date(dateStr);
			const label = `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
			return {
				label,
				weekStart: dateStr,
				percentage:
					stats.total > 0 ? Math.round((stats.attended / stats.total) * 100 * 10) / 10 : 0,
				attended: stats.attended,
				total: stats.total,
			};
		})
		.sort((a, b) => a.weekStart.localeCompare(b.weekStart));

	// Return the most recent 12 weeks
	return sortedWeeks.slice(-12);
}

export async function getStudentAttendanceForecast(studentId: string) {
	const summaries = await prisma.attendanceSummary.findMany({
		where: { studentId },
	});

	if (summaries.length === 0) {
		return { current: 0, projected: 0, bestCase: 0 };
	}

	const forecastAdditionalClasses = 10;

	let currentSum = 0;
	let projectedSum = 0;
	let bestCaseSum = 0;

	for (const summary of summaries) {
		const currentPct = summary.percentage;
		currentSum += currentPct;

		const held = summary.totalClasses;
		const attended = summary.attended;

		// Projected: continue at same rate for this subject
		const projectedPct = currentPct;
		projectedSum += projectedPct;

		// Best Case: attend 100% of the next forecastAdditionalClasses classes
		const futureTotal = held + forecastAdditionalClasses;
		const bestCaseAttended = attended + forecastAdditionalClasses;
		const bestCasePct = futureTotal > 0 ? (bestCaseAttended / futureTotal) * 100 : currentPct;
		bestCaseSum += bestCasePct;
	}

	const numSubjects = summaries.length;

	const current = Math.round((currentSum / numSubjects) * 10) / 10;
	const projected = Math.round((projectedSum / numSubjects) * 10) / 10;
	const bestCase = Math.round((bestCaseSum / numSubjects) * 10) / 10;

	return { current, projected, bestCase };
}

export async function getAttendanceRecoveryPlan(
	studentId: string,
	subjectId: string,
	simulatedMissedClasses: number,
) {
	const summary = await prisma.attendanceSummary.findFirst({
		where: { studentId, subjectId },
	});

	if (!summary) {
		return null;
	}

	const { attended, totalClasses } = summary;

	const currentPercentage =
		totalClasses > 0 ? Math.round((attended / totalClasses) * 100 * 10) / 10 : 0;

	const newTotalClasses = totalClasses + simulatedMissedClasses;
	const simulatedPercentage =
		newTotalClasses > 0 ? Math.round((attended / newTotalClasses) * 100 * 10) / 10 : 0;

	// Determine simulated risk tier
	let simulatedRiskTier = "CRITICAL";
	if (simulatedPercentage >= 85) {
		simulatedRiskTier = "SAFE";
	} else if (simulatedPercentage >= 75) {
		simulatedRiskTier = "EARLY_WARNING";
	} else if (simulatedPercentage >= 65) {
		simulatedRiskTier = "DETENTION_RISK";
	}

	// Calculate classes needed for 75%
	// (attended + X) / (newTotalClasses + X) >= 0.75
	// X >= 3 * newTotalClasses - 4 * attended
	const classesNeededFor75 = Math.max(0, Math.ceil(3 * newTotalClasses - 4 * attended));

	// Calculate classes needed for 80%
	// (attended + X) / (newTotalClasses + X) >= 0.80
	// X >= 4 * newTotalClasses - 5 * attended
	const classesNeededFor80 = Math.max(0, Math.ceil(4 * newTotalClasses - 5 * attended));

	return {
		currentPercentage,
		simulatedPercentage,
		simulatedRiskTier,
		classesNeededFor75,
		classesNeededFor80,
	};
}
