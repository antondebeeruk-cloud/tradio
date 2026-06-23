import net from "net";
import tls from "tls";
import { extractEmailAddress } from "@/lib/lead-email";
import { ingestLeadEmail, type LeadEmailPayload } from "@/lib/leads/ingest";

type ParsedEmail = LeadEmailPayload & {
  headers: Record<string, string>;
};

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function decodeTransfer(body: string, encoding: string) {
  if (encoding.includes("base64")) {
    return Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8");
  }

  if (encoding.includes("quoted-printable")) {
    return body
      .replace(/=\r?\n/g, "")
      .replace(/=([A-F0-9]{2})/gi, (_, hex: string) =>
        String.fromCharCode(parseInt(hex, 16)),
      );
  }

  return body.trim();
}

function parseHeaders(rawHeaders: string) {
  const headers: Record<string, string> = {};
  const unfolded = rawHeaders.replace(/\r?\n[ \t]+/g, " ");

  for (const line of unfolded.split(/\r?\n/)) {
    const colonIndex = line.indexOf(":");

    if (colonIndex === -1) {
      continue;
    }

    const key = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();
    headers[key] = headers[key] ? `${headers[key]}, ${value}` : value;
  }

  return headers;
}

function parseAddressName(value?: string) {
  if (!value) {
    return "";
  }

  const withoutEmail = value.replace(/<[^>]+>/g, "").replace(/"/g, "").trim();
  return withoutEmail || "";
}

function splitHeadersAndBody(rawEmail: string) {
  const splitMatch = rawEmail.match(/\r?\n\r?\n/);

  if (!splitMatch?.index) {
    return { body: rawEmail, headers: "" };
  }

  const splitAt = splitMatch.index;
  const separatorLength = splitMatch[0].length;
  return {
    body: rawEmail.slice(splitAt + separatorLength),
    headers: rawEmail.slice(0, splitAt),
  };
}

function parseBody(headers: Record<string, string>, body: string) {
  const contentType = headers["content-type"]?.toLowerCase() ?? "text/plain";
  const encoding = headers["content-transfer-encoding"]?.toLowerCase() ?? "";

  if (!contentType.includes("multipart/")) {
    const decoded = decodeTransfer(body, encoding);
    return contentType.includes("text/html")
      ? { bodyHtml: decoded, bodyText: "" }
      : { bodyHtml: "", bodyText: decoded };
  }

  const boundaryMatch = headers["content-type"]?.match(/boundary="?([^";]+)"?/i);
  const boundary = boundaryMatch?.[1];

  if (!boundary) {
    return { bodyHtml: "", bodyText: decodeTransfer(body, encoding) };
  }

  let bodyText = "";
  let bodyHtml = "";

  for (const part of body.split(`--${boundary}`)) {
    const trimmedPart = part.trim();

    if (!trimmedPart || trimmedPart === "--") {
      continue;
    }

    const { body: partBody, headers: partHeadersRaw } =
      splitHeadersAndBody(trimmedPart);
    const partHeaders = parseHeaders(partHeadersRaw);
    const partType = partHeaders["content-type"]?.toLowerCase() ?? "";
    const partEncoding =
      partHeaders["content-transfer-encoding"]?.toLowerCase() ?? "";
    const decodedPart = decodeTransfer(partBody, partEncoding);

    if (!bodyText && partType.includes("text/plain")) {
      bodyText = decodedPart;
    }

    if (!bodyHtml && partType.includes("text/html")) {
      bodyHtml = decodedPart;
    }
  }

  return { bodyHtml, bodyText };
}

function parseRawEmail(rawEmail: string): ParsedEmail {
  const { body, headers: rawHeaders } = splitHeadersAndBody(rawEmail);
  const headers = parseHeaders(rawHeaders);
  const bodyParts = parseBody(headers, body);
  const originalRecipient =
    headers["x-original-to"] ||
    headers["delivered-to"] ||
    headers["envelope-to"] ||
    headers.to ||
    "";

  return {
    bodyHtml: bodyParts.bodyHtml,
    bodyText: bodyParts.bodyText,
    fromEmail: extractEmailAddress(headers.from),
    fromName: parseAddressName(headers.from),
    headers,
    messageId: headers["message-id"]?.replace(/[<>]/g, ""),
    originalRecipient,
    rawEmail: {
      headers,
    },
    receivedAt: headers.date ? new Date(headers.date).toISOString() : null,
    subject: headers.subject || "",
  };
}

class SimpleImapClient {
  private buffer = "";
  private socket: net.Socket | tls.TLSSocket | null = null;
  private tagCounter = 1;

  async connect() {
    const host = requireEnv("IMAP_HOST");
    const port = Number(process.env.IMAP_PORT || "993");
    const useTls = process.env.IMAP_TLS !== "false";
    const rejectUnauthorized =
      process.env.IMAP_TLS_REJECT_UNAUTHORIZED !== "false";

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
      this.socket?.destroy(new Error("IMAP connection timed out."));
    });

    await new Promise<void>((resolve, reject) => {
      this.socket?.once("error", reject);
      this.socket?.once(useTls ? "secureConnect" : "connect", () => resolve());
    });

    await this.waitForGreeting();
  }

  async login() {
    await this.send(
      `LOGIN "${requireEnv("IMAP_USER").replace(/"/g, '\\"')}" "${requireEnv(
        "IMAP_PASSWORD",
      ).replace(/"/g, '\\"')}"`,
    );
  }

  async selectInbox() {
    await this.send("SELECT INBOX");
  }

  async searchRecentMessages() {
    const response = await this.send("UID SEARCH ALL");
    const searchLine = response
      .split(/\r?\n/)
      .find((line) => line.toUpperCase().startsWith("* SEARCH"));

    const uids = searchLine
      ? searchLine
          .replace(/^\* SEARCH\s*/i, "")
          .split(/\s+/)
          .filter(Boolean)
      : [];

    return uids.slice(-50);
  }

  async fetchRaw(uid: string) {
    const response = await this.send(`UID FETCH ${uid} BODY.PEEK[]`);
    const literalMatch = response.match(/\{(\d+)\}\r?\n/);

    if (!literalMatch?.index) {
      return "";
    }

    const start = literalMatch.index + literalMatch[0].length;
    const length = Number(literalMatch[1]);
    return response.slice(start, start + length);
  }

  async markSeen(uid: string) {
    await this.send(`UID STORE ${uid} +FLAGS (\\Seen)`);
  }

  async logout() {
    if (!this.socket) {
      return;
    }

    try {
      await this.send("LOGOUT");
    } finally {
      this.socket.end();
    }
  }

  private async waitForGreeting() {
    try {
      await this.waitUntil(() => /\* OK/i.test(this.buffer), 20000);
    } catch {
      throw new Error(
        "IMAP server did not send a mailbox greeting. Check IMAP_HOST, IMAP_PORT, IMAP_TLS, and that IMAP is enabled for the mailbox.",
      );
    }
  }

  private async send(command: string) {
    if (!this.socket) {
      throw new Error("IMAP socket is not connected.");
    }

    const tag = `A${this.tagCounter++}`;
    const startIndex = this.buffer.length;
    this.socket.write(`${tag} ${command}\r\n`);
    await this.waitUntil(
      () => new RegExp(`\\r?\\n${tag} (OK|NO|BAD)`, "i").test(this.buffer),
      30000,
    );

    const response = this.buffer.slice(startIndex);

    if (new RegExp(`\\r?\\n${tag} (NO|BAD)`, "i").test(response)) {
      throw new Error(`IMAP command failed: ${command.split(" ")[0]}`);
    }

    return response;
  }

  private async waitUntil(test: () => boolean, timeoutMs: number) {
    const startedAt = Date.now();

    while (!test()) {
      if (Date.now() - startedAt > timeoutMs) {
        throw new Error("IMAP server did not respond in time.");
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}

export async function checkLeadsMailbox() {
  const client = new SimpleImapClient();
  let processed = 0;
  let seen = 0;

  await client.connect();

  try {
    await client.login();
    await client.selectInbox();
    const recentUids = await client.searchRecentMessages();

    for (const uid of recentUids) {
      try {
        const rawEmail = await client.fetchRaw(uid);

        if (!rawEmail) {
          continue;
        }

        const parsedEmail = parseRawEmail(rawEmail);
        const result = await ingestLeadEmail(parsedEmail);

        if (result.created) {
          processed += 1;
        }

        await client.markSeen(uid);
        seen += 1;
      } catch (error) {
        console.error(
          "Lead mailbox message failed",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }
  } finally {
    await client.logout();
  }

  return { processed, seen };
}
