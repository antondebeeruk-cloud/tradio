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
      <svg
        aria-hidden="true"
        className="h-12 w-14 shrink-0"
        fill="none"
        viewBox="0 0 64 54"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8 19.5C16 7.5 29 3 45.5 5.5c2 .3 3.5 1.7 4.3 3.5l.7 1.7h6.3c1.8 0 3.2 1.4 3.2 3.2v9.2c0 1.8-1.4 3.2-3.2 3.2H46.2c-1.1 0-2.1-.6-2.7-1.5l-1.8-2.8c-4.7-1.4-8.7-1.2-12.1.6-4.4 2.3-7.7 6.1-10 11.5-.7 1.6-2.8 2-4 .7l-7.1-7.3c-2-2-2.2-5.1-.5-7.4Z"
          fill={dark ? "#071a2e" : "#ffffff"}
        />
        <path
          d="M27.2 24.2h19.4l9.4 9.4v13c0 3.1-2.5 5.6-5.6 5.6H27.2c-3.1 0-5.6-2.5-5.6-5.6V29.8c0-3.1 2.5-5.6 5.6-5.6Z"
          stroke="#ff5a00"
          strokeLinejoin="round"
          strokeWidth="5"
        />
        <path
          d="M46.4 24.6v9.2h9.2"
          stroke="#ff5a00"
          strokeLinejoin="round"
          strokeWidth="5"
        />
        <path
          d="M30.8 38.2h14.8M30.8 45h11.6"
          stroke={dark ? "#071a2e" : "#ffffff"}
          strokeLinecap="round"
          strokeWidth="4"
        />
      </svg>

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
