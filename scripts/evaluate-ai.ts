import { generateRecommendationsFromStats } from '../src/features/coding/services/codingAI';
import fs from 'fs';
import path from 'path';

const personas = [
  {
    type: "The Beginner",
    name: "Alex",
    totalSolved: 0,
    maxStreak: 0,
    activePlatforms: "None yet"
  },
  {
    type: "The Inconsistent Coder",
    name: "Jordan",
    totalSolved: 150,
    maxStreak: 1,
    activePlatforms: "LeetCode (150 solved)"
  },
  {
    type: "The Grinder",
    name: "Taylor",
    totalSolved: 600,
    maxStreak: 120,
    activePlatforms: "LeetCode (400 solved), Codeforces (200 solved)"
  },
  {
    type: "The HackerRank Specialist",
    name: "Morgan",
    totalSolved: 50,
    maxStreak: 12,
    activePlatforms: "HackerRank (50 solved)"
  }
];

async function runEvaluation() {
  console.log("Starting AI Evaluation Suite...");
  let markdown = `# AI Evaluation Results\n\nThis document shows how the Llama 3.2 model adapts its recommendations based on different student coding profiles.\n\n`;

  for (const persona of personas) {
    console.log(`Evaluating persona: ${persona.type}...`);
    markdown += `## ${persona.type} (${persona.name})\n`;
    markdown += `**Stats:** ${persona.totalSolved} solved, ${persona.maxStreak} day streak, Platforms: ${persona.activePlatforms}\n\n`;

    try {
      const response = await generateRecommendationsFromStats(
        persona.name,
        persona.totalSolved,
        persona.maxStreak,
        persona.activePlatforms
      );
      
      let parsed = response;
      if (typeof response === 'string') {
          try { parsed = JSON.parse(response); } catch (e) {}
      }

      markdown += `### AI Summary\n> ${parsed.summary || "No summary provided"}\n\n`;
      markdown += `### Recommended Topics\n`;
      if (parsed.topics && Array.isArray(parsed.topics)) {
        parsed.topics.forEach((t: any) => {
          markdown += `- **${t.title}** (${t.difficulty}): ~${t.estimatedMinutes} minutes\n`;
        });
      } else {
        markdown += `*No specific topics parsed.*\n`;
      }
      markdown += `\n---\n\n`;

    } catch (error) {
      console.error(`Error with ${persona.type}:`, error);
      markdown += `> **Error:** Failed to generate response.\n\n---\n\n`;
    }
  }

  const outputPath = path.join(__dirname, '../ai-evaluation-results.md');
  fs.writeFileSync(outputPath, markdown);
  console.log(`\nEvaluation complete! Results saved to ${outputPath}`);
}

runEvaluation().catch(console.error).finally(() => process.exit(0));
