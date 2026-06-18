export interface AttendanceRecord {
	id: string;
	studentId: string;
	subjectId: string;
	date: Date;
	status: "PRESENT" | "ABSENT" | "LATE";
	markedBy: string;
	createdAt: Date;
}
