export interface ChatMessage {
	role: "user" | "assistant";
	content: string;
}

export interface ChatRequest {
	message: string;
	sessionId?: string;
}

export interface SubjectSummary {
	subjectName: string;
	percentage: number;
	attended: number;
	totalClasses: number;
	riskTier: string;
}

export interface ChatResponse {
	reply: string;
	sessionId: string;
	riskLevel: string;
	attendanceSummary: SubjectSummary[];
}
