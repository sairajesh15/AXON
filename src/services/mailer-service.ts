import nodemailer from "nodemailer";
import { env } from "@/config/env";

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: env.MAIL_USER,
		pass: env.MAIL_APP_PASSWORD,
	},
});

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
	await transporter.sendMail({
		from: `"${env.MAIL_FROM_NAME}" <${env.MAIL_USER}>`,
		to,
		subject,
		html,
	});
}
