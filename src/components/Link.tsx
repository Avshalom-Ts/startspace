export function Link({ label, href }: { label: string; href: string }) {
  const isExternal = href.startsWith('http');
  return (
    <a
      href={href}
      className="inline-flex items-center border-b-2 border-transparent pb-0.5 text-fg hover:text-accent transition-colors"
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {label}
    </a>
  );
}
