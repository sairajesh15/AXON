import { z } from "zod";

export const markAttendanceSchema = z.object({
	studentId: z.string().cuid(),
	subjectId: z.string().cuid(),
	date: z.string().datetime(),
	status: z.enum(["PRESENT", "ABSENT", "LATE"]),
});
