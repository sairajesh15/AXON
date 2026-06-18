import type { AlertType, RiskTier } from "@prisma/client";
import { prisma } from "@/database";
import {
	calculateClassesCanMiss,
	calculateClassesNeeded,
} from "@/features/alerts/services/risk-calculator";
import { criticalTemplate } from "@/features/alerts/templates/critical.template";
import { detentionRiskTemplate } from "@/features/alerts/templates/detention-risk.template";
import { earlyWarningTemplate } from "@/features/alerts/templates/early-warning.template";
import { sendEmail } from "@/services/mailer-service";

// Cooldown in days per alert type — prevents spam
const COOLDOWN_DAYS: Record<AlertType, number> = {
	EARLY_WARNING: 7,
	DETENTION_RISK: 3,
	CRITICAL: 2,
};

async function isWithinCooldown(
	studentId: string,
	subjectId: string,
	alertType: AlertType,
): Promise<boolean> {
	const days = COOLDOWN_DAYS[alertType];
	const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

	const recent = await prisma.alertLog.findFirst({
		where: {
			studentId,
			subjectId,
			alertType,
			status: "SENT",
			sentAt: { gte: since },
		},
	});

	return !!recent;
}

function isBusinessHours(): boolean {
	const now = new Date();
	const day = now.getDay(); // 0 = Sunday, 6 = Saturday
	const hour = now.getHours();
	return day >= 1 && day <= 5 && hour >= 8 && hour <= 20;
}

export async function processAlertForSummary(summaryId: string): Promise<void> {
	const summary = await prisma.attendanceSummary.findUnique({
		where: { id: summaryId },
		include: {
			student: true,
			subject: true,
		},
	});

	if (!summary || summary.riskTier === "SAFE") return;

	const alertType = summary.riskTier as AlertType;

	// Check cooldown — do not spam
	const cooldownActive = await isWithinCooldown(summary.studentId, summary.subjectId, alertType);

	if (cooldownActive) {
		await prisma.alertLog.create({
			data: {
				studentId: summary.studentId,
				subjectId: summary.subjectId,
				alertType,
				status: "SKIPPED",
				payload: { reason: "cooldown_active" },
			},
		});
		return;
	}

	if (!isBusinessHours()) {
		// Queue for next morning — for now log as skipped and let cron pick it up
		return;
	}

	const classesNeeded = calculateClassesNeeded(summary.attended, summary.totalClasses);
	const classesCanMiss = calculateClassesCanMiss(summary.attended, summary.totalClasses);

	try {
		let emailContent: { subject: string; html: string };

		if (alertType === "EARLY_WARNING") {
			emailContent = earlyWarningTemplate({
				studentName: summary.student.name,
				subjectName: summary.subject.name,
				percentage: summary.percentage,
				attended: summary.attended,
				totalClasses: summary.totalClasses,
				classesCanMiss,
			});
		} else if (alertType === "DETENTION_RISK") {
			emailContent = detentionRiskTemplate({
				studentName: summary.student.name,
				subjectName: summary.subject.name,
				percentage: summary.percentage,
				attended: summary.attended,
				totalClasses: summary.totalClasses,
				classesNeeded,
			});
		} else {
			emailContent = criticalTemplate({
				studentName: summary.student.name,
				subjectName: summary.subject.name,
				percentage: summary.percentage,
				attended: summary.attended,
				totalClasses: summary.totalClasses,
				classesNeeded,
			});
		}

		await sendEmail(summary.student.email, emailContent.subject, emailContent.html);

		await prisma.alertLog.create({
			data: {
				studentId: summary.studentId,
				subjectId: summary.subjectId,
				alertType,
				status: "SENT",
				payload: {
					email: summary.student.email,
					percentage: summary.percentage,
				},
			},
		});
	} catch (error) {
		await prisma.alertLog.create({
			data: {
				studentId: summary.studentId,
				subjectId: summary.subjectId,
				alertType,
				status: "FAILED",
				payload: { error: String(error) },
			},
		});
	}
}
