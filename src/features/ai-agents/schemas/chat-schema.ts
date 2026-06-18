import { z } from "zod";

export const chatSchema = z.object({
	message: z.string().min(1).max(1000),
	sessionId: z.string().cuid().optional(),
});
