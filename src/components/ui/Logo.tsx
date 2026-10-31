/** علامت سنجاق: یک سنجاق (پونز) دست‌کشیده با چند خط جرقه، داخل دایرهٔ بنفش برند (مثل فاوآیکن) */
export function LogoGlyph({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <g transform="rotate(24 16 16)">
        <path d="M10.6 11.3 C10.2 6.6 12.4 4.3 16 4.3 C19.6 4.3 21.8 6.6 21.4 11.3Z" fill="#e4e0fb" />
        <path d="M7.6 11.6 Q16 10.8 24.4 11.6 L24.1 14.8 Q16 15.6 7.9 14.8Z" />
        <path d="M16 15.6 Q16.4 22 16 28.2" />
      </g>
      <path d="M5.2 6.2 l1.8 1.6 M3.8 11 h2.4" strokeWidth="1.5" />
    </svg>
  )
}

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-brand text-white" style={{ width: size, height: size }} aria-hidden="true">
      <LogoGlyph size={size * 0.64} />
    </span>
  )
}
