import { prisma } from "@/database";
import {
	calculateClassesCanMiss,
	calculateClassesNeeded,
} from "@/features/alerts/services/risk-calculator";
import { AppError } from "@/utils/app-error";

export async function buildAttendanceSystemPrompt(studentId: string): Promise<string> {
	const student = await prisma.student.findUnique({
		where: { id: studentId },
	});

	const summaries = await prisma.attendanceSummary.findMany({
		where: { studentId },
		include: { subject: true },
		orderBy: { percentage: "asc" },
	});

	if (!student) throw new AppError("Student not found", 404);

	const subjectLines = summaries.map((s) => {
		const canMiss = calculateClassesCanMiss(s.attended, s.totalClasses);
		const needed = calculateClassesNeeded(s.attended, s.totalClasses);
		const status =
			s.riskTier === "SAFE"
				? `Safe (can miss ${canMiss} more)`
				: s.riskTier === "EARLY_WARNING"
					? `Warning (can miss ${canMiss} more)`
					: s.riskTier === "DETENTION_RISK"
						? `Detention risk (needs ${needed} more to recover)`
						: `Critical (needs ${needed} more — urgent)`;

		return `- ${s.subject.name} (${s.subject.code}): ${s.percentage.toFixed(1)}% | ${s.attended}/${s.totalClasses} classes | Status: ${status}`;
	});

	const overallRisk = summaries.some((s) => s.riskTier === "CRITICAL")
		? "CRITICAL"
		: summaries.some((s) => s.riskTier === "DETENTION_RISK")
			? "DETENTION_RISK"
			: summaries.some((s) => s.riskTier === "EARLY_WARNING")
				? "EARLY_WARNING"
				: "SAFE";

	return `
You are an attendance advisor for ${student.name} (${student.rollNumber}).
Course: ${student.course} | Year: ${student.year} | Semester: ${student.semester}
Overall risk status: ${overallRisk}

Current attendance data:
${subjectLines.join("\n")}

Rules:
- Minimum required attendance is 75% for all subjects
- Below 75% = detention risk
- Below 65% = critical (recovery may not be possible)
- Only answer questions about attendance, classes, risk, and academic schedule
- Do not make up any numbers — use only the data above
- Be concise, supportive, and direct
- If asked about a subject not listed, say you don't have that data
`.trim();
}
