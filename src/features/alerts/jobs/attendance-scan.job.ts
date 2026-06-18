import cron from "node-cron";
import { prisma } from "@/database";
import { processAlertForSummary } from "@/features/alerts/services/alert-service";

export function startAttendanceScanJob(): void {
	// Runs every weekday at 9:00 AM
	cron.schedule("0 9 * * 1-5", async () => {
		console.log("[AttendanceScan] Starting daily at-risk scan...");

		const atRiskSummaries = await prisma.attendanceSummary.findMany({
			where: {
				riskTier: { not: "SAFE" },
			},
		});

		console.log(`[AttendanceScan] Found ${atRiskSummaries.length} at-risk records`);

		for (const summary of atRiskSummaries) {
			await processAlertForSummary(summary.id);
		}

		console.log("[AttendanceScan] Daily scan complete");
	});

	console.log("[AttendanceScan] Daily scan job registered — runs weekdays at 9 AM");
}
