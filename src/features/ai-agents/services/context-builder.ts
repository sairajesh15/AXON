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

	const codingActivities = await prisma.codingActivity.findMany({
		where: { studentId },
		orderBy: { platform: "asc" },
	});

	const dailyCodingLogs = await prisma.dailyCodingLog.findMany({
		where: { studentId },
		orderBy: { date: "desc" },
		take: 7,
	});

	const codingTopics = await prisma.codingTopic.findMany({
		where: { studentId },
		orderBy: { solved: "desc" },
	});

	const codingGoal = await prisma.studentGoal.findUnique({
		where: { studentId },
	});

	const studyPlans = await prisma.studyPlan.findMany({
		where: { studentId },
		orderBy: { createdAt: "desc" },
		take: 3,
	});

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

	const codingLines =
		codingActivities.length > 0
			? codingActivities.map(
					(a) => `- ${a.platform}: ${a.problemsSolved} solved | Streak: ${a.streakDays} days`,
				)
			: ["- No coding platform activity registered."];

	const totalSolvedThisWeek = dailyCodingLogs.reduce((acc, log) => acc + log.solved, 0);
	const goalText = codingGoal
		? `${totalSolvedThisWeek}/${codingGoal.weeklyTarget} problems solved in the last 7 days (Weekly Target: ${codingGoal.weeklyTarget})`
		: `${totalSolvedThisWeek} problems solved in the last 7 days (No target set)`;

	const strongTopics = [...codingTopics].slice(0, 3);
	const strongTopicsLines =
		strongTopics.length > 0
			? strongTopics.map((t) => `- ${t.topicName}: ${t.solved} solved`)
			: ["- No strong topics identified yet."];

	const weakTopics = [...codingTopics].reverse().slice(0, 3);
	const weakTopicsLines =
		weakTopics.length > 0
			? weakTopics.map((t) => `- ${t.topicName}: ${t.solved} solved`)
			: ["- No weak topics identified yet."];

	const planLines =
		studyPlans.length > 0
			? studyPlans.map((p) => {
					const days = typeof p.days === "string" ? JSON.parse(p.days) : p.days;
					const daysCount = Array.isArray(days) ? days.length : Object.keys(days || {}).length;
					return `- "${p.title}" (Objective: ${p.objective}) | ${daysCount}-day plan`;
				})
			: ["- No active study plans."];

	return `
You are an attendance and academic progress advisor for ${student.name} (${student.rollNumber}).
Course: ${student.course} | Year: ${student.year} | Semester: ${student.semester}
Overall academic and attendance risk status: ${overallRisk}

Current attendance data:
${subjectLines.join("\n")}

Coding Profile & Progress:
${codingLines.join("\n")}
Weekly Target Status: ${goalText}

Coding Strengths (Highest Solved):
${strongTopicsLines.join("\n")}

Coding Focus Areas / Weak Topics (Lowest Solved):
${weakTopicsLines.join("\n")}

Active Study Plans:
${planLines.join("\n")}

Rules:
- Minimum required attendance is 75% for all subjects.
- Below 75% = detention risk.
- Below 65% = critical (recovery may not be possible).
- You can answer questions about attendance, classes, risk, academic schedule, coding stats, streaks, weekly targets, strengths, weaknesses (lowest solved topics), and active study plans.
- Do not make up any numbers — use only the data provided above.
- Provide actionable advice by connecting attendance risk with study plans and coding goals when helpful.
- Be concise, supportive, and direct.
`.trim();
}
