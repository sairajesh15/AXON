import cron from "node-cron";
import { prisma } from "@/database";
import { processAlertForSummary } from "@/features/alerts/services/alert-service";

export async function runAttendanceScan(): Promise<void> {
	console.log("[AttendanceScan] Starting at-risk scan...");

	const atRiskSummaries = await prisma.attendanceSummary.findMany({
		where: {
			riskTier: { not: "SAFE" },
		},
	});

	console.log(`[AttendanceScan] Found ${atRiskSummaries.length} at-risk records`);

	for (const summary of atRiskSummaries) {
		await processAlertForSummary(summary.id);
	}

	console.log("[AttendanceScan] Scan complete");
}

export function startAttendanceScanJob(): void {
	// Runs every hour
	cron.schedule("0 * * * *", async () => {
		await runAttendanceScan();
	});

	console.log("[AttendanceScan] Hourly scan job registered — runs at minute 0 of every hour");
}
