import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { prisma } from "@/database";
import {
	getStudentAttendanceForecast,
	getStudentAttendanceHistory,
	getStudentAttendanceTrends,
} from "@/features/attendance/services/attendance-service";

export async function generateAttendancePdf(studentId: string): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		(async () => {
			try {
				const student = await prisma.student.findUnique({
					where: { id: studentId },
				});

				if (!student) {
					return reject(new Error("Student not found"));
				}

				const summaries = await prisma.attendanceSummary.findMany({
					where: { studentId },
					include: { subject: true },
					orderBy: { percentage: "asc" },
				});

				if (summaries.length === 0) {
					return reject(new Error("No attendance records found"));
				}

				const forecast = await getStudentAttendanceForecast(studentId);
				const _trends = await getStudentAttendanceTrends(studentId);

				// Solve overall average
				const avgPercentage =
					summaries.reduce((acc, curr) => acc + curr.percentage, 0) / summaries.length;

				// Filter top 3 critical subjects (percentage < 75 or high risk)
				const criticalSubjects = summaries
					.filter((s) => s.percentage < 75 || s.riskTier !== "SAFE")
					.slice(0, 3);

				const doc = new PDFDocument({ margin: 50, size: "A4" });
				const buffers: Buffer[] = [];
				doc.on("data", (chunk) => buffers.push(chunk));
				doc.on("end", () => resolve(Buffer.concat(buffers)));
				doc.on("error", (err) => reject(err));

				// Header Banner
				doc.rect(0, 0, 595, 110).fill("#111827");
				doc.fillColor("#ffffff").fontSize(22).font("Helvetica-Bold").text("AXON ACADEMIC", 50, 35);
				doc
					.fillColor("#9CA3AF")
					.fontSize(10)
					.font("Helvetica")
					.text("ATTENDANCE INTELLIGENCE REPORT", 50, 62);

				// Student Profile Details (Box layout)
				doc.y = 140;
				doc
					.fillColor("#111827")
					.fontSize(12)
					.font("Helvetica-Bold")
					.text("Student Profile", 50, doc.y);
				doc
					.strokeColor("#E5E7EB")
					.lineWidth(1)
					.rect(50, doc.y + 10, 495, 80)
					.stroke();

				const yProfile = doc.y + 20;
				doc.fontSize(10).font("Helvetica-Bold").text("Name:", 70, yProfile);
				doc.font("Helvetica").text(student.name, 120, yProfile);

				doc.font("Helvetica-Bold").text("Roll Number:", 70, yProfile + 20);
				doc.font("Helvetica").text(student.rollNumber, 150, yProfile + 20);

				doc.font("Helvetica-Bold").text("Course:", 70, yProfile + 40);
				doc.font("Helvetica").text(student.course, 120, yProfile + 40);

				doc.font("Helvetica-Bold").text("Department:", 320, yProfile);
				doc.font("Helvetica").text(student.department, 395, yProfile);

				doc.font("Helvetica-Bold").text("Semester:", 320, yProfile + 20);
				doc
					.font("Helvetica")
					.text(`Semester ${student.semester} (Year ${student.year})`, 395, yProfile + 20);

				doc.font("Helvetica-Bold").text("Overall Avg:", 320, yProfile + 40);
				doc.font("Helvetica").text(`${avgPercentage.toFixed(2)}%`, 395, yProfile + 40);

				// Subject-wise Attendance Table
				doc.y = 250;
				doc
					.fillColor("#111827")
					.fontSize(12)
					.font("Helvetica-Bold")
					.text("Subject Attendance Summary", 50, doc.y);

				const tableTop = doc.y + 15;
				doc.rect(50, tableTop, 495, 20).fill("#F3F4F6");
				doc.fillColor("#374151").fontSize(9).font("Helvetica-Bold");
				doc.text("CODE", 60, tableTop + 6);
				doc.text("SUBJECT NAME", 120, tableTop + 6);
				doc.text("ATTENDED", 350, tableTop + 6);
				doc.text("TOTAL", 410, tableTop + 6);
				doc.text("RATE", 470, tableTop + 6);
				doc.text("RISK TIER", 510, tableTop + 6);

				let currentY = tableTop + 20;
				doc.font("Helvetica").fontSize(9);

				for (const summary of summaries) {
					doc.fillColor("#111827");
					doc.text(summary.subject.code, 60, currentY + 6);
					doc.text(summary.subject.name, 120, currentY + 6);
					doc.text(String(summary.attended), 350, currentY + 6);
					doc.text(String(summary.totalClasses), 410, currentY + 6);
					doc.text(`${summary.percentage.toFixed(2)}%`, 470, currentY + 6);

					// Risk badge color
					const risk = summary.riskTier;
					if (risk === "SAFE") {
						doc.fillColor("#15803d").text("SAFE", 510, currentY + 6);
					} else if (risk === "EARLY_WARNING") {
						doc.fillColor("#b45309").text("WARN", 510, currentY + 6);
					} else {
						doc.fillColor("#b91c1c").text("CRITICAL", 510, currentY + 6);
					}

					doc
						.strokeColor("#E5E7EB")
						.lineWidth(0.5)
						.moveTo(50, currentY + 20)
						.lineTo(545, currentY + 20)
						.stroke();
					currentY += 20;
				}

				// Projections & Warnings (Add new page if y exceeds height)
				if (currentY > 600) {
					doc.addPage();
					currentY = 50;
				} else {
					currentY += 20;
				}

				// Forecast Details
				doc
					.fillColor("#111827")
					.fontSize(12)
					.font("Helvetica-Bold")
					.text("AI Forecast Projections", 50, currentY);
				doc
					.strokeColor("#E5E7EB")
					.lineWidth(1)
					.rect(50, currentY + 10, 495, 60)
					.stroke();

				const yForecast = currentY + 25;
				doc.fontSize(10).font("Helvetica-Bold");
				doc.text("Current Average:", 70, yForecast);
				doc.font("Helvetica").text(`${forecast.current.toFixed(2)}%`, 180, yForecast);

				doc.font("Helvetica-Bold").text("Projected Average:", 70, yForecast + 20);
				doc.font("Helvetica").text(`${forecast.projected.toFixed(2)}%`, 180, yForecast + 20);

				doc.font("Helvetica-Bold").text("Best Case Average:", 280, yForecast);
				doc.font("Helvetica").text(`${forecast.bestCase.toFixed(2)}%`, 400, yForecast);

				doc
					.font("Helvetica-Oblique")
					.fontSize(8)
					.fillColor("#6B7280")
					.text(
						"*Best Case assumes 100% attendance over the next 10 classes in all subjects.",
						280,
						yForecast + 20,
					);

				currentY += 90;

				// Risk & Recommendations
				doc
					.fillColor("#111827")
					.fontSize(12)
					.font("Helvetica-Bold")
					.text("Critical Subjects & Recovery Guidance", 50, currentY);

				if (criticalSubjects.length === 0) {
					doc.y = currentY + 15;
					doc
						.fontSize(10)
						.font("Helvetica")
						.fillColor("#15803d")
						.text("All subjects are in safe standing. Keep up the good attendance!", 50, doc.y);
				} else {
					let yRec = currentY + 15;
					for (const sub of criticalSubjects) {
						doc.rect(50, yRec, 495, 36).fill("#FEF2F2");
						doc.fillColor("#991B1B").fontSize(9).font("Helvetica-Bold");
						doc.text(`${sub.subject.code} - ${sub.subject.name}`, 60, yRec + 6);
						doc.font("Helvetica").fillColor("#7F1D1D");

						const classesNeeded = Math.ceil(3 * sub.totalClasses - 4 * sub.attended);
						const simulationMsg =
							classesNeeded > 0
								? `Needs +${classesNeeded} consecutive attended classes to reach target 75% attendance.`
								: "Maintain current rate to stabilize.";

						doc.text(simulationMsg, 60, yRec + 20);
						yRec += 42;
					}
				}

				// Footer
				const pageCount = doc.bufferedPageRange().count;
				for (let i = 0; i < pageCount; i++) {
					doc.switchToPage(i);
					doc.strokeColor("#E5E7EB").lineWidth(0.5).moveTo(50, 785).lineTo(545, 785).stroke();
					doc
						.fillColor("#9CA3AF")
						.fontSize(7)
						.font("Helvetica")
						.text(
							`Generated on ${new Date().toUTCString()} | Powered by AXON Intelligence`,
							50,
							792,
						);
				}

				doc.end();
			} catch (error) {
				reject(error);
			}
		})();
	});
}

export async function generateAttendanceExcel(studentId: string): Promise<Buffer> {
	const student = await prisma.student.findUnique({
		where: { id: studentId },
	});

	if (!student) {
		throw new Error("Student not found");
	}

	const summaries = await prisma.attendanceSummary.findMany({
		where: { studentId },
		include: { subject: true },
		orderBy: { percentage: "asc" },
	});

	if (summaries.length === 0) {
		throw new Error("No attendance records found");
	}

	const forecast = await getStudentAttendanceForecast(studentId);
	const trends = await getStudentAttendanceTrends(studentId);

	const { records } = await getStudentAttendanceHistory(studentId, { limit: 1000 });

	const workbook = new ExcelJS.Workbook();
	workbook.creator = "AXON";
	workbook.created = new Date();

	// 1. Student Summary Sheet
	const summarySheet = workbook.addWorksheet("Student Summary");
	summarySheet.columns = [{ width: 25 }, { width: 35 }];
	summarySheet.addRow(["AXON ATTENDANCE REPORT"]);
	summarySheet.addRow([]);
	summarySheet.addRow(["STUDENT PROFILE"]);
	summarySheet.addRow(["Name", student.name]);
	summarySheet.addRow(["Roll Number", student.rollNumber]);
	summarySheet.addRow(["Course", student.course]);
	summarySheet.addRow(["Department", student.department]);
	summarySheet.addRow(["Semester", `Semester ${student.semester} (Year ${student.year})`]);
	summarySheet.addRow([]);
	summarySheet.addRow(["AI FORECAST METRICS"]);
	summarySheet.addRow(["Current Average", `${forecast.current.toFixed(2)}%`]);
	summarySheet.addRow(["Projected Average", `${forecast.projected.toFixed(2)}%`]);
	summarySheet.addRow(["Best Case Average", `${forecast.bestCase.toFixed(2)}%`]);

	// Style Sheet 1
	summarySheet.getRow(1).font = { name: "Arial", size: 14, bold: true, color: { argb: "1F2937" } };
	summarySheet.getRow(3).font = { name: "Arial", size: 11, bold: true };
	summarySheet.getRow(9).font = { name: "Arial", size: 11, bold: true };

	// 2. Subject Attendance Sheet
	const subjectSheet = workbook.addWorksheet("Subject Attendance");
	subjectSheet.columns = [
		{ header: "Subject Code", key: "code", width: 15 },
		{ header: "Subject Name", key: "name", width: 35 },
		{ header: "Attended Classes", key: "attended", width: 18 },
		{ header: "Total Classes", key: "total", width: 15 },
		{ header: "Attendance Rate", key: "rate", width: 18 },
		{ header: "Risk Tier", key: "risk", width: 15 },
	];

	for (const sum of summaries) {
		subjectSheet.addRow({
			code: sum.subject.code,
			name: sum.subject.name,
			attended: sum.attended,
			total: sum.totalClasses,
			rate: `${sum.percentage.toFixed(2)}%`,
			risk: sum.riskTier,
		});
	}
	subjectSheet.getRow(1).font = { bold: true };

	// 3. Attendance Trends Sheet
	const trendsSheet = workbook.addWorksheet("Attendance Trends");
	trendsSheet.columns = [
		{ header: "Week Start Date", key: "weekStart", width: 18 },
		{ header: "Label", key: "label", width: 15 },
		{ header: "Weekly Attendance Rate", key: "rate", width: 22 },
		{ header: "Weekly Attended", key: "attended", width: 18 },
		{ header: "Weekly Total", key: "total", width: 15 },
	];

	for (const t of trends) {
		trendsSheet.addRow({
			weekStart: t.weekStart,
			label: t.label,
			rate: `${t.percentage.toFixed(2)}%`,
			attended: t.attended,
			total: t.total,
		});
	}
	trendsSheet.getRow(1).font = { bold: true };

	// 4. Attendance History Sheet
	const historySheet = workbook.addWorksheet("Attendance History");
	historySheet.columns = [
		{ header: "Date & Time", key: "date", width: 25 },
		{ header: "Subject Code", key: "code", width: 15 },
		{ header: "Subject Name", key: "name", width: 35 },
		{ header: "Status", key: "status", width: 15 },
		{ header: "Marked By", key: "markedBy", width: 15 },
	];

	for (const rec of records) {
		historySheet.addRow({
			date: rec.date.toISOString(),
			code: rec.subject.code,
			name: rec.subject.name,
			status: rec.status,
			markedBy: rec.markedBy,
		});
	}
	historySheet.getRow(1).font = { bold: true };

	const buffer = await workbook.xlsx.writeBuffer();
	return Buffer.from(buffer as ArrayBuffer);
}
