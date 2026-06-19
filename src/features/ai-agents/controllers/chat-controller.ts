import type { NextFunction, Request, Response } from "express";
import { prisma } from "@/database";
import { processChat } from "@/features/ai-agents/services/chatbot-service";

export async function chatHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { message, sessionId } = req.body;

		// Extract token from Authorization header, handling potential duplicate 'Bearer ' prefixes
		const authHeader = req.headers.authorization;
		if (!authHeader?.startsWith("Bearer ")) {
			res.status(401).json({ message: "Unauthorized. Please provide a Bearer token." });
			return;
		}

		// Swagger UI adds 'Bearer ' automatically, so if the user pastes 'Bearer <token>', we get 'Bearer Bearer <token>'
		// Here we replace all instances of 'Bearer ' to ensure we just get the token string.
		const token = authHeader.replace(/^(?:Bearer\s+)+/i, "").trim();

		// Fetch the session from Prisma
		const session = await prisma.session.findUnique({
			where: { token },
			include: { user: { include: { student: true } } },
		});

		if (!session?.user?.student) {
			res.status(400).json({ message: "Student profile not found for this session." });
			return;
		}

		const studentId = session.user.student.id;

		const result = await processChat(studentId, { message, sessionId });
		res.status(200).json({ data: result });
	} catch (error) {
		next(error);
	}
}
