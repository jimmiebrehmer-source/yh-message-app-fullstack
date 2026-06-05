/**
 * SÄKERHET – Inloggnings- och registreringsformulär
 *
 * ISO 27001-kontroller:
 *  A.9.4.2 – Säkra inloggningsförfaranden (felmeddelanden, lösenordsvisning)
 *  A.9.4.3 – Lösenordshantering (styrkeindikator, minlängd 8 tecken)
 *
 * NIS2 Art. 21:
 *  – Autentiseringsmekanismer med tillräcklig styrka
 *  – Minimering av informationsexponering i felmeddelanden
 */

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { loginUser, registerUser, passwordStrength } from "../lib/auth";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuth: (username: string) => void;
}

// Input Validation – e-postformat
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const STRENGTH_LABELS = ["Mycket svagt", "Svagt", "Godkänt", "Starkt", "Mycket starkt"];
const STRENGTH_COLORS = ["bg-red-500", "bg-orange-500", "bg-amber-400", "bg-blue-500", "bg-green-500"];
const STRENGTH_TEXT   = ["text-red-500", "text-orange-500", "text-amber-500", "text-blue-500", "text-green-500"];

export function AuthModal({ open, onClose, onAuth }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // ISO 27001 A.9.4.3 – lösenordsstyrka beräknas live
  const strength = mode === "register" ? passwordStrength(password) : -1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Input Validation
    if (!email || !password) { setError("Fyll i alla fält."); return; }
    if (!isValidEmail(email))  { setError("Ange en giltig e-postadress."); return; }
    if (password.length < 8)   { setError("Lösenordet måste vara minst 8 tecken."); return; }
    if (mode === "register" && !username.trim()) { setError("Ange ett användarnamn."); return; }

    setLoading(true);
    try {
      if (mode === "register") {
        const user = await registerUser(username.trim(), email, password);
        onAuth(user.username);
      } else {
        const user = await loginUser(email, password);
        onAuth(user.username);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Något gick fel.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError(""); setEmail(""); setPassword(""); setUsername("");
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background border border-border rounded-2xl p-8 shadow-xl focus:outline-none">

          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs tracking-widest text-muted-foreground uppercase mb-1">MATILDA X BREMR</p>
              <Dialog.Title className="text-foreground">
                {mode === "login" ? "Välkommen tillbaka" : "Skapa konto"}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" aria-label="Stäng">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Användarnamn</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="dittnamn"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">E-post</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="du@exempel.se"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              {/* ISO 27001 A.9.4.3 – lösenordsfältet använder type="password"
                  för att hindra webbläsaren från att visa innehållet i klartext */}
              <label className="block text-sm text-muted-foreground mb-1.5">
                Lösenord
                {mode === "register" && <span className="text-xs ml-1 opacity-60">(minst 8 tecken)</span>}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Dölj lösenord" : "Visa lösenord"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* ISO 27001 A.9.4.3 – Lösenordsstyrkeindikator */}
              {mode === "register" && password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          i < strength ? STRENGTH_COLORS[strength] : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${STRENGTH_TEXT[strength] ?? "text-muted-foreground"}`}>
                    {STRENGTH_LABELS[strength] ?? ""}
                    {strength < 2 && " — lägg till siffror, versaler eller specialtecken"}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors mt-2"
            >
              {loading ? "Vänta…" : mode === "login" ? "Logga in" : "Skapa konto"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Inget konto?" : "Har du redan ett konto?"}{" "}
            <button className="text-blue-500 hover:text-blue-600 transition-colors" onClick={switchMode}>
              {mode === "login" ? "Registrera dig" : "Logga in"}
            </button>
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
