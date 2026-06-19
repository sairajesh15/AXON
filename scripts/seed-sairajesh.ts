import { prisma } from "../src/database";
import { RiskTier, AttendanceStatus } from "@prisma/client";

async function main() {
  const email = "sairajeshdevara8@gmail.com";

  // 1. Find the existing Better-Auth user by email
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error(`❌ User with email "${email}" not found. Please register/sign up first.`);
  }

  console.log(`\n==========================================`);
  console.log(`FOUND USER: ${user.name} (${user.email})`);
  console.log(`User ID: ${user.id}`);
  console.log(`==========================================\n`);

  // Cleanup any existing student profile or student-linked records for this user
  const existingStudent = await prisma.student.findUnique({
    where: { userId: user.id }
  });

  if (existingStudent) {
    console.log(`Cleaning up existing data for student: ${existingStudent.name}...`);
    const studentId = existingStudent.id;
    await prisma.attendanceRecord.deleteMany({ where: { studentId } });
    await prisma.attendanceSummary.deleteMany({ where: { studentId } });
    await prisma.enrollment.deleteMany({ where: { studentId } });
    await prisma.codingActivity.deleteMany({ where: { studentId } });
    await prisma.dailyCodingLog.deleteMany({ where: { studentId } });
    await prisma.codingTopic.deleteMany({ where: { studentId } });
    await prisma.studentGoal.deleteMany({ where: { studentId } });
    await prisma.studyPlan.deleteMany({ where: { studentId } });
    await prisma.student.delete({ where: { id: studentId } });
    console.log(`Cleanup complete.`);
  }

  // 2. Create Student Profile
  const student = await prisma.student.create({
    data: {
      userId: user.id,
      rollNumber: "AP22110010",
      name: "SAIRAJESH DEVARA",
      email: user.email,
      course: "B.Tech CSE",
      year: 2,
      semester: 4,
      department: "CSE"
    }
  });

  console.log(`Created Student profile: ${student.name} (${student.id})`);

  // 3. Create Subjects
  const subjectsData = [
    { code: "AEC201", name: "Industry Standard Employability Soft Skills - I", department: "CSE", totalClasses: 30 },
    { code: "CSE205", name: "Hands-On With Python", department: "CSE", totalClasses: 44 },
    { code: "CSE206", name: "Coding Skills - II", department: "CSE", totalClasses: 40 },
    { code: "CSE208", name: "Probability And Statistics", department: "CSE", totalClasses: 38 },
    { code: "CSE209", name: "Database Management Systems", department: "CSE", totalClasses: 42 },
    { code: "CSE211", name: "Full Stack Development", department: "CSE", totalClasses: 40 },
    { code: "CVE248", name: "Drones For Asset Management", department: "CSE", totalClasses: 25 },
  ];

  const subjects: Record<string, any> = {};

  for (const sData of subjectsData) {
    const sub = await prisma.subject.upsert({
      where: { code: sData.code },
      update: { name: sData.name, department: sData.department, totalClasses: sData.totalClasses },
      create: sData
    });
    subjects[sData.code] = sub;
  }

  console.log(`Created/updated ${Object.keys(subjects).length} subjects.`);

  // 4. Create Enrollment records
  for (const code of Object.keys(subjects)) {
    const sub = subjects[code];
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        subjectId: sub.id
      }
    });
  }
  console.log("Created enrollments for all subjects.");

  // 5. Setup Attendance Stats
  const attendanceConfig = [
    { code: "AEC201", totalClasses: 30, attended: 25, percentage: 83.33, riskTier: RiskTier.SAFE },
    { code: "CSE205", totalClasses: 44, attended: 27, percentage: 61.36, riskTier: RiskTier.CRITICAL },
    { code: "CSE206", totalClasses: 40, attended: 31, percentage: 77.50, riskTier: RiskTier.EARLY_WARNING },
    { code: "CSE208", totalClasses: 38, attended: 22, percentage: 57.89, riskTier: RiskTier.CRITICAL },
    { code: "CSE209", totalClasses: 42, attended: 37, percentage: 88.09, riskTier: RiskTier.SAFE },
    { code: "CSE211", totalClasses: 40, attended: 29, percentage: 72.50, riskTier: RiskTier.DETENTION_RISK },
    { code: "CVE248", totalClasses: 25, attended: 19, percentage: 76.00, riskTier: RiskTier.EARLY_WARNING },
  ];

  // Helper to generate distributed weekdays over the last 60 days
  const generateDates = (count: number) => {
    const dates: Date[] = [];
    const now = new Date();
    let current = new Date(now);
    current.setDate(current.getDate() - 1); // Start from yesterday

    while (dates.length < count) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Mon-Fri
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() - 1);
    }
    // Sort oldest to newest
    return dates.reverse();
  };

  let recordCount = 0;

  for (const config of attendanceConfig) {
    const sub = subjects[config.code];

    // Generate dates for total classes
    const classDates = generateDates(config.totalClasses);

    // Randomly select indices for attended classes
    const attendedIndices = new Set<number>();
    while (attendedIndices.size < config.attended) {
      attendedIndices.add(Math.floor(Math.random() * config.totalClasses));
    }

    // Insert AttendanceRecords
    for (let i = 0; i < classDates.length; i++) {
      const isAttended = attendedIndices.has(i);
      let status: AttendanceStatus = AttendanceStatus.ABSENT;
      if (isAttended) {
        status = Math.random() < 0.15 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
      }

      await prisma.attendanceRecord.create({
        data: {
          studentId: student.id,
          subjectId: sub.id,
          date: classDates[i],
          status,
          markedBy: "system"
        }
      });
      recordCount++;
    }

    // Create AttendanceSummary
    await prisma.attendanceSummary.create({
      data: {
        studentId: student.id,
        subjectId: sub.id,
        totalClasses: config.totalClasses,
        attended: config.attended,
        percentage: config.percentage,
        riskTier: config.riskTier
      }
    });
  }

  console.log(`Created ${attendanceConfig.length} AttendanceSummary records.`);
  console.log(`Created ${recordCount} AttendanceRecord history entries.`);

  // 6. Create CodingActivity records
  const codingActivities = [
    { platform: "LeetCode", problemsSolved: 156, streakDays: 7 },
    { platform: "GitHub", problemsSolved: 25, streakDays: 3 },
    { platform: "HackerRank", problemsSolved: 42, streakDays: 2 }
  ];

  for (const act of codingActivities) {
    await prisma.codingActivity.create({
      data: {
        studentId: student.id,
        platform: act.platform,
        problemsSolved: act.problemsSolved,
        streakDays: act.streakDays
      }
    });
  }
  console.log(`Created ${codingActivities.length} CodingActivity records.`);

  // 7. Create StudentGoal
  await prisma.studentGoal.create({
    data: {
      studentId: student.id,
      weeklyTarget: 20
    }
  });
  console.log("Created StudentGoal: weeklyTarget = 20.");

  // 8. Create DailyCodingLog entries for the last 30 days
  const now = new Date();
  let logCount = 0;

  const thisWeekSolves = [3, 0, 2, 4, 1, 0, 3]; // Sum is 13
  const pastWeeksSolves = [
    1, 2, 0, 3, 1, 0, 2, // Week 2
    0, 4, 2, 1, 0, 2, 3, // Week 3
    1, 0, 1, 2, 0, 3, 1, // Week 4
    2, 0 // Remaining days
  ];

  const allSolves = [...thisWeekSolves, ...pastWeeksSolves];

  for (let i = 0; i < allSolves.length; i++) {
    const solvedCount = allSolves[i];
    if (solvedCount > 0) {
      const logDate = new Date(now);
      logDate.setDate(logDate.getDate() - i);
      const normalizedDate = new Date(Date.UTC(logDate.getUTCFullYear(), logDate.getUTCMonth(), logDate.getUTCDate()));

      await prisma.dailyCodingLog.create({
        data: {
          studentId: student.id,
          platform: "LeetCode",
          date: normalizedDate,
          solved: solvedCount
        }
      });
      logCount++;
    }
  }

  console.log(`Created ${logCount} DailyCodingLog entries.`);

  // 9. Create CodingTopic records
  const codingTopics = [
    { topicName: "Arrays", solved: 42 },
    { topicName: "Strings", solved: 31 },
    { topicName: "Hashing", solved: 24 },
    { topicName: "Trees", solved: 18 },
    { topicName: "Dynamic Programming", solved: 9 },
    { topicName: "Graphs", solved: 3 }
  ];

  for (const topic of codingTopics) {
    await prisma.codingTopic.create({
      data: {
        studentId: student.id,
        topicName: topic.topicName,
        solved: topic.solved
      }
    });
  }
  console.log(`Created ${codingTopics.length} CodingTopic records.`);

  // 10. Create StudyPlan
  const studyPlan = await prisma.studyPlan.create({
    data: {
      studentId: student.id,
      title: "Semester 4 Recovery Plan",
      objective: "Recover attendance in critical subjects while maintaining coding consistency and preparing for semester examinations.",
      days: [
        {
          day: 1,
          topic: "Hands-On With Python & Data Structures II",
          task: "Attend all Python lectures; Solve 3 array problems on LeetCode.",
          estimatedMinutes: 120
        },
        {
          day: 2,
          topic: "Probability And Statistics",
          task: "Review Statistics lecture notes and practice 5 Bayes Theorem problems.",
          estimatedMinutes: 90
        },
        {
          day: 3,
          topic: "Full Stack Development & Database Systems",
          task: "Complete pending FSD assignment; attend OS lab classes.",
          estimatedMinutes: 150
        },
        {
          day: 4,
          topic: "Drones Asset Management & Soft Skills",
          task: "Attend CVE248 lecture; prepare mock interview answers for AEC201.",
          estimatedMinutes: 90
        },
        {
          day: 5,
          topic: "Hands-On With Python (Critical Review)",
          task: "Solve 5 Python coding problems focusing on file handling and algorithms.",
          estimatedMinutes: 120
        },
        {
          day: 6,
          topic: "Weekly Coding Target & Mock Test",
          task: "Complete remaining 3 LeetCode problems to hit weekly target; take a 60m Mock coding test.",
          estimatedMinutes: 180
        },
        {
          day: 7,
          topic: "Semester Exam Strategy Review",
          task: "Review recovery plan progress; plan attendance recovery schedule for next week.",
          estimatedMinutes: 60
        }
      ]
    }
  });

  console.log(`Created StudyPlan: "${studyPlan.title}" (${studyPlan.id})`);

  console.log(`\n==========================================`);
  console.log(`SEEDING SUCCESSFULLY COMPLETED FOR SAIRAJESH DEVARA!`);
  console.log(`Student ID: ${student.id}`);
  console.log(`User ID: ${user.id}`);
  console.log(`==========================================\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
