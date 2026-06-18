interface TemplateData {
	studentName: string;
	subjectName: string;
	percentage: number;
	attended: number;
	totalClasses: number;
	classesNeeded: number;
}

export function detentionRiskTemplate(data: TemplateData): {
	subject: string;
	html: string;
} {
	return {
		subject: `🚨 Detention Risk — ${data.subjectName} (${data.percentage.toFixed(1)}%)`,
		html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 16px; border-radius: 4px;">
          <h2 style="margin: 0 0 8px; color: #991B1B;">🚨 Detention Risk Alert</h2>
          <p style="margin: 0; color: #7F1D1D; font-size: 14px;">Immediate action required</p>
        </div>

        <div style="padding: 24px 0;">
          <p>Hi <strong>${data.studentName}</strong>,</p>
          <p>Your attendance in <strong>${data.subjectName}</strong> has fallen to
          <strong>${data.percentage.toFixed(1)}%</strong>
          (${data.attended} out of ${data.totalClasses} classes attended).</p>

          <p style="color: #DC2626; font-weight: bold;">You are currently below the 75% minimum required attendance.
          You are at risk of detention.</p>

          <p>To recover to 75%, you must attend the next
          <strong>${data.classesNeeded} consecutive class${data.classesNeeded === 1 ? "" : "es"}</strong>
          without missing any.</p>

          <p>Please contact your department coordinator immediately if you have a valid reason
          for your absences.</p>
        </div>

        <div style="background: #F3F4F6; padding: 16px; border-radius: 4px; font-size: 13px; color: #6B7280;">
          <p style="margin: 0;">This is an automated alert from the Attendance System.
          Log in to your account to view your full attendance report.</p>
        </div>
      </div>
    `,
	};
}
