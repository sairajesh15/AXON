interface TemplateData {
	studentName: string;
	subjectName: string;
	percentage: number;
	attended: number;
	totalClasses: number;
	classesNeeded: number;
}

export function criticalTemplate(data: TemplateData): {
	subject: string;
	html: string;
} {
	return {
		subject: `🔴 CRITICAL Attendance — ${data.subjectName} (${data.percentage.toFixed(1)}%)`,
		html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: #7F1D1D; padding: 16px; border-radius: 4px;">
          <h2 style="margin: 0 0 8px; color: #FEF2F2;">🔴 Critical Attendance Alert</h2>
          <p style="margin: 0; color: #FECACA; font-size: 14px;">Recovery may not be possible</p>
        </div>

        <div style="padding: 24px 0;">
          <p>Hi <strong>${data.studentName}</strong>,</p>
          <p>Your attendance in <strong>${data.subjectName}</strong> has reached a critical level of
          <strong style="color: #DC2626;">${data.percentage.toFixed(1)}%</strong>
          (${data.attended} out of ${data.totalClasses} classes attended).</p>

          <p style="color: #DC2626; font-weight: bold;">
            This is a critical situation. You need to attend
            ${data.classesNeeded} more consecutive classes to reach 75%.
            Missing even one more class will make recovery mathematically impossible
            for this semester.
          </p>

          <p>You must:</p>
          <ul>
            <li>Attend every remaining class without exception</li>
            <li>Contact your HOD immediately with valid medical or personal reasons</li>
            <li>Apply for attendance condonation if applicable</li>
          </ul>
        </div>

        <div style="background: #F3F4F6; padding: 16px; border-radius: 4px; font-size: 13px; color: #6B7280;">
          <p style="margin: 0;">This is an automated alert from the Attendance System.
          Log in to your account to view your full attendance report.</p>
        </div>
      </div>
    `,
	};
}
