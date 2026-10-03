"use client";

import { useEffect, useState } from "react";
import { RMWLogo, RMWLogoFooter } from "./components/Logo";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Car,
  CheckCircle2,
  Clock,
  KeyRound,
  LockKeyhole,
  MapPin,
  Route,
  ShieldCheck,
  Siren,
  Smartphone,
  Star,
  Users,
  WalletCards,
  Zap,
  TrendingUp,
  Globe2,
  ChevronDown,
} from "lucide-react";


/* ─── Data ─────────────────────────────────────────────────────────────── */

const navItems = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Trip Hosts", href: "#trip-hosts" },
  { label: "Passengers", href: "#passengers" },
  { label: "Safety", href: "#safety" },
  { label: "Communities", href: "#communities" },
  { label: "FAQ", href: "#faq" },
];

const launchRoutes = [
  "Ajah / Lekki → Victoria Island",
  "Ikeja → Lekki",
  "Yaba → Victoria Island",
  "Abule Egba → Lekki / Ajah",
  "Surulere → Lagos Island",
  "Ojodu → Lekki",
  "Maryland → Victoria Island",
];

const stats = [
  { value: "4", suffix: " Routes", label: "at launch", icon: Route },
  { value: "100%", suffix: "", label: "verified users", icon: BadgeCheck },
  { value: "₦0", suffix: "", label: "platform fee*", icon: Zap },
  { value: "Lagos", suffix: "", label: "first city", icon: Globe2 },
];

const passengerSteps = [
  { step: "01", title: "Search for a trip", body: "Browse existing journeys going your way." },
  { step: "02", title: "Check the Trip Host", body: "View profiles, ratings, vehicle info and verified status." },
  { step: "03", title: "Request a seat", body: "Send your request and wait for host approval." },
  { step: "04", title: "Get your boarding code", body: "A unique code is generated after confirmation." },
  { step: "05", title: "Share the journey", body: "Meet at the agreed pickup point, show your code." },
];

const hostSteps = [
  { step: "01", title: "Plan a genuine journey", body: "Only trips you're actually making qualify." },
  { step: "02", title: "Create your trip", body: "Add route, time, seats and contribution amount." },
  { step: "03", title: "Choose your contribution", body: "Within RideMyWork's recommended limit." },
  { step: "04", title: "Approve verified passengers", body: "Accept requests from people you're comfortable with." },
  { step: "05", title: "Confirm boarding", body: "Check the boarding code in-app at pickup." },
];

const safetySignals = [
  {
    icon: BadgeCheck,
    title: "Verified profiles",
    body: "Trip Hosts and passengers see names, photos, verification status, ratings and completed trip history.",
  },
  {
    icon: Car,
    title: "Vehicle context",
    body: "Passengers see vehicle information tied to the trip before anyone meets.",
  },
  {
    icon: KeyRound,
    title: "Boarding code",
    body: "A unique code helps the Trip Host confirm the right passenger at pickup.",
  },
  {
    icon: Siren,
    title: "Support tools",
    body: "Report, block, trusted contacts, emergency notifications and RideMyWork Operations.",
  },
];

const faq = [
  {
    q: "Is RideMyWork a ride-hailing service?",
    a: "No. RideMyWork connects passengers to existing journeys. A Trip Host must already have a genuine reason to make the trip.",
  },
  {
    q: "What is a Trip Host?",
    a: "A Trip Host is someone already making a journey who has available seats in their vehicle. They are not driving because a passenger requested a ride.",
  },
  {
    q: "Can someone create trips just to make money?",
    a: "No. Commercial driving is against the platform rules. Passenger contributions are for sharing the cost of an existing journey.",
  },
  {
    q: "Who chooses the contribution?",
    a: "RideMyWork recommends a contribution based on the journey. The Trip Host chooses the final amount within RideMyWork's allowed limit.",
  },
  {
    q: "What is a boarding code?",
    a: "It is a unique trip code generated after booking confirmation. The passenger shows it at pickup and the Trip Host confirms it in the app.",
  },
  {
    q: "Can workplaces create communities?",
    a: "Yes. Workplaces, universities, estates, organizations and events can become verified communities that add trust and better matching.",
  },
];

/* ─── Components ────────────────────────────────────────────────────────── */

// Logo components are imported from ./components/Logo

function PrimaryBtn({
  href,
  children,
  size = "md",
}: {
  href: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const pad = size === "lg" ? "px-7 py-4 text-base" : size === "sm" ? "px-4 py-2.5 text-sm" : "px-5 py-3 text-sm";
  return (
    <a
      href={href}
      className={`btn-shine inline-flex items-center gap-2 rounded-xl font-extrabold bg-sun text-ink transition hover:bg-[#e8ab31] active:scale-[0.97] ${pad}`}
    >
      {children}
    </a>
  );
}

function GhostBtn({
  href,
  children,
  size = "md",
}: {
  href: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const pad = size === "lg" ? "px-7 py-4 text-base" : size === "sm" ? "px-4 py-2.5 text-sm" : "px-5 py-3 text-sm";
  return (
    <a
      href={href}
      className={`inline-flex items-center gap-2 rounded-xl font-extrabold border border-white/20 bg-white/8 text-white backdrop-blur transition hover:bg-white/16 hover:border-white/30 active:scale-[0.97] ${pad}`}
    >
      {children}
    </a>
  );
}

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      className={`mb-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] ${
        light ? "text-mint" : "text-palm"
      }`}
    >
      <span className={`h-px w-6 ${light ? "bg-mint" : "bg-palm"}`} />
      {children}
    </p>
  );
}

function SectionHeading({
  label,
  title,
  body,
  light = false,
}: {
  label: string;
  title: string;
  body?: string;
  light?: boolean;
}) {
  return (
    <div className="max-w-3xl">
      <Eyebrow light={light}>{label}</Eyebrow>
      <h2
        className={`text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl ${
          light ? "text-white" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {body && (
        <p className={`mt-5 text-lg leading-8 ${light ? "text-white/70" : "text-graphite"}`}>{body}</p>
      )}
    </div>
  );
}

function StatCard({ value, suffix, label, icon: Icon }: (typeof stats)[0]) {
  return (
    <div className="card-lift neon-border relative flex flex-col gap-2 rounded-2xl border border-white/12 bg-white/6 p-5 backdrop-blur-sm">
      <Icon className="text-mint" size={20} />
      <p className="text-3xl font-black text-white leading-none">
        {value}
        <span className="text-mint">{suffix}</span>
      </p>
      <p className="text-sm text-white/60">{label}</p>
    </div>
  );
}

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`neon-border card-lift cursor-pointer rounded-2xl border transition-all duration-300 ${
        open ? "border-palm/30 bg-white shadow-soft" : "border-ink/8 bg-white/60 hover:bg-white"
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between gap-4 p-6">
        <h3 className="text-base font-bold leading-snug text-ink sm:text-lg">{q}</h3>
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xl font-black transition-all duration-300 ${
            open ? "bg-palm text-white rotate-45" : "bg-mist text-ink"
          }`}
        >
          +
        </span>
      </div>
      {open && (
        <p className="px-6 pb-6 text-base leading-7 text-graphite">{a}</p>
      )}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-cream text-ink">

      {/* ── NAV ────────────────────────────────────────────────────────── */}
      <header
        className={`fixed left-1/2 top-4 z-50 w-[min(1200px,calc(100%-24px))] -translate-x-1/2 rounded-2xl px-3 py-3 text-white transition-all duration-300 ${
          scrolled
            ? "border border-white/14 bg-ink/90 shadow-soft backdrop-blur-2xl"
            : "border border-white/10 bg-ink/60 backdrop-blur-xl"
        }`}
      >
        <nav className="flex items-center justify-between gap-4" aria-label="Main navigation">
          <RMWLogo variant="dark" size="md" />

          <div className="hidden items-center gap-6 text-sm font-bold text-white/70 lg:flex">
            {navItems.map((item) => (
              <a key={item.label} href={item.href} className="nav-link hover:text-white transition-colors">
                {item.label}
              </a>
            ))}
          </div>

          <PrimaryBtn href="#get-started" size="sm">
            Get Started
          </PrimaryBtn>
        </nav>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section id="home" className="relative min-h-screen bg-ink pt-28 text-white">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1666418096581-234d9778631d?auto=format&fit=crop&w=1800&q=82"
            alt="Lagos road with private vehicles and commuters"
            className="h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,18,15,0.98)_0%,rgba(7,18,15,0.80)_50%,rgba(7,18,15,0.55)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(19,138,97,0.18)_0%,transparent_60%)]" />
        </div>

        {/* Animated blob accent */}
        <div className="pointer-events-none absolute left-[55%] top-1/2 -translate-y-1/2 h-96 w-96 animate-morph bg-palm/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10 lg:pb-24 lg:pt-28">

          {/* ── Left copy ── */}
          <div className="animate-fade-in-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/10 px-4 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-mint">
                Verified carpooling · Lagos
              </span>
            </div>

            <h1 className="text-[clamp(3.8rem,12vw,9.5rem)] font-black leading-[0.85] tracking-tight">
              Ride<span className="gradient-text">My</span>Work
            </h1>

            <p className="mt-6 max-w-2xl text-[clamp(1.25rem,3.5vw,2.2rem)] font-extrabold leading-tight text-white/90">
              You&apos;re already going that way.{" "}
              <span className="text-mint">Someone else is too.</span>
            </p>

            <p className="mt-6 max-w-xl text-lg leading-8 text-white/65">
              RideMyWork connects verified people travelling in the same direction across Lagos — join existing
              journeys and share the cost.
            </p>

            <div id="get-started" className="mt-9 flex flex-wrap gap-3">
              <PrimaryBtn href="#passengers" size="lg">
                Find a Trip <ArrowRight size={18} />
              </PrimaryBtn>
              <GhostBtn href="#trip-hosts" size="lg">
                Become a Trip Host
              </GhostBtn>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              {["Lagos-first", "No commercial drivers", "Boarding code pickup"].map((badge) => (
                <span
                  key={badge}
                  className="flex items-center gap-1.5 text-sm text-white/55"
                >
                  <CheckCircle2 size={14} className="text-palm shrink-0" />
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* ── Right card ── */}
          <div className="animate-fade-in-right delay-300 animate-float">
            <div className="rounded-2xl border border-white/15 bg-white/8 p-1 shadow-glow backdrop-blur-2xl">
              <div className="rounded-xl bg-cream p-5 text-ink">

                {/* Trip header */}
                <div className="flex items-start justify-between gap-3 border-b border-ink/8 pb-4">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-palm">Existing trip</p>
                    <h2 className="mt-1.5 text-xl font-black leading-tight">Lekki → Victoria Island</h2>
                  </div>
                  <span className="shrink-0 rounded-full bg-mint px-3 py-1 text-[11px] font-black text-forest">
                    ✓ Verified
                  </span>
                </div>

                {/* Route visual */}
                <div className="route-line relative my-6 grid grid-cols-[auto_1fr_auto] items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white shadow-soft">
                    <MapPin size={18} />
                  </span>
                  <span className="sr-only">Route line</span>
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-sun text-ink shadow-soft">
                    <Building2 size={18} />
                  </span>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    ["Trip Host", "Tomi A.", <ShieldCheck key="host" size={16} />],
                    ["Departure", "7:00 AM", <Clock key="clock" size={16} />],
                    ["Seats open", "2 available", <Users key="users" size={16} />],
                    ["Contribution", "₦1,000 / seat", <WalletCards key="wallet" size={16} />],
                  ].map(([label, value, icon]) => (
                    <div
                      key={String(label)}
                      className="card-lift rounded-xl border border-ink/8 bg-white p-3 transition"
                    >
                      <div className="mb-2 text-palm">{icon}</div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-graphite">
                        {label}
                      </p>
                      <p className="mt-0.5 text-sm font-black">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Boarding code */}
                <div className="mt-2.5 overflow-hidden rounded-xl bg-ink p-4 text-white">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-mint">Boarding code</p>
                  <div className="mt-3 flex items-center justify-between">
                    <strong className="text-2xl tracking-[0.14em] font-black">RMW · 482</strong>
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-sun/15">
                      <KeyRound className="text-sun" size={22} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40">
          <span className="text-xs font-bold uppercase tracking-widest">Scroll</span>
          <ChevronDown size={18} className="animate-bounce" />
        </div>
      </section>

      {/* ── STATS BAR ──────────────────────────────────────────────────── */}
      <section className="bg-forest px-5 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.value} {...s} />
          ))}
        </div>
      </section>

      {/* ── ROUTES TICKER ──────────────────────────────────────────────── */}
      <section className="bg-ink py-4">
        <div className="ticker-wrap">
          <div className="animate-ticker flex min-w-max gap-3">
            {[...launchRoutes, ...launchRoutes].map((route, i) => (
              <span
                key={i}
                className="shrink-0 rounded-full border border-white/12 px-5 py-2 text-sm font-bold text-white/65"
              >
                {route}
              </span>
            ))}
            <span className="shrink-0 rounded-full border border-mint/35 bg-mint/10 px-5 py-2 text-sm font-bold text-mint">
              ✦ Expanding by demand
            </span>
          </div>
        </div>
      </section>

      {/* ── POSITION SECTION ───────────────────────────────────────────── */}
      <section className="grain px-5 py-24 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <SectionHeading
              label="The position"
              title="Carpooling, not commercial driving."
              body="Traditional ride-hailing begins when you request a vehicle. RideMyWork begins with a real journey that is already happening."
            />
            <a
              href="#how-it-works"
              className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-palm hover:gap-3 transition-all"
            >
              See how it works <ArrowRight size={16} />
            </a>
          </div>

          <div className="grid gap-3">
            {[
              { title: "Trip Host", body: "A person already making the journey with available seats.", accent: "mint" },
              { title: "Passenger", body: "A verified person joining that existing trip.", accent: "sun" },
              { title: "Contribution", body: "A per-seat amount that helps share the cost of the journey.", accent: "mint" },
              { title: "Platform rule", body: "No commercial driving. Trip Hosts confirm they are already making the trip independently.", accent: "sun" },
            ].map(({ title, body, accent }) => (
              <article
                key={title}
                className="card-lift neon-border group relative flex items-start gap-4 rounded-2xl border border-ink/8 bg-white/80 p-5 backdrop-blur transition"
              >
                <span
                  className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${accent === "mint" ? "bg-palm" : "bg-sun"}`}
                />
                <div>
                  <h3 className="font-black text-lg">{title}</h3>
                  <p className="mt-1.5 text-base leading-7 text-graphite">{body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-ink px-5 py-24 text-white sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            label="How it works"
            title="A shared journey with trust built in."
            body="Simple enough for everyday commutes, clear enough to stay genuine."
            light
          />

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: "01",
                title: "Match routes",
                body: "Passengers search for people already travelling their way. Trip Hosts share seats on journeys they were already making.",
                color: "from-mint/10 to-mint/5",
                accent: "text-mint",
              },
              {
                n: "02",
                title: "See both sides clearly",
                body: "Profiles, verification, ratings, vehicle details, trip history and contribution are visible before approval.",
                color: "from-sun/10 to-sun/5",
                accent: "text-sun",
              },
              {
                n: "03",
                title: "Confirm with a code",
                body: "After booking, RideMyWork generates a boarding code. The Trip Host checks it in the app at pickup.",
                color: "from-mint/10 to-mint/5",
                accent: "text-mint",
              },
              {
                n: "04",
                title: "Keep it reasonable",
                body: "RideMyWork recommends a contribution. Trip Hosts choose the final amount within the platform limit.",
                color: "from-sun/10 to-sun/5",
                accent: "text-sun",
              },
            ].map(({ n, title, body, color, accent }, i) => (
              <article
                key={n}
                className={`card-lift neon-border rounded-2xl bg-gradient-to-br ${color} border border-white/10 p-6`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <span className={`text-4xl font-black ${accent} leading-none`}>{n}</span>
                <h3 className="mt-5 text-xl font-black leading-snug">{title}</h3>
                <p className="mt-3 text-base leading-7 text-white/60">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRIP HOSTS + PASSENGERS ─────────────────────────────────────── */}
      <section className="bg-mist px-5 py-24 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2">

          {/* Trip Hosts */}
          <article
            id="trip-hosts"
            className="card-lift neon-border group rounded-2xl border border-ink/8 bg-white p-8 shadow-soft"
          >
            <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-mint text-forest">
              <Route size={26} />
            </div>
            <Eyebrow>For Trip Hosts</Eyebrow>
            <h2 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              Already going that way?{" "}
              <span className="text-palm">Share your empty seats.</span>
            </h2>
            <p className="mt-5 text-base leading-8 text-graphite">
              Create a trip for a journey you&apos;re already making and let verified passengers request to join.
            </p>
            <ul className="mt-7 grid gap-3">
              {hostSteps.map(({ step, title }) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mint text-[11px] font-black text-forest">
                    {step}
                  </span>
                  <span className="text-base font-bold">{title}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <PrimaryBtn href="#get-started">
                Create a trip <ArrowRight size={16} />
              </PrimaryBtn>
            </div>
          </article>

          {/* Passengers */}
          <article
            id="passengers"
            className="card-lift neon-border group rounded-2xl border border-white/10 bg-ink p-8 text-white shadow-soft"
          >
            <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-sun text-ink">
              <Smartphone size={26} />
            </div>
            <Eyebrow light>For Passengers</Eyebrow>
            <h2 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              Find someone{" "}
              <span className="text-mint">already going your way.</span>
            </h2>
            <p className="mt-5 text-base leading-8 text-white/65">
              Search available trips, compare Trip Hosts, request a seat, and use your boarding code at pickup.
            </p>
            <ul className="mt-7 grid gap-3">
              {passengerSteps.map(({ step, title }) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-palm/30 text-[11px] font-black text-mint">
                    {step}
                  </span>
                  <span className="text-base font-bold">{title}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <PrimaryBtn href="#get-started">
                Find a trip <ArrowRight size={16} />
              </PrimaryBtn>
            </div>
          </article>
        </div>
      </section>

      {/* ── RECURRING TRIPS ─────────────────────────────────────────────── */}
      <section className="grain px-5 py-24 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">

          {/* Phone mockup */}
          <div className="flex justify-center">
            <div className="animate-float relative w-full max-w-[340px] rounded-[2.2rem] border-[10px] border-ink bg-ink p-5 text-white shadow-glow">
              <div className="mx-auto mb-6 h-1.5 w-20 rounded-full bg-white/18" />

              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-mint">Recurring commute</p>
                <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-black text-mint">Active</span>
              </div>

              <h3 className="mt-2 text-xl font-black leading-snug">Lekki → Victoria Island</h3>
              <p className="mt-1 text-sm text-white/55">Monday to Friday · 7:00 AM</p>

              <div className="mt-5 grid grid-cols-5 gap-2">
                {["M", "T", "W", "T", "F"].map((day, i) => (
                  <span
                    key={i}
                    className="grid aspect-square place-items-center rounded-xl bg-mint text-sm font-black text-forest"
                  >
                    {day}
                  </span>
                ))}
              </div>

              <div className="mt-5 rounded-xl bg-white/8 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black">2 seats available</span>
                  <span className="font-black text-sun">₦1,000</span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-palm to-mint" />
                </div>
                <p className="mt-1.5 text-xs text-white/45">RideMyWork recommended contribution</p>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl bg-sun/12 p-3">
                <TrendingUp size={16} className="text-sun shrink-0" />
                <p className="text-xs font-bold text-sun">3 passengers matched this week</p>
              </div>
            </div>
          </div>

          {/* Copy */}
          <div>
            <SectionHeading
              label="Recurring trips"
              title="Your commute happens every week. Your ride can too."
              body="Set regular routes, select days, choose preferred departure time and stay visible for the journeys people repeat most."
            />
            <div className="mt-8 flex flex-wrap gap-3">
              {["Set regular route", "Select days", "Save commute", "Find compatible trips"].map((item) => (
                <span
                  key={item}
                  className="pill-tag rounded-full border border-ink/12 bg-white px-4 py-2 text-sm font-bold shadow-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SAFETY ──────────────────────────────────────────────────────── */}
      <section id="safety" className="relative bg-forest px-5 py-24 text-white sm:px-8 lg:px-10 overflow-hidden">
        {/* Glow accent */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-palm/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <SectionHeading
            label="Safety and trust"
            title="Know who you're travelling with."
            body="Every layer is designed to make both sides feel confident before the trip begins."
            light
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {safetySignals.map(({ icon: Icon, title, body }, i) => (
              <article
                key={title}
                className="card-lift neon-border group rounded-2xl border border-white/10 bg-white/6 p-6 backdrop-blur"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-palm/20">
                  <Icon className="text-mint" size={24} />
                </div>
                <h3 className="text-lg font-black">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/60">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMUNITIES ─────────────────────────────────────────────────── */}
      <section id="communities" className="bg-white px-5 py-24 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <SectionHeading
            label="Communities"
            title="Your workplace can be your commuting community."
            body="Verified workplaces, universities, estates and events can become extra trust layers for people travelling from similar places."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <article className="card-lift neon-border rounded-2xl border border-ink/8 bg-cream p-6">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-palm/12">
                <Building2 className="text-palm" size={24} />
              </div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-graphite">ABC Company</p>
              <h3 className="mt-2 text-3xl font-black leading-none">125 verified members</h3>
              <p className="mt-3 text-base leading-7 text-graphite">Find colleagues travelling your way.</p>
              <div className="mt-4 h-1 w-full rounded-full bg-ink/6 overflow-hidden">
                <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-palm to-mint" />
              </div>
            </article>

            <article className="card-lift neon-border rounded-2xl border border-white/10 bg-ink p-6 text-white">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-sun/15">
                <LockKeyhole className="text-sun" size={24} />
              </div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-mint">Trust layer</p>
              <h3 className="mt-2 text-3xl font-black leading-none">Routes feel familiar</h3>
              <p className="mt-3 text-base leading-7 text-white/60">
                Communities help people match with verified members who share common locations and routines.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ── BRAND PROMISE ───────────────────────────────────────────────── */}
      <section className="bg-ink px-5 py-24 text-white sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <Eyebrow light>Brand promise</Eyebrow>
            <h2 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              They have the journey.{" "}
              <span className="gradient-text">You have the destination.</span>
            </h2>
            <p className="mt-6 text-lg leading-8 text-white/65">
              RideMyWork connects people around real movement already happening in Lagos — premium, friendly,
              Nigerian, mobile-first.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { top: "Carpooling", bottom: "Not ride-hailing" },
                { top: "Verified", bottom: "Both sides" },
                { top: "Reasonable", bottom: "Bounded cost sharing" },
              ].map(({ top, bottom }) => (
                <div key={top} className="card-lift rounded-xl bg-white p-4 text-ink">
                  <p className="text-xl font-black">{top}</p>
                  <p className="mt-1.5 text-sm font-bold text-graphite">{bottom}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-gradient-to-br from-mint/20 to-mint/8 border border-mint/20 p-5">
              <div className="flex items-start gap-3">
                <Star className="mt-0.5 shrink-0 text-sun" size={20} />
                <p className="text-lg font-black leading-tight">
                  RideMyWork is about finding someone who is already going your way.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section id="faq" className="grain px-5 py-24 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl">
          <SectionHeading
            label="FAQ"
            title="Clear answers for a new commute habit."
          />
          <div className="mt-10 grid gap-3">
            {faq.map(({ q, a }, i) => (
              <FaqItem key={q} q={q} a={a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink px-5 py-28 text-center text-white sm:px-8 lg:px-10">
        <div className="absolute inset-0 opacity-30">
          <img
            src="https://images.unsplash.com/photo-1649502913092-fb7f0e8fc632?auto=format&fit=crop&w=1600&q=78"
            alt="Lagos evening road"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/80 to-ink" />
        </div>

        {/* Glowing orbs */}
        <div className="pointer-events-none absolute left-1/4 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-palm/20 blur-3xl animate-pulse-glow" />
        <div className="pointer-events-none absolute right-1/4 top-1/2 h-80 w-80 translate-x-1/2 -translate-y-1/2 rounded-full bg-sun/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/10 px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-mint">Start with RideMyWork</span>
          </div>

          <h2 className="text-5xl font-black leading-none tracking-tight sm:text-6xl lg:text-7xl">
            Share the ride.{" "}
            <span className="gradient-text">Split the cost.</span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/65">
            Find a verified Trip Host already going your way, or share your empty seats on a journey you were
            already making.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <PrimaryBtn href="#passengers" size="lg">
              Find a Trip <ArrowRight size={18} />
            </PrimaryBtn>
            <GhostBtn href="#trip-hosts" size="lg">
              Become a Trip Host
            </GhostBtn>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-cream px-5 pb-10 pt-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 border-t border-ink/8 pt-8 md:flex-row md:items-center md:justify-between">
            <RMWLogoFooter />
            <nav className="flex flex-wrap gap-6 text-sm font-bold text-graphite">
              {navItems.map((item) => (
                <a key={item.label} href={item.href} className="hover:text-ink transition-colors">
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
          <p className="mt-6 text-xs text-graphite/60">
            *Subject to change. RideMyWork is currently in pre-launch. Routes and features may vary.
          </p>
        </div>
      </footer>
    </main>
  );
}
