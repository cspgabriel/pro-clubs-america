import Image from "next/image";

export function BrandLogo({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      className={`brand-logo ${className}`.trim()}
      src="/brand/pro-clubs-america-512.png"
      alt="Pro Clubs America"
      width={size}
      height={size}
      priority
    />
  );
}
