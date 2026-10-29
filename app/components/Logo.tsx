import Image from "next/image";
import Link from "next/link";

type LogoVariant = "full" | "icon";
type LogoTone = "color" | "light" | "dark";

interface LogoProps {
  variant?: LogoVariant;
  tone?: LogoTone;
  width?: number;
  className?: string;
  href?: string;
  tagline?: string;
  responsive?: boolean;
  priority?: boolean;
}

const assets: Record<LogoVariant, Record<LogoTone, { src: string; width: number; height: number }>> = {
  full: {
    color: { src: "/brand/logo-full-color.svg", width: 615, height: 115 },
    dark: { src: "/brand/logo-full-mono-dark.svg", width: 307, height: 77 },
    light: { src: "/brand/logo-full-mono-light.svg", width: 307, height: 77 },
  },
  icon: {
    color: { src: "/brand/logo-icon-color.png", width: 169, height: 144 },
    dark: { src: "/brand/logo-icon-dark.png", width: 101, height: 96 },
    light: { src: "/brand/logo-icon-light.png", width: 102, height: 96 },
  },
};

export default function Logo({
  variant = "full",
  tone = "color",
  width = variant === "full" ? 180 : 36,
  className = "",
  href,
  tagline,
  responsive = false,
  priority = false,
}: LogoProps) {
  const asset = assets[variant][tone];
  const icon = assets.icon[tone];
  const rootClass = `rmw-logo ${responsive ? "rmw-logo-responsive" : ""} ${className}`.trim();
  const content = <>
    {variant === "full" ? <>
      <Image
        className="rmw-logo-full"
        src={asset.src}
        alt={href ? "RideMyWork" : ""}
        width={asset.width}
        height={asset.height}
        style={{ width, height: "auto" }}
        priority={priority}
        unoptimized
      />
      {responsive && <Image
        className="rmw-logo-mobile-icon"
        src={icon.src}
        alt={href ? "RideMyWork" : ""}
        width={icon.width}
        height={icon.height}
        style={{ width: 34, height: "auto" }}
        priority={priority}
      />}
    </> : <Image
      className="rmw-logo-icon"
      src={asset.src}
      alt={href ? "RideMyWork" : ""}
      width={asset.width}
      height={asset.height}
      style={{ width, height: "auto" }}
      priority={priority}
    />}
    {tagline && <span className="rmw-logo-tagline">{tagline}</span>}
  </>;

  if (href) {
    return <Link className={rootClass} href={href} aria-label="RideMyWork home">{content}</Link>;
  }
  return <span className={rootClass} aria-hidden="true">{content}</span>;
}
