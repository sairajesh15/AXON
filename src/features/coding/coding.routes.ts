import { Router } from "express";
import { prisma } from "../../database";
import { generateCodingPlanner, generateCodingRecommendations } from "./services/codingAI";
import { addOrUpdatePlatformUsername, ingestCodingForStudent } from "./services/codingService";

const router: Router = Router();

router.get("/:id/dashboard", async (req, res): Promise<void> => {
	try {
		const id = req.params.id as string;
		const student = await prisma.student.findFirst({
			where: { OR: [{ id }, { userId: id }] },
			include: {
				codingActivities: true,
				attendanceSummary: { include: { subject: true } },
				dailyCodingLogs: true,
				codingTopics: true,
				studentGoal: true,
			},
		});

		if (!student) {
			res.status(404).json({ error: "Student not found" });
			return;
		}

		const avgAttendance =
			student.attendanceSummary.length > 0
				? student.attendanceSummary.reduce((acc: any, curr: any) => acc + curr.percentage, 0) /
					student.attendanceSummary.length
				: 85;

		const courses = student.attendanceSummary.map((summary: any) => ({
			courseId: summary.subjectId,
			courseName: summary.subject.name,
			currentPercentage: summary.percentage,
			riskTier: summary.riskTier,
		}));

		res.json({
			student,
			avgAttendance,
			coding: student.codingActivities,
			courses,
			risk: { overallRisk: 100 - avgAttendance },
			dailyLogs: student.dailyCodingLogs,
			topics: student.codingTopics,
			goal: student.studentGoal,
		});
	} catch (error) {
		console.error("Error fetching dashboard:", error);
		res.status(500).json({ error: "Failed to fetch dashboard" });
	}
});

router.get("/:id/coding/mappings", async (req, res): Promise<void> => {
	try {
		const id = req.params.id as string;
		const student = await prisma.student.findFirst({ where: { OR: [{ id }, { userId: id }] } });
		if (!student) {
			res.status(404).json({ error: "Student not found" });
			return;
		}
		const mappings = await prisma.platformUsername.findMany({ where: { studentId: student.id } });
		res.json(mappings);
	} catch (error) {
		console.error("Error fetching mappings:", error);
		res.status(500).json({ error: "Failed to fetch mappings" });
	}
});

router.post("/:id/coding/mapping", async (req, res): Promise<void> => {
	try {
		const id = req.params.id as string;
		const { platform, username, rawData } = req.body;
		if (!platform || !username) {
			res.status(400).json({ error: "Missing platform or username" });
			return;
		}

		const student = await prisma.student.findFirst({ where: { OR: [{ id }, { userId: id }] } });
		if (!student) {
			res.status(404).json({ error: "Student not found" });
			return;
		}

		// Trigger immediate ingest first to validate
		const ingestResult = await ingestCodingForStudent({
			email: student.email,
			platform,
			username,
			rawData,
		});
		if (ingestResult.status !== 200) {
			res
				.status(400)
				.json({ error: (ingestResult as any).error || "Invalid username or platform error" });
			return;
		}

		// Save only after successful validation
		await addOrUpdatePlatformUsername({ email: student.email, platform, username });

		res.json({ success: true, platform, username });
	} catch (error) {
		console.error("Error linking platform:", error);
		res.status(500).json({ error: "Failed to link platform" });
	}
});

router.delete("/:id/coding/mapping/:platform", async (req, res): Promise<void> => {
	try {
		const id = req.params.id as string;
		const platform = req.params.platform as string;

		const student = await prisma.student.findFirst({ where: { OR: [{ id }, { userId: id }] } });
		if (!student) {
			res.status(404).json({ error: "Student not found" });
			return;
		}

		// Delete mapping
		await prisma.platformUsername.deleteMany({
			where: { studentId: student.id, platform: { equals: platform, mode: "insensitive" } },
		});

		// Delete associated data
		await prisma.codingActivity.deleteMany({
			where: { studentId: student.id, platform: { equals: platform, mode: "insensitive" } },
		});

		await prisma.dailyCodingLog.deleteMany({
			where: { studentId: student.id, platform: { equals: platform, mode: "insensitive" } },
		});

		// We optionally keep codingTopics as they might be shared, but if you want to reset them completely:
		// await prisma.codingTopic.deleteMany({ where: { studentId: student.id } });

		res.json({ success: true });
	} catch (error) {
		console.error("Error unlinking platform:", error);
		res.status(500).json({ error: "Failed to unlink platform" });
	}
});

router.post("/:id/coding/recommendations", async (req, res): Promise<void> => {
	try {
		const id = req.params.id as string;
		const student = await prisma.student.findFirst({ where: { OR: [{ id }, { userId: id }] } });
		if (!student) {
			res.status(404).json({ error: "Student not found" });
			return;
		}
		const recommendations = await generateCodingRecommendations(student.id);
		res.json(recommendations);
	} catch (error) {
		console.error("Error generating recommendations:", error);
		res.status(500).json({ error: "Failed to generate recommendations" });
	}
});

router.post("/:id/coding/goal", async (req, res): Promise<void> => {
	try {
		const id = req.params.id as string;
		const { weeklyTarget } = req.body;

		if (typeof weeklyTarget !== "number") {
			res.status(400).json({ error: "Invalid weekly target" });
			return;
		}

		const student = await prisma.student.findFirst({ where: { OR: [{ id }, { userId: id }] } });
		if (!student) {
			res.status(404).json({ error: "Student not found" });
			return;
		}

		const existing = await prisma.studentGoal.findUnique({ where: { studentId: student.id } });
		if (existing) {
			await prisma.studentGoal.update({ where: { id: existing.id }, data: { weeklyTarget } });
		} else {
			await prisma.studentGoal.create({ data: { studentId: student.id, weeklyTarget } });
		}

		res.json({ success: true, weeklyTarget });
	} catch (error) {
		console.error("Error setting goal:", error);
		res.status(500).json({ error: "Failed to set goal" });
	}
});

router.post("/:id/coding/plan", async (req, res): Promise<void> => {
	try {
		const id = req.params.id as string;
		const student = await prisma.student.findFirst({ where: { OR: [{ id }, { userId: id }] } });
		if (!student) {
			res.status(404).json({ error: "Student not found" });
			return;
		}
		const plan = await generateCodingPlanner(student.id);
		res.json(plan);
	} catch (error) {
		console.error("Error generating coding plan:", error);
		res.status(500).json({ error: "Failed to generate coding plan" });
	}
});

router.get("/:id/coding/plan", async (req, res): Promise<void> => {
	try {
		const id = req.params.id as string;
		const student = await prisma.student.findFirst({ where: { OR: [{ id }, { userId: id }] } });
		if (!student) {
			res.status(404).json({ error: "Student not found" });
			return;
		}
		const plan = await prisma.studyPlan.findFirst({
			where: { studentId: student.id },
			orderBy: { createdAt: "desc" },
		});
		res.json(plan);
	} catch (error) {
		console.error("Error fetching coding plan:", error);
		res.status(500).json({ error: "Failed to fetch coding plan" });
	}
});

router.post("/:id/coding/solve", async (req, res): Promise<void> => {
	try {
		const id = req.params.id as string;
		const student = await prisma.student.findFirst({ where: { OR: [{ id }, { userId: id }] } });
		if (!student) {
			res.status(404).json({ error: "Student not found" });
			return;
		}

		// Increment overall solved count for the first connected platform, or a generic 'Practice' platform
		let platform = "Practice";
		const firstPlatform = await prisma.platformUsername.findFirst({
			where: { studentId: student.id },
		});
		if (firstPlatform) platform = firstPlatform.platform;

		const existingActivity = await prisma.codingActivity.findFirst({
			where: { studentId: student.id, platform },
		});
		if (existingActivity) {
			await prisma.codingActivity.update({
				where: { id: existingActivity.id },
				data: { problemsSolved: existingActivity.problemsSolved + 1 },
			});
		} else {
			await prisma.codingActivity.create({
				data: { studentId: student.id, platform, problemsSolved: 1, streakDays: 1 },
			});
		}

		// Log for today
		const now = new Date();
		const normalizedDate = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
		);
		const existingLog = await prisma.dailyCodingLog.findFirst({
			where: { studentId: student.id, platform, date: normalizedDate },
		});

		if (existingLog) {
			await prisma.dailyCodingLog.update({
				where: { id: existingLog.id },
				data: { solved: existingLog.solved + 1 },
			});
		} else {
			await prisma.dailyCodingLog.create({
				data: { studentId: student.id, platform, date: normalizedDate, solved: 1 },
			});
		}

		res.json({ success: true });
	} catch (error) {
		console.error("Error logging solve:", error);
		res.status(500).json({ error: "Failed to log problem solve" });
	}
});

export default router;
