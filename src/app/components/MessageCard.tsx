/**
 * SÄKERHET – Meddelandekort med edit, delete, like och kommentar
 *
 * Säkerhetskrav som hanteras här:
 *  1. Access Control (Least Privilege): redigera/radera-knappar visas BARA
 *     för meddelandets ägare (isOwner). Gäller även kommentarsinmatning.
 *     → Skyddar mot Tampering och Elevation of Privilege (STRIDE).
 *  2. Input Validation: redigerade meddelanden och kommentarer måste vara
 *     3–140 tecken, identiskt med PostForm.
 *  3. XSS-skydd: React escapar automatiskt all text i JSX-uttryck ({...}).
 *     Vi använder ALDRIG dangerouslySetInnerHTML i den här appen.
 *     → Skyddar mot XSS-attacker via användargenererat innehåll (STRIDE: Tampering).
 */

import { useState, useEffect } from "react";
import { Trash2, Pencil, Check, X, Heart, MessageCircle, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const MIN_CHARS = 3;   // Säkerhetskrav: minst 3 tecken (samma som PostForm)
const MAX_CHARS = 140; // Säkerhetskrav: max 140 tecken

export interface Comment {
  id: string;
  username: string;
  text: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  text: string;
  username: string;
  createdAt: Date;
  likes: string[];
  comments: Comment[];
  // [P2-FIX] seeded=true skyddar seed-inlägg från att ägas av registrerade konton
  seeded?: boolean;
}

interface MessageCardProps {
  message: Message;
  currentUser: string | null;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onLike: (id: string) => void;
  onComment: (id: string, text: string) => void;
}

export function MessageCard({ message, currentUser, onDelete, onEdit, onLike, onComment }: MessageCardProps) {
  // [P2-FIX] Access Control: seeded inlägg kan aldrig ägas av ett registrerat konto.
  // Utan denna kontroll: registrera som "celestine" → äg och radera seed-inlägget.
  const isOwner = currentUser !== null && currentUser === message.username && !message.seeded;

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  // Buggfix: synka editText om meddelandets text ändrats externt (t.ex. efter sparning)
  useEffect(() => {
    if (!editing) setEditText(message.text);
  }, [message.text, editing]);

  const liked = currentUser ? message.likes.includes(currentUser) : false;
  const initials = message.username.slice(0, 2).toUpperCase();

  const editTrimmed = editText.trim();
  const editRemaining = MAX_CHARS - editText.length;
  // Input Validation – kontrollerar båda gränserna
  const editValid = editTrimmed.length >= MIN_CHARS && editRemaining >= 0;

  const commentTrimmed = commentText.trim();
  const commentRemaining = MAX_CHARS - commentText.length;
  const commentValid = commentTrimmed.length >= MIN_CHARS && commentRemaining >= 0;

  const handleSave = () => {
    // Dubbel kontroll av validering innan sparning
    if (editValid && editTrimmed !== message.text) {
      onEdit(message.id, editTrimmed);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setEditText(message.text);
    setEditing(false);
  };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    // Access Control – bara inloggade användare kan kommentera
    if (!commentValid || !currentUser) return;
    onComment(message.id, commentTrimmed);
    setCommentText("");
  };

  return (
    <article className="border-b border-border">
      <div className="flex gap-3 px-4 py-4 hover:bg-muted/30 transition-colors group">
        <div className="shrink-0 w-9 h-9 rounded-full bg-blue-600/15 flex items-center justify-center">
          {/* XSS: initials är ett slice av username – React escapar automatiskt */}
          <span className="text-xs text-blue-600" style={{ fontWeight: 600 }}>{initials}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-foreground" style={{ fontWeight: 600 }}>@{message.username}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(message.createdAt, { addSuffix: true })}
            </span>
          </div>

          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value.slice(0, MAX_CHARS))}
                maxLength={MAX_CHARS}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-foreground text-sm resize-none focus:outline-none focus:border-blue-500 transition-colors"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={!editValid}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs transition-colors"
                >
                  <Check size={12} /> Spara
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted hover:bg-accent text-foreground text-xs transition-colors"
                >
                  <X size={12} /> Avbryt
                </button>
                <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                  {editText.length > 0 && editTrimmed.length < MIN_CHARS && (
                    <span className="text-amber-500">Minst {MIN_CHARS} tecken</span>
                  )}
                  <span className={editRemaining < 20 ? (editRemaining < 0 ? "text-red-500" : "text-amber-500") : ""}>
                    {editRemaining}/140
                  </span>
                </span>
              </div>
            </div>
          ) : (
            /* XSS: message.text renderas som textnod via JSX – React escapar HTML-tecken */
            <p className="text-sm text-foreground leading-relaxed break-words">{message.text}</p>
          )}

          {/* Åtgärdsrad: like och kommentar */}
          {!editing && (
            <div className="flex items-center gap-4 mt-3">
              <button
                onClick={() => setShowComments((v) => !v)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  showComments ? "text-blue-500" : "text-muted-foreground hover:text-blue-500"
                }`}
                aria-label="Kommentera"
              >
                <MessageCircle size={15} />
                {message.comments.length > 0 && <span>{message.comments.length}</span>}
              </button>

              {/* Access Control: like-knappen är disabled för ej inloggade */}
              <button
                onClick={() => currentUser && onLike(message.id)}
                disabled={!currentUser}
                className={`flex items-center gap-1.5 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  liked ? "text-pink-500" : "text-muted-foreground hover:text-pink-500"
                }`}
                aria-label={liked ? "Ta bort like" : "Gilla"}
              >
                <Heart size={15} fill={liked ? "currentColor" : "none"} />
                {message.likes.length > 0 && <span>{message.likes.length}</span>}
              </button>
            </div>
          )}
        </div>

        {/* Access Control: edit/delete visas BARA för meddelandets ägare */}
        {isOwner && !editing && (
          <div className="shrink-0 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
              aria-label="Redigera"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(message.id)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Radera"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Kommentarssektionen */}
      {showComments && (
        <div className="pl-16 pr-4 pb-4 space-y-3">
          {message.comments.length > 0 && (
            <div className="space-y-2">
              {message.comments.map((c) => {
                const ci = c.username.slice(0, 2).toUpperCase();
                return (
                  <div key={c.id} className="flex gap-2.5 items-start">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center mt-0.5">
                      <span className="text-xs text-muted-foreground" style={{ fontWeight: 600 }}>{ci}</span>
                    </div>
                    <div className="flex-1 min-w-0 bg-muted/40 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-foreground" style={{ fontWeight: 600 }}>@{c.username}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(c.createdAt, { addSuffix: true })}
                        </span>
                      </div>
                      {/* XSS: c.text renderas som textnod – React escapar automatiskt */}
                      <p className="text-xs text-foreground leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Kommentarsformulär – samma upplägg som PostForm */}
          {currentUser ? (
            <form onSubmit={handleComment}>
              <div className="flex gap-3">
                <div className="shrink-0 w-9 h-9 rounded-full bg-blue-600/15 flex items-center justify-center">
                  <span className="text-xs text-blue-600" style={{ fontWeight: 600 }}>
                    {currentUser.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 space-y-3">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value.slice(0, MAX_CHARS))}
                    placeholder="Skriv en kommentar…"
                    rows={3}
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none"
                  />
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 36 36" className="w-5 h-5" aria-hidden="true">
                        <circle
                          cx="18" cy="18" r="16"
                          fill="none"
                          stroke={commentRemaining < 20 ? (commentRemaining < 0 ? "#ef4444" : "#f59e0b") : "#3b82f6"}
                          strokeWidth="2"
                          strokeDasharray={`${Math.max(0, (commentText.length / MAX_CHARS) * 100.53)} 100.53`}
                          strokeLinecap="round"
                          transform="rotate(-90 18 18)"
                          className="transition-all"
                        />
                        <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
                      </svg>
                      <span
                        className="text-xs tabular-nums"
                        style={{ color: commentRemaining < 20 ? (commentRemaining < 0 ? "#ef4444" : "#f59e0b") : "var(--muted-foreground)" }}
                      >
                        {commentRemaining}
                      </span>
                      {/* Input Validation – minlängdsvarning */}
                      {commentText.length > 0 && commentTrimmed.length < MIN_CHARS && (
                        <span className="text-xs text-amber-500">Minst {MIN_CHARS} tecken</span>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={!commentValid}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm transition-colors"
                    >
                      <Send size={14} />
                      Kommentera
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <p className="text-xs text-muted-foreground">Logga in för att kommentera.</p>
          )}
        </div>
      )}
    </article>
  );
}
