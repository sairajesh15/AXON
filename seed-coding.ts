import { prisma } from './src/database';

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

  console.log(`\n==========================================`);
  console.log(`USE THIS STUDENT ID FOR POSTMAN:`);
  console.log(`${student.id}`);
  console.log(`==========================================\n`);
}

main().catch(console.error).finally(() => process.exit(0));
