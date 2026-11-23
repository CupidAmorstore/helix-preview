import type { NavIcon as Name } from './navigation';

const paths: Record<Name, JSX.Element> = {
  markets: <path d="M4 19h16M6 15l4-5 3 3 5-7" />,
  bot: (
    <>
      <rect x="5" y="8" width="14" height="11" rx="3" />
      <path d="M12 4v4M9.5 13h.01M14.5 13h.01" />
    </>
  ),
  portfolio: <path d="M12 3a9 9 0 1 0 9 9h-9z M14.5 3.3A9 9 0 0 1 20.7 9.5H14.5z" />,
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M16 12.5h2M3 9h15" />
    </>
  ),
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" />
};

export default function NavIcon({ name, className = 'h-6 w-6' }: { name: Name; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'more' ? 3 : 1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
