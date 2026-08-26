/** Brand mark for StartSpace: an orbit glyph paired with the wordmark. */
export function Logo() {
  return (
    <a href="#" className="group inline-flex items-center gap-2" aria-label="StartSpace home">
      <span className="inline-flex items-center justify-center rounded-lg bg-accent/10 p-1.5 text-accent transition-transform group-hover:scale-105">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
          <circle cx="12" cy="12" r="3.25" fill="currentColor" />
          <path
            d="M12 1.5v3.25M12 19.25v3.25M1.5 12h3.25M19.25 12h3.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
      </span>
      <span className="text-lg font-semibold tracking-tight text-fg">
        Start<span className="text-accent">Space</span>
      </span>
    </a>
  );
}
