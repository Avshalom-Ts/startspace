export function Link({
  label,
  href,
  active = false,
}: {
  label: string;
  href: string;
  active?: boolean;
}) {
  const isExternal = href.startsWith("http");
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center border-b-2 pb-0.5 transition-colors ${active ? "border-accent font-semibold text-accent" : "border-transparent text-fg hover:text-accent"}`}
      {...(isExternal ? { target: "_self", rel: "noopener noreferrer" } : {})}
    >
      {label}
    </a>
  );
}
