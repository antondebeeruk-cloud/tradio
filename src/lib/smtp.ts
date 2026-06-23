import net from "net";
import { randomUUID } from "crypto";
import tls from "tls";

type Attachment = {
  content: Buffer;
  contentType: string;
  filename: string;
};

type SendSmtpEmailInput = {
  attachments?: Attachment[];
  from: string;
  html: string;
  subject: string;
  text: string;
  to: string;
};

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function encodeHeader(value: string) {
  if (/^[\x00-\x7F]*$/.test(value)) {
    return value;
  }

  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function formatAddress(address: string) {
  const trimmed = address.trim();
  const match = trimmed.match(/<([^>]+)>/);
  return match?.[1] ?? trimmed;
}

function dotStuff(message: string) {
  return message.replace(/^\./gm, "..").replace(/\r?\n/g, "\r\n");
}

class SmtpClient {
  private buffer = "";
  private socket: net.Socket | tls.TLSSocket | null = null;

  async connect() {
    const host = requireEnv("SMTP_HOST");
    const port = Number(process.env.SMTP_PORT || "465");
    const useTls = process.env.SMTP_TLS !== "false" || port === 465;
    const rejectUnauthorized =
      process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false";

    this.socket = useTls
      ? tls.connect({
          host,
          port,
          rejectUnauthorized,
          servername: host,
          timeout: 20000,
        })
      : net.connect({ host, port, timeout: 20000 });

    this.socket.setEncoding("utf8");
    this.socket.on("data", (chunk) => {
      this.buffer += chunk;
    });
    this.socket.on("timeout", () => {
      this.socket?.destroy(new Error("SMTP connection timed out."));
    });

    await new Promise<void>((resolve, reject) => {
      this.socket?.once("error", reject);
      this.socket?.once(useTls ? "secureConnect" : "connect", () => resolve());
    });

    await this.readResponse(220);
  }

  async sendMail(input: SendSmtpEmailInput) {
    const user = requireEnv("SMTP_USER");
    const password = requireEnv("SMTP_PASSWORD");
    const fromAddress = formatAddress(input.from);
    const toAddress = formatAddress(input.to);

    await this.command(`EHLO ${process.env.SMTP_EHLO_DOMAIN || "tradio.uk"}`, 250);
    await this.command("AUTH LOGIN", 334);
    await this.command(Buffer.from(user).toString("base64"), 334);
    await this.command(Buffer.from(password).toString("base64"), 235);
    await this.command(`MAIL FROM:<${fromAddress}>`, 250);
    await this.command(`RCPT TO:<${toAddress}>`, [250, 251]);
    await this.command("DATA", 354);
    await this.writeRaw(`${dotStuff(buildMimeMessage(input))}\r\n.\r\n`);
    await this.readResponse(250);
    await this.command("QUIT", 221);
  }

  private async command(command: string, expectedCodes: number | number[]) {
    await this.writeRaw(`${command}\r\n`);
    await this.readResponse(expectedCodes);
  }

  private async writeRaw(data: string) {
    if (!this.socket) {
      throw new Error("SMTP socket is not connected.");
    }

    this.buffer = "";
    this.socket.write(data);
  }

  private async readResponse(expectedCodes: number | number[]) {
    const expected = Array.isArray(expectedCodes) ? expectedCodes : [expectedCodes];
    await this.waitUntil(
      () => this.buffer.split(/\r?\n/).some((line) => /^\d{3} /.test(line)),
      30000,
    );

    const lines = this.buffer.split(/\r?\n/).filter(Boolean);
    const finalLine = [...lines].reverse().find((line) => /^\d{3} /.test(line));

    if (!finalLine) {
      throw new Error("SMTP server response was incomplete.");
    }

    const code = Number(finalLine.slice(0, 3));

    if (!expected.includes(code)) {
      throw new Error(`SMTP server rejected the email with code ${code}.`);
    }
  }

  private async waitUntil(test: () => boolean, timeoutMs: number) {
    const startedAt = Date.now();

    while (!test()) {
      if (Date.now() - startedAt > timeoutMs) {
        throw new Error("SMTP server did not respond in time.");
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}

function buildMimeMessage({
  attachments = [],
  from,
  html,
  subject,
  text,
  to,
}: SendSmtpEmailInput) {
  const mixedBoundary = `tradio-mixed-${randomUUID()}`;
  const alternativeBoundary = `tradio-alt-${randomUUID()}`;
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    "",
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
    "",
    `--${alternativeBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    "",
    `--${alternativeBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    "",
    `--${alternativeBoundary}--`,
  ];

  for (const attachment of attachments) {
    lines.push(
      "",
      `--${mixedBoundary}`,
      `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      "",
      attachment.content.toString("base64").replace(/(.{76})/g, "$1\r\n"),
    );
  }

  lines.push("", `--${mixedBoundary}--`, "");
  return lines.join("\r\n");
}

export async function sendSmtpEmail(input: SendSmtpEmailInput) {
  const client = new SmtpClient();
  await client.connect();
  await client.sendMail(input);
}
