"use client";

import { Bot, Send } from "lucide-react";
import { FormEvent, useState } from "react";
import { getBuiltInSupportAnswer } from "@/lib/support-knowledge";

const quickQuestions = [
  "How do quotes work?",
  "What does Elite include?",
  "How do leads work?",
];

export function LandingAiHelper() {
  const [answer, setAnswer] = useState(
    "Ask a quick Tradio question and get an instant built-in answer.",
  );
  const [question, setQuestion] = useState("");

  function ask(nextQuestion: string) {
    const trimmed = nextQuestion.trim();

    if (!trimmed) {
      return;
    }

    setAnswer(getBuiltInSupportAnswer(trimmed).answer);
    setQuestion("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
  }

  return (
    <div className="rounded-lg border border-white/15 bg-white/[0.08] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.2)] backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-copper text-white">
          <Bot aria-hidden="true" size={20} />
        </div>
        <div>
          <p className="text-sm font-black text-white">Tradio mini AI</p>
          <p className="text-xs text-white/62">Free built-in help preview</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-white p-4 text-sm leading-6 text-slate-700">
        {answer}
      </div>

      <form className="mt-3 flex gap-2" onSubmit={handleSubmit}>
        <input
          className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white px-3 py-2 text-sm text-ink outline-none ring-copper/20 transition placeholder:text-slate-400 focus:ring-4"
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about quotes, leads, pricing..."
          value={question}
        />
        <button
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-copper text-white transition hover:bg-[#e94f00]"
          type="submit"
        >
          <Send aria-hidden="true" size={16} />
          <span className="sr-only">Ask</span>
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {quickQuestions.map((item) => (
          <button
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white hover:text-ink"
            key={item}
            onClick={() => ask(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
