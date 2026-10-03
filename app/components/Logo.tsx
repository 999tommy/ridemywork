// RideMyWork logo component — uses the real cropped logo image.
// Three variants:
//   "mark"       → icon only
//   <RMWLogo>    → icon + wordmark  (variant: "dark" = white text, "light" = dark text)
//   <RMWLogoFooter> → compact footer lockup

interface LogoMarkProps {
  size?: number;
  className?: string;
}

interface LogoFullProps {
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  className?: string;
}

/* ─── Standalone icon ───────────────────────────────────────────────── */
export function RMWMark({ size = 40, className = "" }: LogoMarkProps) {
  return (
    <img
      src="/logo.jpg"
      alt="RideMyWork logo"
      width={size}
      height={size}
      className={`rounded-2xl object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/* ─── Full lockup: icon + wordmark ─────────────────────────────────── */
export function RMWLogo({ variant = "light", size = "md", className = "" }: LogoFullProps) {
  const iconSize = size === "lg" ? 44 : size === "sm" ? 30 : 36;
  const textClass =
    size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base";
  const textColor = variant === "dark" ? "text-white" : "text-ink";

  return (
    <a
      href="#home"
      aria-label="RideMyWork — home"
      className={`inline-flex items-center gap-3 font-black ${textColor} ${className}`}
    >
      <RMWMark size={iconSize} />
      <span className={`${textClass} font-black tracking-tight leading-none`}>
        Ride<span className="text-mint">My</span>Work
      </span>
    </a>
  );
}

/* ─── Footer variant ────────────────────────────────────────────────── */
export function RMWLogoFooter({ className = "" }: { className?: string }) {
  return (
    <a
      href="#home"
      aria-label="RideMyWork — home"
      className={`inline-flex items-center gap-2.5 font-black text-ink ${className}`}
    >
      <RMWMark size={32} />
      <span className="text-sm font-black tracking-tight">RideMyWork</span>
    </a>
  );
}
