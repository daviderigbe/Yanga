export function Logomark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <div
      className={`grid place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[55%] w-[55%] -rotate-12"
      >
        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
        <circle cx="7.5" cy="7.5" r={0.5} fill="currentColor" />
      </svg>
    </div>
  );
}
