import { sendSmtpEmail } from "@/lib/smtp";

type SendEmailInput = {
  attachment: Buffer;
  filename: string;
  html: string;
  subject: string;
  text: string;
  to: string;
};

export async function sendEmailWithPdf({
  attachment,
  filename,
  html,
  subject,
  text,
  to,
}: SendEmailInput) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  if (!from) {
    throw new Error("Missing EMAIL_FROM or SMTP_USER.");
  }

  await sendSmtpEmail({
    attachments: [
      {
        content: attachment,
        contentType: "application/pdf",
        filename,
      },
    ],
    from,
    html,
    subject,
    text,
    to,
  });
}
