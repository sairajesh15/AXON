import { prisma } from "../src/database";
import { processAlertForSummary } from "../src/features/alerts/services/alert-service";

async function runManualScan() {
  console.log("[ManualScan] Starting manual at-risk scan...");

  const atRiskSummaries = await prisma.attendanceSummary.findMany({
    where: {
      riskTier: { not: "SAFE" },
    },
  });

  console.log(`[ManualScan] Found ${atRiskSummaries.length} at-risk records. Sending emails...`);

  for (const summary of atRiskSummaries) {
    await processAlertForSummary(summary.id);
  }

  console.log("[ManualScan] Manual scan complete! Check your email.");
}

runManualScan()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
