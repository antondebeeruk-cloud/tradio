"use client";

import { Bot, Send, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";

type ChatMessage = {
  content: string;
  role: "assistant" | "user";
};

const starterQuestions = [
  "How do I create and send a quote?",
  "How do I convert an accepted quote into an invoice?",
  "Why are leads not showing from my mailbox?",
  "How do Lite and Elite differ?",
];

export function SupportAiChat() {
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      content:
        "Hi, I'm Tradio Support AI. Ask me about customers, quotes, invoices, leads, jobs, reports, subscriptions, or setup.",
      role: "assistant",
    },
  ]);

  async function sendMessage(messageText: string) {
    const trimmed = messageText.trim();

    if (!trimmed || isSending) {
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { content: trimmed, role: "user" },
    ];

    setError("");
    setInput("");
    setIsSending(true);
    setMessages(nextMessages);

    try {
      const response = await fetch("/api/support-ai", {
        body: JSON.stringify({
          messages: [
            ...messages.slice(1),
            { content: trimmed, role: "user" },
          ].slice(-10),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Support AI could not answer right now.");
      }

      setMessages((current) => [
        ...current,
        {
          content: data.answer,
          role: "assistant",
        },
      ]);
    } catch (chatError) {
      setError(
        chatError instanceof Error
          ? chatError.message
          : "Support AI could not answer right now.",
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <section className="surface overflow-hidden">
      <div className="section-bar">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#fff1e8] text-copper">
            <Bot aria-hidden="true" size={20} />
          </div>
          <div>
            <h2 className="font-semibold">Ask Tradio Support AI</h2>
            <p className="mt-1 text-sm text-slate-500">
              Get quick help using the app. For account billing or legal issues,
              contact support.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_18rem]">
        <div className="flex min-h-[32rem] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
            {messages.map((message, index) => {
              const isUser = message.role === "user";

              return (
                <div
                  className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  key={`${message.role}-${index}`}
                >
                  {!isUser ? (
                    <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-forest text-white">
                      <Bot aria-hidden="true" size={16} />
                    </div>
                  ) : null}
                  <div
                    className={`max-w-[46rem] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${
                      isUser
                        ? "bg-copper text-white"
                        : "border border-field bg-white text-slate-700"
                    }`}
                  >
                    <p className="whitespace-pre-line">{message.content}</p>
                  </div>
                  {isUser ? (
                    <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#fff1e8] text-copper">
                      <UserRound aria-hidden="true" size={16} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {error ? <p className="notice mx-4 mb-3 sm:mx-5">{error}</p> : null}

          <form
            className="border-t border-field bg-white p-4 sm:p-5"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="field-control mt-0"
                disabled={isSending}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask how to do something in Tradio..."
                value={input}
              />
              <button className="btn-accent shrink-0" disabled={isSending}>
                <Send aria-hidden="true" size={16} />
                {isSending ? "Asking..." : "Ask"}
              </button>
            </div>
          </form>
        </div>

        <aside className="border-t border-field bg-mist p-4 lg:border-l lg:border-t-0">
          <h3 className="text-sm font-black text-ink">Try asking</h3>
          <div className="mt-3 space-y-2">
            {starterQuestions.map((question) => (
              <button
                className="w-full rounded-lg border border-field bg-white px-3 py-2 text-left text-sm font-semibold text-forest shadow-sm transition hover:border-copper hover:bg-[#fff5ef]"
                disabled={isSending}
                key={question}
                onClick={() => void sendMessage(question)}
                type="button"
              >
                {question}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
