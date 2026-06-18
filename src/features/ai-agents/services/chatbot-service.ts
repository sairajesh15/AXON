import { prisma } from "@/database";
import { buildAttendanceSystemPrompt } from "@/features/ai-agents/services/context-builder";
import type { ChatMessage, ChatRequest, ChatResponse } from "@/features/ai-agents/types/chat.types";
import { callOllama } from "@/providers/ollama-provider";

const MAX_HISTORY_MESSAGES = 10;

export async function processChat(studentId: string, request: ChatRequest): Promise<ChatResponse> {
	// 1. Get or create chat session
	let session = request.sessionId
		? await prisma.chatSession.findFirst({
				where: { id: request.sessionId, studentId },
			})
		: null;

	if (!session) {
		session = await prisma.chatSession.create({
			data: { studentId, messages: [] },
		});
	}

	// 2. Build system prompt with fresh attendance data
	const systemPrompt = await buildAttendanceSystemPrompt(studentId);

	// 3. Get conversation history (last N messages for context window)
	const history = (session.messages as unknown as ChatMessage[]).slice(-MAX_HISTORY_MESSAGES);

	// 4. Add the new user message
	const userMessage: ChatMessage = {
		role: "user",
		content: request.message,
	};

	const messagesForOllama = [...history, userMessage];

	// 5. Call Ollama
	const reply = await callOllama(messagesForOllama, systemPrompt);

	// 6. Save updated conversation history
	const assistantMessage: ChatMessage = { role: "assistant", content: reply };
	const updatedMessages = [
		...(session.messages as unknown as ChatMessage[]),
		userMessage,
		assistantMessage,
	];

	await prisma.chatSession.update({
		where: { id: session.id },
		data: { messages: updatedMessages as any, updatedAt: new Date() },
	});

	// 7. Get summary for response
	const summaries = await prisma.attendanceSummary.findMany({
		where: { studentId },
		include: { subject: true },
	});

	const overallRisk = summaries.some((s) => s.riskTier === "CRITICAL")
		? "CRITICAL"
		: summaries.some((s) => s.riskTier === "DETENTION_RISK")
			? "DETENTION_RISK"
			: summaries.some((s) => s.riskTier === "EARLY_WARNING")
				? "EARLY_WARNING"
				: "SAFE";

	return {
		reply,
		sessionId: session.id,
		riskLevel: overallRisk,
		attendanceSummary: summaries.map((s) => ({
			subjectName: s.subject.name,
			percentage: s.percentage,
			attended: s.attended,
			totalClasses: s.totalClasses,
			riskTier: s.riskTier,
		})),
	};
}
