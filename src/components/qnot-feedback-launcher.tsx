"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const WHATSAPP_NUMBER = "2347040750733";
const TOPICS = [
  "Booking or journey request",
  "Driver or vehicle experience",
  "Safety or incident",
  "Route, stop or waiting time",
  "Payment or receipt",
  "Accessibility",
  "Other feedback",
] as const;

export function QNotFeedbackLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [replyContact, setReplyContact] = useState("");

  const canSend = message.trim().length >= 8;
  const whatsappUrl = useMemo(() => {
    const body = [
      "Q-not product feedback",
      `Topic: ${topic}`,
      `Page: ${pathname || "unknown"}`,
      `Feedback: ${message.trim()}`,
      replyContact.trim() ? `Reply contact: ${replyContact.trim()}` : "",
    ].filter(Boolean).join("\n");
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(body)}`;
  }, [message, pathname, replyContact, topic]);

  return (
    <aside className="fixed bottom-32 right-4 z-[80] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 md:bottom-5 md:right-5" aria-label="Q-not feedback">
      {open && (
        <section
          id="qnot-feedback-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="qnot-feedback-title"
          className="w-[min(23rem,calc(100vw-2rem))] rounded-2xl border border-lime-300/20 bg-[#0b1714] p-4 text-white shadow-2xl shadow-black/40"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[.18em] text-lime-300">Q-NOT / LISTENING</p>
              <h2 id="qnot-feedback-title" className="mt-1 text-lg font-bold">Help us improve the journey.</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close feedback" className="rounded-lg px-2 py-1 text-xl text-neutral-400 hover:bg-white/10 hover:text-white">×</button>
          </div>
          <label className="mt-4 block text-xs font-semibold text-neutral-300">
            What is this about?
            <select value={topic} onChange={(event) => setTopic(event.target.value as (typeof TOPICS)[number])} className="mt-1.5 min-h-11 w-full rounded-lg border border-neutral-700 bg-[#101f1b] px-3 text-sm text-white outline-none focus:border-lime-300">
              {TOPICS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="mt-3 block text-xs font-semibold text-neutral-300">
            Tell us what happened or what should change
            <textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 1200))} rows={4} maxLength={1200} minLength={8} required placeholder="Include the route, time or booking reference if relevant. Do not send passwords, OTPs or full card details." className="mt-1.5 w-full resize-y rounded-lg border border-neutral-700 bg-[#101f1b] px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-lime-300" />
            <span className="mt-1 block text-right font-normal text-neutral-500">{message.length}/1200</span>
          </label>
          <label className="mt-2 block text-xs font-semibold text-neutral-300">
            Reply contact (optional)
            <input value={replyContact} onChange={(event) => setReplyContact(event.target.value.slice(0, 100))} maxLength={100} placeholder="Phone or email" className="mt-1.5 min-h-11 w-full rounded-lg border border-neutral-700 bg-[#101f1b] px-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-lime-300" />
          </label>
          <a
            href={canSend ? whatsappUrl : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!canSend}
            className={`mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${canSend ? "bg-lime-300 text-[#08110e] hover:bg-lime-200" : "cursor-not-allowed bg-neutral-800 text-neutral-500"}`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M20.52 3.48A11.84 11.84 0 0 0 12.08 0C5.53 0 .2 5.33.2 11.88c0 2.1.55 4.16 1.6 5.97L.1 24l6.3-1.65a11.9 11.9 0 0 0 5.68 1.45h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.18-1.24-6.17-3.45-8.44ZM12.09 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.74.98 1-3.65-.23-.37a9.88 9.88 0 0 1-1.52-5.29c0-5.47 4.45-9.92 9.91-9.92 2.65 0 5.14 1.03 7.01 2.91a9.86 9.86 0 0 1 2.9 7.01c0 5.47-4.45 9.92-9.92 9.92Zm5.44-7.43c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.66-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.09 4.49.71.3 1.27.49 1.7.62.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z"/></svg>
            Continue to WhatsApp
          </a>
          <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">WhatsApp opens with your message prepared. Review it and tap Send yourself. This box is not an emergency hotline; contact campus security or emergency services for immediate danger.</p>
        </section>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls="qnot-feedback-panel"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-12 items-center gap-2 rounded-full border border-lime-200/25 bg-[#b7f36b] px-4 py-3 text-sm font-extrabold text-[#07110d] shadow-xl shadow-black/30 transition hover:bg-lime-200 focus:outline-none focus:ring-2 focus:ring-lime-100 focus:ring-offset-2 focus:ring-offset-[#071311]"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/></svg>
        {open ? "Close feedback" : "Give feedback"}
      </button>
    </aside>
  );
}
