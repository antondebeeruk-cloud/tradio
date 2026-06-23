type TradioLogoProps = {
  className?: string;
  dark?: boolean;
  compact?: boolean;
};

export function TradioLogo({
  className = "",
  compact = false,
  dark = false,
}: TradioLogoProps) {
  const textClass = dark ? "text-ink" : "text-white";

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <img
        alt=""
        aria-hidden="true"
        className="h-12 w-12 shrink-0 rounded-lg object-cover shadow-[0_10px_22px_rgba(7,26,46,0.18)]"
        src="/tradio-mark.png"
      />

      {compact ? null : (
        <span
          className={`font-black leading-none tracking-normal ${textClass}`}
          style={{ fontSize: "2.65rem" }}
        >
          trad<span className="text-copper">io</span>
        </span>
      )}
    </div>
  );
}
