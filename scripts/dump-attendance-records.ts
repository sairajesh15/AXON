import { prisma } from '../src/database';

async function main() {
  const studentId = 'cmqku6yn80000qhme9muei0vo';
  const records = await prisma.attendanceRecord.findMany({
    where: { studentId },
    orderBy: { date: 'asc' }
  });

  console.log(`Total records: ${records.length}`);
  const dateCounts = new Map<string, number>();
  for (const r of records) {
    const dStr = r.date.toISOString();
    dateCounts.set(dStr, (dateCounts.get(dStr) ?? 0) + 1);
  }

  console.log("\n=== UNIQUE DATES AND RECORD COUNTS ===");
  for (const [d, count] of Array.from(dateCounts.entries())) {
    console.log(`Date: ${d} | Records count: ${count}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
