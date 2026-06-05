/**
 * SÄKERHET – Formulär för att skapa nya inlägg
 *
 * Säkerhetskrav som hanteras här:
 *  1. Input Validation: meddelanden måste vara 3–140 tecken (krav från fas 1).
 *     → Skyddar mot tomma/meningslösa inmatningar och för långa strängar.
 *  2. Access Control: komponenten renderas bara om användaren är inloggad
 *     (kontrolleras i App.tsx). Endast autentiserade användare kan posta.
 *  3. XSS: React escapar automatiskt all text som renderas via JSX.
 *     Inga dangerouslySetInnerHTML används i hela appen.
 */

import { useState } from "react";
import { Send } from "lucide-react";

const MIN_CHARS = 3;   // Säkerhetskrav: minst 3 tecken
const MAX_CHARS = 140; // Säkerhetskrav: max 140 tecken

interface PostFormProps {
  username: string;
  onPost: (text: string) => void;
}

export function PostForm({ username, onPost }: PostFormProps) {
  const [text, setText] = useState("");
  const trimmed = text.trim();
  const remaining = MAX_CHARS - text.length;

  // Input Validation – båda gränserna måste uppfyllas
  const isValid = trimmed.length >= MIN_CHARS && remaining >= 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Dubbel validering server-side vore nödvändigt i en riktig app
    if (!isValid) return;
    onPost(trimmed);
    setText("");
  };

  const initials = username.slice(0, 2).toUpperCase();

  return (
    <form onSubmit={handleSubmit} className="px-4 py-4 border-b border-border">
      <div className="flex gap-3">
        <div className="shrink-0 w-9 h-9 rounded-full bg-blue-600/15 flex items-center justify-center">
          <span className="text-xs text-blue-600" style={{ fontWeight: 600 }}>{initials}</span>
        </div>
        <div className="flex-1 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Vad händer?"
            rows={3}
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-base resize-none focus:outline-none"
          />
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 36 36" className="w-5 h-5" aria-hidden="true">
                <circle
                  cx="18" cy="18" r="16"
                  fill="none"
                  stroke={remaining < 20 ? (remaining < 0 ? "#ef4444" : "#f59e0b") : "#3b82f6"}
                  strokeWidth="2"
                  strokeDasharray={`${Math.max(0, (text.length / MAX_CHARS) * 100.53)} 100.53`}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                  className="transition-all"
                />
                <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
              </svg>
              <span
                className="text-xs tabular-nums"
                style={{ color: remaining < 20 ? (remaining < 0 ? "#ef4444" : "#f59e0b") : "var(--muted-foreground)" }}
              >
                {remaining}
              </span>
              {/* Visar validationsmeddelande om texten är för kort */}
              {text.length > 0 && trimmed.length < MIN_CHARS && (
                <span className="text-xs text-amber-500">Minst {MIN_CHARS} tecken</span>
              )}
            </div>
            <button
              type="submit"
              disabled={!isValid}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm transition-colors"
            >
              <Send size={14} />
              Posta
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
