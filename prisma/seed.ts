import { prisma } from "../src/database";

async function main() {
  // Fetch the 3 existing users from Better Auth
  const users = await prisma.user.findMany({ take: 3 });

  if (users.length < 3) {
    throw new Error("Need at least 3 users. Log in with 3 accounts first via Swagger.");
  }

  // Create subjects
  const subjects = await Promise.all([
    prisma.subject.upsert({ where: { code: "CS101" }, update: {}, create: { code: "CS101", name: "Data Structures", department: "CSE", totalClasses: 50 } }),
    prisma.subject.upsert({ where: { code: "CS102" }, update: {}, create: { code: "CS102", name: "Database Management", department: "CSE", totalClasses: 45 } }),
    prisma.subject.upsert({ where: { code: "CS103" }, update: {}, create: { code: "CS103", name: "Operating Systems", department: "CSE", totalClasses: 48 } }),
    prisma.subject.upsert({ where: { code: "CS104" }, update: {}, create: { code: "CS104", name: "Computer Networks", department: "CSE", totalClasses: 40 } }),
  ]);

  // Student 1 — CRITICAL in 2 subjects
  const student1 = await prisma.student.upsert({
    where: { userId: users[0].id },
    update: {},
    create: { userId: users[0].id, rollNumber: "CSE001", name: users[0].name, email: users[0].email, course: "B.Tech CSE", year: 3, semester: 5, department: "CSE" },
  });

  // Student 2 — DETENTION_RISK in 1 subject
  const student2 = await prisma.student.upsert({
    where: { userId: users[1].id },
    update: {},
    create: { userId: users[1].id, rollNumber: "CSE002", name: users[1].name, email: users[1].email, course: "B.Tech CSE", year: 3, semester: 5, department: "CSE" },
  });

  // Student 3 — EARLY_WARNING in 1 subject
  const student3 = await prisma.student.upsert({
    where: { userId: users[2].id },
    update: {},
    create: { userId: users[2].id, rollNumber: "CSE003", name: users[2].name, email: users[2].email, course: "B.Tech CSE", year: 3, semester: 5, department: "CSE" },
  });

  const students = [student1, student2, student3];

  // Enroll all students in all subjects
  for (const student of students) {
    for (const subject of subjects) {
      await prisma.enrollment.upsert({
        where: { studentId_subjectId: { studentId: student.id, subjectId: subject.id } },
        update: {},
        create: { studentId: student.id, subjectId: subject.id },
      });
    }
  }

  // Attendance summaries for Student 1 — CRITICAL scenario
  await upsertSummary(student1.id, subjects[0].id, 50, 30, 60.0, "CRITICAL");   // 60% — critical
  await upsertSummary(student1.id, subjects[1].id, 45, 27, 60.0, "CRITICAL");   // 60% — critical
  await upsertSummary(student1.id, subjects[2].id, 48, 40, 83.3, "SAFE");       // 83% — safe
  await upsertSummary(student1.id, subjects[3].id, 40, 33, 82.5, "SAFE");       // 82% — safe

  // Attendance summaries for Student 2 — DETENTION_RISK scenario
  await upsertSummary(student2.id, subjects[0].id, 50, 36, 72.0, "DETENTION_RISK"); // 72% — detention
  await upsertSummary(student2.id, subjects[1].id, 45, 37, 82.2, "SAFE");           // 82% — safe
  await upsertSummary(student2.id, subjects[2].id, 48, 40, 83.3, "SAFE");           // 83% — safe
  await upsertSummary(student2.id, subjects[3].id, 40, 33, 82.5, "SAFE");           // 82% — safe

  // Attendance summaries for Student 3 — EARLY_WARNING scenario
  await upsertSummary(student3.id, subjects[0].id, 50, 39, 78.0, "EARLY_WARNING"); // 78% — warning
  await upsertSummary(student3.id, subjects[1].id, 45, 38, 84.4, "SAFE");          // 84% — safe
  await upsertSummary(student3.id, subjects[2].id, 48, 41, 85.4, "SAFE");          // 85% — safe
  await upsertSummary(student3.id, subjects[3].id, 40, 34, 85.0, "SAFE");          // 85% — safe

  console.log("✅ Seed complete. 3 students, 4 subjects, 12 attendance summaries.");
  console.log("Student 1 (CSE001): CRITICAL in Data Structures + Database Management");
  console.log("Student 2 (CSE002): DETENTION_RISK in Data Structures");
  console.log("Student 3 (CSE003): EARLY_WARNING in Data Structures");
}

async function upsertSummary(
  studentId: string,
  subjectId: string,
  totalClasses: number,
  attended: number,
  percentage: number,
  riskTier: string
) {
  return prisma.attendanceSummary.upsert({
    where: { studentId_subjectId: { studentId, subjectId } },
    update: { totalClasses, attended, percentage, riskTier: riskTier as any, lastUpdated: new Date() },
    create: { studentId, subjectId, totalClasses, attended, percentage, riskTier: riskTier as any, lastUpdated: new Date() },
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
