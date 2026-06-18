import { ChatOllama } from "@langchain/ollama";
import { z } from "zod";
import { prisma } from "../../../database";

const recommendationSchema = z.object({
  summary: z.string().describe("A friendly, encouraging 1-sentence summary of their current coding progress."),
  topics: z.array(z.object({
    title: z.string().describe("Name of the topic or problem type to study, e.g., 'Dynamic Programming'"),
    difficulty: z.string().describe("Suggested difficulty, e.g., 'Medium' or 'Hard'"),
    estimatedMinutes: z.number().describe("Estimated time to practice this in minutes")
  })).describe("List of 2 specific topics or problem types the student should focus on next.")
});

const codingLLM = new ChatOllama({
  model: "llama3.2", // Explicitly using llama3.2 as requested
  baseUrl: "http://localhost:11434",
  temperature: 0.3, // Slightly higher than 0.1 for more natural language
}).withStructuredOutput(recommendationSchema);

export async function generateCodingRecommendations(studentId: string) {
  const student = await prisma.student.findUnique({ 
    where: { id: studentId },
    include: { codingTopics: true }
  });
  if (!student) throw new Error("Student not found");

  const activities = await prisma.codingActivity.findMany({ where: { studentId } });
  
  const totalSolved = activities.reduce((acc: any, curr: any) => acc + curr.problemsSolved, 0);
  const maxStreak = activities.reduce((acc: any, curr: any) => Math.max(acc, curr.streakDays), 0);
  const activePlatforms = activities.map((a: any) => `${a.platform} (${a.problemsSolved} solved)`).join(', ');
  const weakTopics = student.codingTopics.sort((a, b) => a.solved - b.solved).slice(0, 3).map(t => t.topicName).join(', ');

  const systemPrompt = `You are Axon Intelligence, a friendly, highly accurate AI coding mentor for ${student.name}.
Student's Current Stats:
- Total Problems Solved: ${totalSolved}
- Longest Streak: ${maxStreak} days
- Platforms: ${activePlatforms || "None yet"}
- Topics Needing Improvement: ${weakTopics || "Not enough data yet"}

Based on these stats, generate a brief, encouraging summary and exactly 2 specific study topics they should tackle next to level up. Do not repeat generic advice. Address their weak topics specifically if available, or suggest completely new challenges if they are doing well. Randomize the focus area slightly (e.g., focus on time complexity optimization, or maybe graph algorithms today) so the advice feels fresh every time. Give realistic estimated study times in minutes. Output strictly in the requested JSON format.`;

  const response = await codingLLM.invoke([
    ["system", systemPrompt]
  ]);

  return response;
}

const plannerSchema = z.object({
  title: z.string().describe("A catchy title for this 7-day plan."),
  objective: z.string().describe("The main objective of this week's plan."),
  days: z.array(z.object({
    day: z.number().describe("Day number (1-7)"),
    topic: z.string().describe("Topic to focus on"),
    task: z.string().describe("Specific task or problem type to solve"),
    estimatedMinutes: z.number()
  })).describe("Exactly 7 days of daily tasks.")
});

const plannerLLM = new ChatOllama({
  model: "llama3.2",
  baseUrl: "http://localhost:11434",
  temperature: 0.4,
}).withStructuredOutput(plannerSchema);

export async function generateCodingPlanner(studentId: string) {
  const student = await prisma.student.findUnique({ 
    where: { id: studentId },
    include: { codingTopics: true }
  });
  if (!student) throw new Error("Student not found");

  const activities = await prisma.codingActivity.findMany({ where: { studentId } });
  const totalSolved = activities.reduce((acc: any, curr: any) => acc + curr.problemsSolved, 0);
  const activePlatforms = activities.map((a: any) => `${a.platform} (${a.problemsSolved} solved)`).join(', ');
  const weakTopics = student.codingTopics.sort((a, b) => a.solved - b.solved).slice(0, 3).map(t => t.topicName).join(', ');

  const systemPrompt = `You are Axon Intelligence, generating a structured 7-day Coding Health Planner for ${student.name}.
Student's Current Stats:
- Total Solved: ${totalSolved}
- Platforms: ${activePlatforms || "None yet"}
- Topics Needing Improvement: ${weakTopics || "Not enough data yet"}

Generate a detailed, progressive 7-day study plan to improve their coding health. Incorporate their weak topics specifically on at least 2 of the days. Tailor the overall topics strictly to their skill level based on how many problems they have solved. Create a fresh, highly diverse plan that does not just repeat the same generic structures. Give a variety of topics. Output strictly in the requested JSON format.`;

  const planResponse = await plannerLLM.invoke([
    ["system", systemPrompt]
  ]);

  const savedPlan = await prisma.studyPlan.create({
    data: {
      studentId: student.id,
      title: planResponse.title,
      objective: planResponse.objective,
      days: planResponse.days as any,
    }
  });

  return savedPlan;
}
