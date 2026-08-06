import { NavLink, Outlet } from 'react-router-dom';
import { Hammer } from 'lucide-react';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'text-sm font-medium tracking-wide transition-colors',
    isActive ? 'text-[var(--cyan)]' : 'text-[var(--muted)] hover:text-[var(--fg)]',
  ].join(' ');

export function Layout() {
  return (
    <div className="atmosphere noise min-h-screen">
      <header className="relative z-20 border-b border-[var(--border)]/70 bg-[var(--bg)]/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <NavLink to="/" className="group flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--cyan)] transition-colors group-hover:border-[var(--cyan-dim)]">
              <Hammer className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">ApiForge</span>
          </NavLink>
          <nav className="flex items-center gap-6">
            <NavLink to="/wizard" className={linkClass}>
              Wizard
            </NavLink>
            <NavLink to="/projects" className={linkClass}>
              Projects
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
