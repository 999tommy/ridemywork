"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, CarFront, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { z } from "zod";

type Mode = "create" | "signin" | "recover" | "update";

function usernameFromIdentifier(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("create");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [accountType, setAccountType] = useState<"passenger" | "trip_host">("passenger");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("type") === "recovery") setMode("update");
    const requestedRole = new URLSearchParams(window.location.search).get("role");
    if (requestedRole === "trip_host" || requestedRole === "passenger") setAccountType(requestedRole);
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(""); setMessage("");
    if (!supabase) { setError("Connect Supabase first. Add the project URL and anon key in .env.local."); return; }

    if (mode === "recover") {
      const parsed = z.string().trim().email().safeParse(email);
      if (!parsed.success) { setError("Enter the email address linked to your account."); return; }
      setLoading(true);
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${window.location.origin}/auth?type=recovery` });
      setLoading(false);
      if (recoveryError) setError("We couldn’t send a recovery link. Check the address and Supabase email settings.");
      else setMessage("If an account uses that address, a password reset link is on its way.");
      return;
    }

    if (mode === "update") {
      const parsed = z.string().min(8).max(128).safeParse(password);
      if (!parsed.success) { setError("Choose a password between 8 and 128 characters."); return; }
      setLoading(true);
      const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data });
      setLoading(false);
      if (updateError) setError("That reset link may have expired. Request a new one and try again.");
      else { setMessage("Password updated. You can now sign in."); setPassword(""); setMode("signin"); }
      return;
    }

    if (mode === "create") {
      const parsed = z.object({
        name: z.string().trim().min(2).max(80),
        username: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,30}$/),
        email: z.string().trim().email().max(254),
        password: z.string().min(8).max(128),
      }).safeParse({ name, username, email, password });
      if (!parsed.success) { setError("Check your name, username (3–30 letters, numbers or hyphens), email and password (8+ characters)."); return; }
      setLoading(true);
      const result = await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: { data: { display_name: parsed.data.name, username: parsed.data.username, account_type: accountType } } });
      setLoading(false);
      if (result.error) {
        const text = result.error.message.toLowerCase();
        setError(text.includes("already registered") ? "An account already uses that email. Sign in or recover your password." : text.includes("duplicate") ? "That username is already taken. Try another." : result.error.message);
        return;
      }
      if (!result.data.session) {
        setMessage("Account created. Check your email for the confirmation link, then sign in.");
        setMode("signin"); setIdentifier(parsed.data.email); setPassword("");
        return;
      }
      router.push(new URLSearchParams(window.location.search).get("next")?.startsWith("/ride") ? new URLSearchParams(window.location.search).get("next")! : "/ride");
      router.refresh();
      return;
    }

    const parsed = z.object({ identifier: z.string().trim().min(3).max(254), password: z.string().min(8).max(128) }).safeParse({ identifier, password });
    if (!parsed.success) { setError("Enter your username or email and password."); return; }
    setLoading(true);
    let result: { data?: { session?: { access_token: string; refresh_token: string } | null }; error?: { message: string } | null };
    if (parsed.data.identifier.includes("@")) {
      result = await supabase.auth.signInWithPassword({ email: parsed.data.identifier.toLowerCase(), password: parsed.data.password });
    } else {
      const { data, error: functionError } = await supabase.functions.invoke("sign-in", { body: { username: usernameFromIdentifier(parsed.data.identifier), password: parsed.data.password } });
      if (functionError || !data?.access_token || !data?.refresh_token) result = { error: { message: "Sign in failed" } };
      else {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
        result = { data: { session: sessionData.session }, error: sessionError };
      }
    }
    setLoading(false);
    if (result.error || !result.data?.session) { setError("That username or email and password combination wasn’t recognized."); return; }
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next?.startsWith("/ride") ? next : "/ride"); router.refresh();
  };

  const creating = mode === "create";
  const signingIn = mode === "signin";
  return <main className="auth-screen"><Link href="/about" className="auth-back"><ArrowLeft size={17}/> About RideMyWork</Link><div className="auth-brand"><span className="rmw-brand-mark">R</span><span>RideMyWork<small>Move together</small></span></div><section className="auth-card">
    <div className="auth-intro"><span className="auth-icon"><CarFront size={24}/></span><span className="overline">YOUR NEXT COMMUTE, CONNECTED</span><h1>{creating ? "A better way to get there." : mode === "recover" ? "Recover your account." : mode === "update" ? "Choose a new password." : "Welcome back."}</h1><p>{creating ? "Join as a passenger, a Trip Host, or both. Your account supports either side of the journey." : signingIn ? "Use your username or email to sign in." : mode === "recover" ? "We’ll send a secure reset link to the email on your account." : "Set a new password for your RideMyWork account."}</p></div>
    <form onSubmit={submit}>
      {creating && <>
        <label className="field-label">Your name<input required autoComplete="name" minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Ada Okafor"/></label>
        <label className="field-label">Username<input required autoComplete="username" minLength={3} maxLength={30} pattern="[A-Za-z0-9-]{3,30}" value={username} onChange={e=>setUsername(e.target.value)} placeholder="e.g. ada-okafor"/><small className="helper-text">People can use this or your email to sign in.</small></label>
        <label className="field-label">Email address<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/><small className="helper-text">Used for account recovery and important account messages.</small></label>
        <fieldset className="account-type-choice"><legend>I’m joining as</legend><label className={accountType==="passenger"?"selected":""}><input type="radio" name="accountType" checked={accountType==="passenger"} onChange={()=>setAccountType("passenger")}/><span><strong>Passenger</strong><small>Find someone already going my way</small></span></label><label className={accountType==="trip_host"?"selected":""}><input type="radio" name="accountType" checked={accountType==="trip_host"} onChange={()=>setAccountType("trip_host")}/><span><strong>Trip Host</strong><small>Share seats on a trip I already planned</small></span></label><p>You can use both sides of RideMyWork from your account.</p></fieldset>
      </>}
      {signingIn && <label className="field-label">Username or email<input required autoComplete="username" value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="@ada-okafor or you@example.com"/></label>}
      {mode !== "recover" && <label className="field-label">{mode === "update" ? "New password" : "Password"}<div className="password-input"><input required autoComplete={creating||mode==="update"?"new-password":"current-password"} type={show?"text":"password"} minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="update"?"At least 8 characters":"At least 8 characters"}/><button type="button" aria-label={show?"Hide password":"Show password"} onClick={()=>setShow(!show)}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>}
      {mode === "recover" && <label className="field-label">Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>}
      {error&&<p className="auth-error" role="alert">{error}</p>}{message&&<p className="auth-success" role="status">{message}</p>}
      <button disabled={loading} className="button primary-action full-action">{loading?"Please wait…":creating?"Create account":signingIn?"Sign in":mode==="recover"?"Send reset link":"Update password"}<ArrowRight size={17}/></button>
    </form>
    {signingIn&&<button className="auth-recovery-link" onClick={()=>{setMode("recover");setError("");setMessage("");}}>Forgot password?</button>}
    {mode !== "update"&&<p className="auth-switch">{creating?"Already have an account?":"New to RideMyWork?"} <button onClick={()=>{setMode(creating?"signin":"create");setError("");setMessage("");}}>{creating?"Sign in":"Create account"}</button></p>}
    <div className="auth-trust"><ShieldCheck size={17}/><span>Your profile and trip details are protected by account-based access controls.</span></div><div className="auth-note"><BadgeCheck size={16}/> Email is used for recovery. Phone verification isn’t required.</div>
  </section><p className="auth-footer">By continuing, you agree to the <Link href="/about#safety">RideMyWork community rules</Link>.</p></main>;
}
