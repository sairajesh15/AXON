import { prisma } from './src/database';
import { RiskTier } from '@prisma/client';

async function main() {
  let student = await prisma.student.findFirst();
  
  if (!student) {
    const user = await prisma.user.create({
      data: {
        name: "Test User",
        email: "test@example.com",
      }
    });

    student = await prisma.student.create({
      data: {
        userId: user.id,
        rollNumber: "TEST-001",
        name: "Test Student",
        email: "test@example.com",
        course: "B.Tech",
        year: 3,
        semester: 6,
        department: "CSE"
      }
    });
  }

  // Ensure mock coding data exists
  const act = await prisma.codingActivity.findFirst({ where: { studentId: student.id } });
  if (!act) {
    await prisma.codingActivity.create({
      data: {
        studentId: student.id,
        platform: "LeetCode",
        problemsSolved: 125,
        streakDays: 14,
      }
    });
  }

  // Create Mock Subjects
  const subjectsData = [
    { code: "CS301", name: "Data Structures II", department: "CSE", totalClasses: 40 },
    { code: "CS302", name: "Microeconomics", department: "HSS", totalClasses: 35 },
    { code: "CS303", name: "Operating Systems", department: "CSE", totalClasses: 42 }
  ];

  for (const sData of subjectsData) {
    const existingSub = await prisma.subject.findUnique({ where: { code: sData.code } });
    if (!existingSub) {
      await prisma.subject.create({ data: sData });
    }
  }

  // Create Enrollments and Attendance Summaries
  const subjects = await prisma.subject.findMany();
  
  // Define mock attendance stats
  const attendanceStats = [
    { percentage: 88, attended: 35, riskTier: RiskTier.SAFE },        // Data Structures II
    { percentage: 62, attended: 22, riskTier: RiskTier.HIGH_RISK || 'CRITICAL' },   // Microeconomics (High risk simulation)
    { percentage: 76, attended: 32, riskTier: RiskTier.SAFE }         // Operating Systems
  ];

  for (let i = 0; i < subjects.length; i++) {
    const sub = subjects[i];
    const stat = attendanceStats[i % attendanceStats.length];
    
    // Enrollment
    const existingEnroll = await prisma.enrollment.findUnique({
      where: { studentId_subjectId: { studentId: student.id, subjectId: sub.id } }
    });
    if (!existingEnroll) {
      await prisma.enrollment.create({
        data: { studentId: student.id, subjectId: sub.id }
      });
    }

    // Attendance Summary
    const existingSummary = await prisma.attendanceSummary.findUnique({
      where: { studentId_subjectId: { studentId: student.id, subjectId: sub.id } }
    });
    
    // Use CRITICAL if HIGH_RISK is not in the enum, fallback logic
    const resolvedRisk = stat.percentage >= 75 ? RiskTier.SAFE : (stat.percentage < 65 ? RiskTier.CRITICAL : RiskTier.EARLY_WARNING);

    if (existingSummary) {
      await prisma.attendanceSummary.update({
        where: { id: existingSummary.id },
        data: {
          totalClasses: sub.totalClasses,
          attended: stat.attended,
          percentage: stat.percentage,
          riskTier: resolvedRisk
        }
      });
    } else {
      await prisma.attendanceSummary.create({
        data: {
          studentId: student.id,
          subjectId: sub.id,
          totalClasses: sub.totalClasses,
          attended: stat.attended,
          percentage: stat.percentage,
          riskTier: resolvedRisk
        }
      });
    }
  }

  console.log(`\n==========================================`);
  console.log(`MOCK DATA SEEDED SUCCESSFULLY!`);
  console.log(`USE THIS STUDENT ID FOR POSTMAN/TESTING:`);
  console.log(`${student.id}`);
  console.log(`(Frontend might use userId: ${student.userId})`);
  console.log(`==========================================\n`);
}

main().catch(console.error).finally(() => process.exit(0));
