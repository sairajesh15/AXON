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

export async function generateRecommendationsFromStats(
  name: string,
  totalSolved: number,
  maxStreak: number,
  activePlatforms: string
) {
  const systemPrompt = `You are Axon Intelligence, a friendly, highly accurate AI coding mentor for ${name}.
Student's Current Stats:
- Total Problems Solved: ${totalSolved}
- Longest Streak: ${maxStreak} days
- Platforms: ${activePlatforms || "None yet"}

Based on these stats, generate a brief, encouraging summary and exactly 2 specific study topics (tailored to their skill level, e.g. Arrays/Strings for beginners, or DP/Segment Trees for advanced coders) they should tackle next to level up. Give realistic estimated study times in minutes. Output strictly in the requested JSON format. Do not hallucinate data.`;

  const response = await codingLLM.invoke([
    ["system", systemPrompt]
  ]);

  return response;
}

export async function generateCodingRecommendations(studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new Error("Student not found");

  const activities = await prisma.codingActivity.findMany({ where: { studentId } });
  
  const totalSolved = activities.reduce((acc: any, curr: any) => acc + curr.problemsSolved, 0);
  const maxStreak = activities.reduce((acc: any, curr: any) => Math.max(acc, curr.streakDays), 0);
  const activePlatforms = activities.map((a: any) => `${a.platform} (${a.problemsSolved} solved)`).join(', ');

  return generateRecommendationsFromStats(student.name, totalSolved, maxStreak, activePlatforms);
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
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new Error("Student not found");

  const activities = await prisma.codingActivity.findMany({ where: { studentId } });
  const totalSolved = activities.reduce((acc: any, curr: any) => acc + curr.problemsSolved, 0);
  const activePlatforms = activities.map((a: any) => `${a.platform} (${a.problemsSolved} solved)`).join(', ');

  const systemPrompt = `You are Axon Intelligence, generating a structured 7-day Coding Health Planner for ${student.name}.
Student's Current Stats:
- Total Solved: ${totalSolved}
- Platforms: ${activePlatforms || "None yet"}

Generate a detailed, progressive 7-day study plan to improve their coding health. Tailor the topics strictly to their skill level based on how many problems they have solved (e.g., basic loops and arrays for <50 solved, trees and dynamic programming for >300 solved). Give a variety of topics, do not stick to just one. Output strictly in the requested JSON format.`;

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
