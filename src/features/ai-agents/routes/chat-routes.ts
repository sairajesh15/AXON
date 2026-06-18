import { type Router as ExpressRouter, Router } from "express";
import { chatHandler } from "@/features/ai-agents/controllers/chat-controller";

// Assuming authenticate middleware
// import { authenticate } from "@/middleware/authenticate";

const router: ExpressRouter = Router();

// router.post("/", authenticate, chatHandler);
router.post("/", chatHandler);

export default router;
