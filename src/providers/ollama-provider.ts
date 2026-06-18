import { env } from "@/config/env";
import type { ChatMessage } from "@/features/ai-agents/types/chat.types";
import { AppError } from "@/utils/app-error";

interface OllamaResponse {
	message: {
		content: string;
	};
}

export async function callOllama(messages: ChatMessage[], systemPrompt: string): Promise<string> {
	const baseUrl = env.OLLAMA_BASE_URL;
	const model = env.OLLAMA_MODEL;

	const response = await fetch(`${baseUrl}/api/chat`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			model,
			messages: [{ role: "system", content: systemPrompt }, ...messages],
			stream: false,
		}),
	});

	if (!response.ok) {
		throw new AppError("Ollama service unavailable", 503);
	}

	const data = (await response.json()) as OllamaResponse;
	return data.message.content;
}
