import {
	runAttendanceScan,
	startAttendanceScanJob,
} from "@/features/alerts/jobs/attendance-scan.job";
import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./database";

async function bootstrap() {
	try {
		await prisma.$connect();
		console.log("Database connected");
		startAttendanceScanJob();

		app.listen(env.PORT, () => {
			console.log(`Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);

			// Trigger immediate alert scan on startup
			runAttendanceScan().catch((err) => {
				console.error("[Startup] Failed to run initial attendance scan:", err);
			});
		});
	} catch (error) {
		console.error("Failed to start server:", error);
		process.exit(1);
	}
}

bootstrap();
