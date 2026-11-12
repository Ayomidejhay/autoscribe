"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  Mail,
  Lock,
  User,
  ShieldCheck,
  Briefcase,
  Code2,
  Loader2,
  Database,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { useAutoScribe } from "@/context/AutoScribeStore";
import { BioluminescentOrb } from "@/components/BioluminescentOrb";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SignUpField = "fullName" | "email" | "password" | "paypalEmail";

function getPasswordStrength(pw: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!pw) return { score: 0, label: "Min 6 chars", color: "bg-white/10" };
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score += 1;

  if (score <= 1) {
    return { score: 1, label: "Weak", color: "bg-[#ff6b81]" };
  }
  if (score === 2) {
    return { score: 2, label: "Fair", color: "bg-[#fde9ff]" };
  }
  if (score === 3) {
    return { score: 3, label: "Good", color: "bg-[#00b4a6]" };
  }
  return { score: 4, label: "Strong", color: "bg-[#cbfffc]" };
}

function formatSignUpError(raw: string): {
  title: string;
  detail: string;
  fieldHint?: SignUpField;
} {
  const lower = raw.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return {
      title: "Email Already Registered",
      detail:
        "An account with this email already exists in Supabase. Sign in instead or use a different email address.",
      fieldHint: "email",
    };
  }
  if (lower.includes("confirm your email") || lower.includes("check your email")) {
    return {
      title: "Email Confirmation Required",
      detail: raw,
    };
  }
  if (lower.includes("password")) {
    return {
      title: "Password Policy Error",
      detail: raw,
      fieldHint: "password",
    };
  }
  return {
    title: "Registration Error",
    detail: raw,
  };
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#012624] text-[#bbc7c6] flex items-center justify-center">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="w-5 h-5 animate-spin text-[#cbfffc]" />
            <span className="auros-caption text-[#edfffe]">Loading Sign-Up Form...</span>
          </div>
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    isSupabaseReady,
    currentUser,
    signUpWithSupabase,
    connectSupabaseRuntime,
  } = useAutoScribe();

  const [role, setRole] = useState<"client" | "freelancer">("client");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [invitedFromParam, setInvitedFromParam] = useState<string | null>(null);

  // Auto-detect invitation parameters (?email=...&invite=...)
  useEffect(() => {
    const inviteParam = searchParams.get("invite");
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
      setRole("freelancer"); // Contracts are invited to freelancers
      setPaypalEmail(emailParam); // Pre-fill paypal email with invited address
      setInvitedFromParam(inviteParam || "contract");
    }
  }, [searchParams]);

  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [focusedField, setFocusedField] = useState<SignUpField | null>(null);
  const [touched, setTouched] = useState<Record<SignUpField, boolean>>({
    fullName: false,
    email: false,
    password: false,
    paypalEmail: false,
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<SignUpField, string>>
  >({});
  const [serverError, setServerError] = useState<{
    title: string;
    detail: string;
  } | null>(null);
  const [shakeCount, setShakeCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [sbUrlInput, setSbUrlInput] = useState("");
  const [sbAnonInput, setSbAnonInput] = useState("");
  const [showConnector, setShowConnector] = useState(false);

  useEffect(() => {
    if (currentUser) {
      router.replace(currentUser.role === "client" ? "/client" : "/freelancer");
    }
  }, [currentUser, router]);

  const validateAll = (vals: {
    fullName: string;
    email: string;
    password: string;
    paypalEmail: string;
    role: "client" | "freelancer";
  }): Partial<Record<SignUpField, string>> => {
    const errs: Partial<Record<SignUpField, string>> = {};

    if (!vals.fullName.trim()) {
      errs.fullName = "Full name or organization name is required.";
    } else if (vals.fullName.trim().length < 2) {
      errs.fullName = "Name must be at least 2 characters.";
    }

    if (!vals.email.trim()) {
      errs.email = "Email address is required.";
    } else if (!EMAIL_REGEX.test(vals.email.trim())) {
      errs.email = "Enter a valid email address (e.g. you@domain.com).";
    }

    if (!vals.password) {
      errs.password = "Password is required.";
    } else if (vals.password.length < 6) {
      errs.password = "Password must be at least 6 characters long.";
    }

    if (vals.role === "freelancer") {
      if (!vals.paypalEmail.trim()) {
        errs.paypalEmail =
          "PayPal payout email is required to receive autonomous escrow disbursements.";
      } else if (!EMAIL_REGEX.test(vals.paypalEmail.trim())) {
        errs.paypalEmail =
          "Enter a valid PayPal email address (e.g. dev-sb@personal.example.com).";
      }
    }

    return errs;
  };

  const handleFieldChange = (field: SignUpField, value: string) => {
    setServerError(null);
    const nextState = {
      fullName: field === "fullName" ? value : fullName,
      email: field === "email" ? value : email,
      password: field === "password" ? value : password,
      paypalEmail: field === "paypalEmail" ? value : paypalEmail,
      role,
    };

    if (field === "fullName") setFullName(value);
    if (field === "email") setEmail(value);
    if (field === "password") setPassword(value);
    if (field === "paypalEmail") setPaypalEmail(value);

    if (touched[field]) {
      const errs = validateAll(nextState);
      setFieldErrors((prev) => ({ ...prev, [field]: errs[field] }));
    }
  };

  const handleBlur = (field: SignUpField) => {
    setFocusedField(null);
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errs = validateAll({ fullName, email, password, paypalEmail, role });
    setFieldErrors((prev) => ({ ...prev, [field]: errs[field] }));
  };

  const handleKeyModifiers = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setTouched({
      fullName: true,
      email: true,
      password: true,
      paypalEmail: role === "freelancer",
    });

    const errs = validateAll({ fullName, email, password, paypalEmail, role });
    setFieldErrors(errs);

    if (Object.keys(errs).length > 0) {
      setShakeCount((c) => c + 1);
      return;
    }

    setIsSubmitting(true);
    try {
      const { user, error } = await signUpWithSupabase({
        fullName,
        email,
        password,
        role,
        paypalEmail: role === "freelancer" ? paypalEmail : undefined,
      });

      if (error || !user) {
        const formatted = formatSignUpError(
          error || "Unable to create account."
        );
        setServerError({ title: formatted.title, detail: formatted.detail });
        if (formatted.fieldHint) {
          setFieldErrors((prev) => ({
            ...prev,
            [formatted.fieldHint!]: formatted.detail,
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

  const isNameValid = fullName.trim().length >= 2;
  const isEmailValid = EMAIL_REGEX.test(email.trim());
  const isPasswordValid = password.length >= 6;
  const isPayPalValid = EMAIL_REGEX.test(paypalEmail.trim());
  const pwStrength = getPasswordStrength(password);

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
              href="/login"
              className="text-[12px] uppercase tracking-[0.12em] text-[#edfffe] hover:text-[#cbfffc] focus-visible:outline-2 focus-visible:outline-[#cbfffc] focus-visible:outline-offset-4 rounded-[4px] transition-colors"
            >
              Sign In →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto w-full px-8 lg:px-16 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-center">
          {/* Left 6 Cols */}
          <div className="lg:col-span-6 space-y-10">
            <div className="space-y-5">
              <span className="auros-kicker block">
                Onboarding // Client &amp; Freelancer Provisioning
              </span>
              <h1 className="auros-display text-[48px] sm:text-[64px]">
                Create your AutoScribe account.
              </h1>
              <p className="text-[18px] text-[#bbc7c6] max-w-lg leading-[1.65]">
                If you register as a{" "}
                <span className="text-[#edfffe]">Freelancer</span> using an
                email address that a Client has already invited to a project,
                Supabase triggers automatically attach those contracts to your
                dashboard.
              </p>
            </div>

            <div className="py-2 flex items-center justify-center lg:justify-start">
              <BioluminescentOrb isActive={isSubmitting} size={340} />
            </div>
          </div>

          {/* Right 6 Cols: Sign-Up Form */}
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
                      <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> below (or add
                      them to <code>.env.local</code>).
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
              onSubmit={handleSignUp}
              noValidate
              className="rounded-[16px] bg-[#003734] border border-white/10 p-10 sm:p-14 space-y-8 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.6)]"
            >
              {/* Invitation Auto-Detection Banner */}
              {invitedFromParam && (
                <div className="rounded-[12px] bg-[#011d1c] border border-[#cbfffc]/40 p-4 flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-[#cbfffc] shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <span className="text-[#cbfffc] font-semibold uppercase tracking-[0.1em]">
                      Contract Invitation Detected
                    </span>
                    <p className="text-[#bbc7c6] leading-[1.5]">
                      We pre-filled your invited email (<code className="text-white">{email}</code>) and selected the Freelancer role. Once you create your password, Supabase will automatically link the contract to your account.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <span className="auros-kicker block">
                  01 / Select Account Role
                </span>
                <h2 className="auros-heading text-[32px]">
                  Provision Identity
                </h2>
              </div>

              {/* Tactile Role Selector Cards with Active, Hover & Focus States */}
              <div
                role="radiogroup"
                aria-label="Account Role"
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={role === "client"}
                  onClick={() => {
                    setRole("client");
                    setFieldErrors((prev) => ({
                      ...prev,
                      paypalEmail: undefined,
                    }));
                  }}
                  className={`text-left rounded-[12px] p-5 border transition-all active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-[#cbfffc] focus-visible:outline-offset-2 cursor-pointer ${
                    role === "client"
                      ? "bg-[#011d1c] border-[#cbfffc] shadow-[0_0_0_3px_rgba(203,255,252,0.14)] text-white"
                      : "bg-[#012624]/80 border-white/10 hover:border-[#cbfffc]/40 hover:bg-[#011d1c]/60 text-[#bbc7c6]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Briefcase
                      className={`w-5 h-5 ${
                        role === "client" ? "text-[#cbfffc]" : "text-[#707777]"
                      }`}
                    />
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        role === "client"
                          ? "border-[#cbfffc] bg-[#cbfffc]/20"
                          : "border-white/20"
                      }`}
                    >
                      {role === "client" && (
                        <span className="w-2 h-2 rounded-full bg-[#cbfffc]" />
                      )}
                    </span>
                  </div>
                  <p className="text-[17px] font-medium text-white">
                    Client Account
                  </p>
                  <p className="text-xs text-[#bbc7c6] mt-1 leading-[1.5]">
                    Create projects, invite freelancers, and fund PayPal escrow
                    milestones.
                  </p>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={role === "freelancer"}
                  onClick={() => setRole("freelancer")}
                  className={`text-left rounded-[12px] p-5 border transition-all active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-[#fde9ff] focus-visible:outline-offset-2 cursor-pointer ${
                    role === "freelancer"
                      ? "bg-[#011d1c] border-[#fde9ff] shadow-[0_0_0_3px_rgba(253,233,255,0.15)] text-white"
                      : "bg-[#012624]/80 border-white/10 hover:border-[#fde9ff]/40 hover:bg-[#011d1c]/60 text-[#bbc7c6]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Code2
                      className={`w-5 h-5 ${
                        role === "freelancer"
                          ? "text-[#fde9ff]"
                          : "text-[#707777]"
                      }`}
                    />
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        role === "freelancer"
                          ? "border-[#fde9ff] bg-[#fde9ff]/20"
                          : "border-white/20"
                      }`}
                    >
                      {role === "freelancer" && (
                        <span className="w-2 h-2 rounded-full bg-[#fde9ff]" />
                      )}
                    </span>
                  </div>
                  <p className="text-[17px] font-medium text-white">
                    Freelancer Account
                  </p>
                  <p className="text-xs text-[#bbc7c6] mt-1 leading-[1.5]">
                    Claim invited contracts, push GitHub commits, and receive
                    PayPal Payouts.
                  </p>
                </button>
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
                {/* Full Name Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="signup-name"
                      className={`auros-caption transition-colors ${
                        fieldErrors.fullName
                          ? "text-[#ff8597]"
                          : focusedField === "fullName"
                          ? "text-[#cbfffc]"
                          : "text-[#edfffe]"
                      }`}
                    >
                      {role === "client"
                        ? "Full Name or Organization"
                        : "Full Name"}
                    </label>
                    {focusedField === "fullName" && !fieldErrors.fullName && (
                      <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#cbfffc]">
                        Active Input
                      </span>
                    )}
                  </div>

                  <div
                    className={`auros-input-shell ${
                      fieldErrors.fullName
                        ? "auros-input-error"
                        : isNameValid
                        ? "auros-input-valid"
                        : ""
                    }`}
                  >
                    <User
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        fieldErrors.fullName
                          ? "text-[#ff6b81]"
                          : focusedField === "fullName" || isNameValid
                          ? "text-[#cbfffc]"
                          : "text-[#707777]"
                      }`}
                    />
                    <input
                      id="signup-name"
                      type="text"
                      autoComplete="name"
                      required
                      disabled={isSubmitting}
                      aria-invalid={Boolean(fieldErrors.fullName)}
                      aria-describedby={
                        fieldErrors.fullName ? "signup-name-error" : undefined
                      }
                      placeholder={
                        role === "client"
                          ? "Elena Vance / Horizon Labs"
                          : "Marcus Chen"
                      }
                      value={fullName}
                      onFocus={() => setFocusedField("fullName")}
                      onBlur={() => handleBlur("fullName")}
                      onChange={(e) =>
                        handleFieldChange("fullName", e.target.value)
                      }
                      className="w-full bg-transparent text-[15px] text-white placeholder-[#707777] focus:outline-none disabled:opacity-50"
                    />
                    {isNameValid && !fieldErrors.fullName && (
                      <CheckCircle2 className="w-4 h-4 text-[#cbfffc] shrink-0" />
                    )}
                    {fieldErrors.fullName && (
                      <AlertCircle className="w-4 h-4 text-[#ff6b81] shrink-0" />
                    )}
                  </div>

                  <AnimatePresence initial={false}>
                    {fieldErrors.fullName && (
                      <motion.p
                        id="signup-name-error"
                        role="alert"
                        initial={{ opacity: 0, height: 0, y: -4 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -4 }}
                        transition={{ duration: 0.16 }}
                        className="text-xs text-[#ff8597] flex items-center gap-1.5 pt-1"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.fullName}</span>
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="signup-email"
                      className={`auros-caption transition-colors ${
                        fieldErrors.email
                          ? "text-[#ff8597]"
                          : focusedField === "email"
                          ? "text-[#cbfffc]"
                          : "text-[#edfffe]"
                      }`}
                    >
                      Email Address{" "}
                      {role === "freelancer" && "(RLS Invite Target)"}
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
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      required
                      disabled={isSubmitting}
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={
                        fieldErrors.email ? "signup-email-error" : undefined
                      }
                      placeholder={
                        role === "freelancer"
                          ? "Use the email your client invited"
                          : "you@company.com"
                      }
                      value={email}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => handleBlur("email")}
                      onChange={(e) =>
                        handleFieldChange("email", e.target.value)
                      }
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
                        id="signup-email-error"
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

                {/* Password Field with Strength Meter */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="signup-password"
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
                    <div className="flex items-center gap-3">
                      {capsLockOn && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.12em] text-[#fde9ff]">
                          <AlertTriangle className="w-3 h-3" />
                          Caps Lock On
                        </span>
                      )}
                      <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#bbc7c6]">
                        {pwStrength.label}
                      </span>
                    </div>
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
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      disabled={isSubmitting}
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={
                        fieldErrors.password
                          ? "signup-password-error"
                          : undefined
                      }
                      placeholder="Minimum 6 characters"
                      value={password}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => handleBlur("password")}
                      onKeyDown={handleKeyModifiers}
                      onKeyUp={handleKeyModifiers}
                      onChange={(e) =>
                        handleFieldChange("password", e.target.value)
                      }
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

                  {/* 4-Segment Password Strength Bar */}
                  <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                    {[1, 2, 3, 4].map((seg) => (
                      <div
                        key={seg}
                        className={`h-1 rounded-full transition-colors duration-200 ${
                          pwStrength.score >= seg
                            ? pwStrength.color
                            : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>

                  <AnimatePresence initial={false}>
                    {fieldErrors.password && (
                      <motion.p
                        id="signup-password-error"
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

                {/* Freelancer PayPal Sandbox Payout Email */}
                <AnimatePresence initial={false}>
                  {role === "freelancer" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label
                          htmlFor="signup-paypal"
                          className={`auros-caption transition-colors ${
                            fieldErrors.paypalEmail
                              ? "text-[#ff8597]"
                              : focusedField === "paypalEmail"
                              ? "text-[#fde9ff]"
                              : "text-[#fde9ff]"
                          }`}
                        >
                          PayPal Sandbox Payout Email
                        </label>
                        {isEmailValid && paypalEmail !== email && (
                          <button
                            type="button"
                            onClick={() =>
                              handleFieldChange("paypalEmail", email.trim())
                            }
                            className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#cbfffc] hover:underline cursor-pointer"
                          >
                            Use Account Email
                          </button>
                        )}
                      </div>

                      <div
                        className={`auros-input-shell ${
                          fieldErrors.paypalEmail
                            ? "auros-input-error"
                            : isPayPalValid
                            ? "auros-input-valid"
                            : ""
                        }`}
                      >
                        <ShieldCheck
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            fieldErrors.paypalEmail
                              ? "text-[#ff6b81]"
                              : focusedField === "paypalEmail" || isPayPalValid
                              ? "text-[#fde9ff]"
                              : "text-[#707777]"
                          }`}
                        />
                        <input
                          id="signup-paypal"
                          type="email"
                          required={role === "freelancer"}
                          disabled={isSubmitting}
                          aria-invalid={Boolean(fieldErrors.paypalEmail)}
                          aria-describedby={
                            fieldErrors.paypalEmail
                              ? "signup-paypal-error"
                              : undefined
                          }
                          placeholder="freelancer-sb@personal.example.com"
                          value={paypalEmail}
                          onFocus={() => setFocusedField("paypalEmail")}
                          onBlur={() => handleBlur("paypalEmail")}
                          onChange={(e) =>
                            handleFieldChange("paypalEmail", e.target.value)
                          }
                          className="w-full bg-transparent text-[15px] font-mono text-[#fde9ff] placeholder-[#707777] focus:outline-none disabled:opacity-50"
                        />
                        {isPayPalValid && !fieldErrors.paypalEmail && (
                          <CheckCircle2 className="w-4 h-4 text-[#cbfffc] shrink-0" />
                        )}
                        {fieldErrors.paypalEmail && (
                          <AlertCircle className="w-4 h-4 text-[#ff6b81] shrink-0" />
                        )}
                      </div>

                      <AnimatePresence initial={false}>
                        {fieldErrors.paypalEmail && (
                          <motion.p
                            id="signup-paypal-error"
                            role="alert"
                            initial={{ opacity: 0, height: 0, y: -4 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -4 }}
                            transition={{ duration: 0.16 }}
                            className="text-xs text-[#ff8597] flex items-center gap-1.5 pt-1"
                          >
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{fieldErrors.paypalEmail}</span>
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="auros-btn-aurora w-full py-4 px-6 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Provisioning Supabase Profile...</span>
                  </>
                ) : (
                  <>
                    <span>
                      Create {role === "client" ? "Client" : "Freelancer"}{" "}
                      Account
                    </span>
                    <ArrowUpRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-[#bbc7c6]">Already registered?</span>
                <Link
                  href="/login"
                  className="text-[#edfffe] font-medium hover:text-[#cbfffc] hover:underline focus-visible:outline-2 focus-visible:outline-[#cbfffc] focus-visible:outline-offset-4 rounded-[4px] transition-colors"
                >
                  Sign In to Dashboard →
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
