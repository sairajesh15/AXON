interface TemplateData {
	studentName: string;
	subjectName: string;
	percentage: number;
	attended: number;
	totalClasses: number;
	classesCanMiss: number;
}

export function earlyWarningTemplate(data: TemplateData): {
	subject: string;
	html: string;
} {
	return {
		subject: `Attendance Alert — ${data.subjectName} (${data.percentage.toFixed(1)}%)`,
		html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: #FFF8E1; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 4px;">
          <h2 style="margin: 0 0 8px; color: #92400E;">⚠️ Early Attendance Warning</h2>
          <p style="margin: 0; color: #78350F; font-size: 14px;">Action recommended</p>
        </div>

        <div style="padding: 24px 0;">
          <p>Hi <strong>${data.studentName}</strong>,</p>
          <p>Your attendance in <strong>${data.subjectName}</strong> has dropped to
          <strong>${data.percentage.toFixed(1)}%</strong>
          (${data.attended} out of ${data.totalClasses} classes attended).</p>

          <p>The minimum required attendance is <strong>75%</strong>.
          You can afford to miss <strong>${data.classesCanMiss} more class${data.classesCanMiss === 1 ? "" : "es"}</strong>
          before entering the risk zone.</p>

          <p>We recommend attending all upcoming classes to stay safe.</p>
        </div>

        <div style="background: #F3F4F6; padding: 16px; border-radius: 4px; font-size: 13px; color: #6B7280;">
          <p style="margin: 0;">This is an automated alert from the Attendance System.
          Log in to your account to view your full attendance report.</p>
        </div>
      </div>
    `,
	};
}
