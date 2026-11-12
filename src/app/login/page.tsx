"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  Mail,
  Lock,
  Loader2,
  Database,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
} from "lucide-react";
import { useAutoScribe } from "@/context/AutoScribeStore";
import { BioluminescentOrb } from "@/components/BioluminescentOrb";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatAuthError(raw: string): {
  title: string;
  detail: string;
  fieldHint?: "email" | "password";
} {
  const lower = raw.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return {
      title: "Invalid Email or Password",
      detail:
        "No matching account was found with those credentials. Double-check your email address and password, or create a new account.",
      fieldHint: "password",
    };
  }
  if (lower.includes("email not confirmed")) {
    return {
      title: "Email Verification Pending",
      detail:
        "Please click the confirmation link sent to your inbox, or disable 'Confirm email' in Supabase Dashboard → Authentication → Providers → Email.",
      fieldHint: "email",
    };
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return {
      title: "Too Many Sign-In Attempts",
      detail:
        "Supabase temporarily rate-limited authentication requests. Wait a moment and try again.",
    };
  }
  return {
    title: "Authentication Failed",
    detail: raw,
  };
}

export default function LoginPage() {
  const router = useRouter();
  const {
    isSupabaseReady,
    currentUser,
    signInWithSupabase,
    connectSupabaseRuntime,
  } = useAutoScribe();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const [focusedField, setFocusedField] = useState<
    "email" | "password" | null
  >(null);
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>(
    {
      email: false,
      password: false,
    }
  );
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [serverError, setServerError] = useState<{
    title: string;
    detail: string;
  } | null>(null);
  const [shakeCount, setShakeCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Runtime Supabase connector state if .env.local is not configured yet
  const [sbUrlInput, setSbUrlInput] = useState("");
  const [sbAnonInput, setSbAnonInput] = useState("");
  const [showConnector, setShowConnector] = useState(false);

  useEffect(() => {
    if (currentUser) {
      router.replace(currentUser.role === "client" ? "/client" : "/freelancer");
    }
  }, [currentUser, router]);

  const validateFields = (
    nextEmail: string,
    nextPassword: string
  ): { email?: string; password?: string } => {
    const errors: { email?: string; password?: string } = {};
    const trimmedEmail = nextEmail.trim();

    if (!trimmedEmail) {
      errors.email = "Email address is required.";
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = "Enter a valid email address (e.g. name@company.com).";
    }

    if (!nextPassword) {
      errors.password = "Password is required.";
    } else if (nextPassword.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }

    return errors;
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setServerError(null);
    if (touched.email) {
      const errs = validateFields(val, password);
      setFieldErrors((prev) => ({ ...prev, email: errs.email }));
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    setServerError(null);
    if (touched.password) {
      const errs = validateFields(email, val);
      setFieldErrors((prev) => ({ ...prev, password: errs.password }));
    }
  };

  const handleBlur = (field: "email" | "password") => {
    setFocusedField(null);
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errs = validateFields(email, password);
    setFieldErrors((prev) => ({ ...prev, [field]: errs[field] }));
  };

  const handleKeyModifiers = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setServerError(null);

    const errs = validateFields(email, password);
    setFieldErrors(errs);

    if (errs.email || errs.password) {
      setShakeCount((c) => c + 1);
      return;
    }

    setIsSubmitting(true);
    try {
      const { user, error } = await signInWithSupabase({ email, password });
      if (error || !user) {
        const formatted = formatAuthError(error || "Unable to sign in.");
        setServerError({ title: formatted.title, detail: formatted.detail });
        if (formatted.fieldHint === "password") {
          setFieldErrors((prev) => ({
            ...prev,
            password: "Verify your password and try again.",
          }));
        } else if (formatted.fieldHint === "email") {
          setFieldErrors((prev) => ({
            ...prev,
            email: "This email requires confirmation before signing in.",
          }));
        }
        setShakeCount((c) => c + 1);
        return;
      }
      router.push(user.role === "client" ? "/client" : "/freelancer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sbUrlInput.trim() || !sbAnonInput.trim()) return;
    await connectSupabaseRuntime(sbUrlInput, sbAnonInput);
    setShowConnector(false);
  };

  const isEmailValid =
    email.trim().length > 0 && EMAIL_REGEX.test(email.trim());
  const isPasswordValid = password.length >= 6;

  return (
    <div className="min-h-screen bg-[#012624] text-[#bbc7c6] flex flex-col justify-between">
      {/* Top Bar */}
      <header className="h-24 border-b border-white/[0.07]">
        <div className="max-w-[1440px] mx-auto px-8 lg:px-16 h-full flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-4 rounded-[8px] focus-visible:outline-2 focus-visible:outline-[#cbfffc] focus-visible:outline-offset-4"
          >
            <div className="w-9 h-9 rounded-[6px] bg-[#003734] border border-white/10 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[#cbfffc]" />
            </div>
            <span className="text-[21px] font-medium tracking-[-0.025em] text-white">
              AutoScribe
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setShowConnector((v) => !v)}
              className="px-4 py-2 rounded-[8px] bg-[#011d1c] border border-white/10 hover:border-[#cbfffc]/40 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[#cbfffc] text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              {isSupabaseReady ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#cbfffc]" />
                  <span className="auros-caption text-[#edfffe]">
                    Supabase Connected
                  </span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-[#fde9ff]" />
                  <span className="auros-caption text-[#fde9ff]">
                    Connect Supabase Keys
                  </span>
                </>
              )}
            </button>

            <Link
              href="/signup"
              className="text-[12px] uppercase tracking-[0.12em] text-[#edfffe] hover:text-[#cbfffc] focus-visible:outline-2 focus-visible:outline-[#cbfffc] focus-visible:outline-offset-4 rounded-[4px] transition-colors"
            >
              Create Account →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto w-full px-8 lg:px-16 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-center">
          {/* Left 6 Cols: Editorial + Orb */}
          <div className="lg:col-span-6 space-y-10">
            <div className="space-y-5">
              <span className="auros-kicker block">
                Supabase Auth // Row-Level Security
              </span>
              <h1 className="auros-display text-[48px] sm:text-[64px]">
                Sign in to your escrow workspace.
              </h1>
              <p className="text-[18px] text-[#bbc7c6] max-w-lg leading-[1.65]">
                Your session JWT automatically scopes database queries to your
                role — routing Clients to the Multi-Freelancer Command Dashboard
                and Freelancers to their Delivery &amp; Payout Dashboard.
              </p>
            </div>

            <div className="py-2 flex items-center justify-center lg:justify-start">
              <BioluminescentOrb isActive={isSubmitting} size={340} />
            </div>
          </div>

          {/* Right 6 Cols: Spacious Login Form */}
          <div className="lg:col-span-6 space-y-8">
            <AnimatePresence>
              {(!isSupabaseReady || showConnector) && (
                <motion.form
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  onSubmit={handleConnectSupabase}
                  className="rounded-[16px] bg-[#011d1c] p-9 space-y-5 border border-[#fde9ff]/30"
                >
                  <div className="space-y-1.5">
                    <span className="auros-kicker text-[#fde9ff] block">
                      Supabase Project Connection
                    </span>
                    <p className="text-sm text-[#bbc7c6]">
                      Paste your <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                      <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (from{" "}
                      <em>Supabase Dashboard → Project Settings → API</em>), or
                      save them in <code>.env.local</code>.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="auros-input-shell">
                      <input
                        type="url"
                        required
                        placeholder="https://xyzcompany.supabase.co"
                        value={sbUrlInput}
                        onChange={(e) => setSbUrlInput(e.target.value)}
                        className="w-full bg-transparent text-sm font-mono text-white placeholder-[#707777] focus:outline-none"
                      />
                    </div>
                    <div className="auros-input-shell">
                      <input
                        type="text"
                        required
                        placeholder="sb_publishable_... or eyJhbGciOi..."
                        value={sbAnonInput}
                        onChange={(e) => setSbAnonInput(e.target.value)}
                        className="w-full bg-transparent text-sm font-mono text-white placeholder-[#707777] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="auros-btn-aurora px-6 py-3.5 flex items-center gap-2 cursor-pointer"
                  >
                    <Database className="w-4 h-4" />
                    <span>Save &amp; Connect Supabase</span>
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            <motion.form
              key={shakeCount}
              animate={
                shakeCount > 0 ? { x: [0, -7, 7, -5, 5, -2, 2, 0] } : { x: 0 }
              }
              transition={{ duration: 0.36 }}
              onSubmit={handleLogin}
              noValidate
              className="rounded-[16px] bg-[#003734] border border-white/10 p-10 sm:p-14 space-y-8 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.6)]"
            >
              <div className="space-y-2">
                <span className="auros-kicker block">
                  Account Authentication
                </span>
                <h2 className="auros-heading text-[32px]">Welcome back</h2>
              </div>

              {/* Global Server Error Banner */}
              <AnimatePresence mode="wait">
                {serverError && (
                  <motion.div
                    role="alert"
                    aria-live="assertive"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="rounded-[12px] bg-[#260b12]/90 border border-[#ff6b81]/60 p-4 text-sm text-[#ffe4e8] flex items-start justify-between gap-3 shadow-[0_0_24px_-6px_rgba(255,107,129,0.28)]"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-[#ff6b81] shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-medium text-white">
                          {serverError.title}
                        </p>
                        <p className="text-xs text-[#ffd0d7] leading-[1.55]">
                          {serverError.detail}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setServerError(null)}
                      aria-label="Dismiss error"
                      className="p-1 rounded-[6px] text-[#ffd0d7] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="login-email"
                      className={`auros-caption transition-colors ${
                        fieldErrors.email
                          ? "text-[#ff8597]"
                          : focusedField === "email"
                          ? "text-[#cbfffc]"
                          : "text-[#edfffe]"
                      }`}
                    >
                      Email Address
                    </label>
                    {focusedField === "email" && !fieldErrors.email && (
                      <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#cbfffc]">
                        Active Input
                      </span>
                    )}
                  </div>

                  <div
                    className={`auros-input-shell ${
                      fieldErrors.email
                        ? "auros-input-error"
                        : isEmailValid
                        ? "auros-input-valid"
                        : ""
                    }`}
                  >
                    <Mail
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        fieldErrors.email
                          ? "text-[#ff6b81]"
                          : focusedField === "email" || isEmailValid
                          ? "text-[#cbfffc]"
                          : "text-[#707777]"
                      }`}
                    />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      required
                      disabled={isSubmitting}
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={
                        fieldErrors.email ? "login-email-error" : undefined
                      }
                      placeholder="you@company.com"
                      value={email}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => handleBlur("email")}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      className="w-full bg-transparent text-[15px] font-mono text-white placeholder-[#707777] focus:outline-none disabled:opacity-50"
                    />
                    {isEmailValid && !fieldErrors.email && (
                      <CheckCircle2 className="w-4 h-4 text-[#cbfffc] shrink-0" />
                    )}
                    {fieldErrors.email && (
                      <AlertCircle className="w-4 h-4 text-[#ff6b81] shrink-0" />
                    )}
                  </div>

                  <AnimatePresence initial={false}>
                    {fieldErrors.email && (
                      <motion.p
                        id="login-email-error"
                        role="alert"
                        initial={{ opacity: 0, height: 0, y: -4 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -4 }}
                        transition={{ duration: 0.16 }}
                        className="text-xs text-[#ff8597] flex items-center gap-1.5 pt-1"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.email}</span>
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className={`auros-caption transition-colors ${
                        fieldErrors.password
                          ? "text-[#ff8597]"
                          : focusedField === "password"
                          ? "text-[#cbfffc]"
                          : "text-[#edfffe]"
                      }`}
                    >
                      Password
                    </label>
                    {capsLockOn && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.12em] text-[#fde9ff]">
                        <AlertTriangle className="w-3 h-3" />
                        Caps Lock On
                      </span>
                    )}
                  </div>

                  <div
                    className={`auros-input-shell ${
                      fieldErrors.password
                        ? "auros-input-error"
                        : isPasswordValid
                        ? "auros-input-valid"
                        : ""
                    }`}
                  >
                    <Lock
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        fieldErrors.password
                          ? "text-[#ff6b81]"
                          : focusedField === "password" || isPasswordValid
                          ? "text-[#cbfffc]"
                          : "text-[#707777]"
                      }`}
                    />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      disabled={isSubmitting}
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={
                        fieldErrors.password
                          ? "login-password-error"
                          : undefined
                      }
                      placeholder="••••••••"
                      value={password}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => handleBlur("password")}
                      onKeyDown={handleKeyModifiers}
                      onKeyUp={handleKeyModifiers}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      className="w-full bg-transparent text-[15px] text-white placeholder-[#707777] focus:outline-none disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="p-1.5 rounded-[6px] text-[#bbc7c6] hover:text-white hover:bg-white/10 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#cbfffc] transition-all cursor-pointer shrink-0"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {fieldErrors.password && (
                      <motion.p
                        id="login-password-error"
                        role="alert"
                        initial={{ opacity: 0, height: 0, y: -4 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -4 }}
                        transition={{ duration: 0.16 }}
                        className="text-xs text-[#ff8597] flex items-center gap-1.5 pt-1"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.password}</span>
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="auros-btn-aurora w-full py-4 px-6 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating Session...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-[#bbc7c6]">
                  Don&apos;t have an AutoScribe account yet?
                </span>
                <Link
                  href="/signup"
                  className="text-[#edfffe] font-medium hover:text-[#cbfffc] hover:underline focus-visible:outline-2 focus-visible:outline-[#cbfffc] focus-visible:outline-offset-4 rounded-[4px] transition-colors"
                >
                  Create Client or Freelancer Account →
                </Link>
              </div>
            </motion.form>
          </div>
        </div>
      </main>

      <footer className="bg-[#011d1c] py-14 border-t border-white/[0.06]">
        <div className="max-w-[1440px] mx-auto px-8 lg:px-16 flex flex-wrap items-center justify-between gap-6">
          <span className="text-sm text-white font-medium">
            AutoScribe — Autonomous AI Escrow
          </span>
          <span className="auros-caption">
            Supabase Auth • Row-Level Security • PayPal Orders &amp; Payouts
          </span>
        </div>
      </footer>
    </div>
  );
}
