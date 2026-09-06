export function LogoMark({ size = 20, label }: { size?: number; label?: string }) {
  return (
    <svg
      viewBox="0 0 90 120"
      width={size}
      height={size * 1.3}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      style={{ display: "block" }}
    >
      <rect x="10" y="8" width="20" height="104" rx="10" fill="var(--ink)" />
      <rect x="45" y="6" width="20" height="66" rx="10" fill="#FFC300" transform="rotate(45 55 39)" />
      <rect x="45" y="48" width="20" height="66" rx="10" fill="#FF5A45" transform="rotate(-45 55 81)" />
    </svg>
  );
}
