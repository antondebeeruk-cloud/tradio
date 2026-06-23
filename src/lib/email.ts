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
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Missing RESEND_API_KEY or EMAIL_FROM.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      attachments: [
        {
          content: attachment.toString("base64"),
          filename,
        },
      ],
      from,
      html,
      subject,
      text,
      to,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Email could not be sent.");
  }
}
