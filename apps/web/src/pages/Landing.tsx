import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Github } from 'lucide-react';
import { STACK_LABELS } from '../types';

const STEPS = [
  {
    n: '01',
    title: 'Connect',
    body: 'Point ApiForge at Postgres, MySQL, SQL Server, or SQLite. Test the wire before anything is generated.',
  },
  {
    n: '02',
    title: 'Shape',
    body: 'Drag tables onto a visual canvas, pick HTTP methods per table, or design new tables with column types — n8n-style.',
  },
  {
    n: '03',
    title: 'Harden',
    body: 'Dial CORS, rate limits, API keys, and helmet defaults so the scaffold ships production-minded.',
  },
  {
    n: '04',
    title: 'Forge',
    body: 'Preview the file tree and endpoints, then download a zip ready to run locally.',
  },
];

export function Landing() {
  return (
    <div>
      <section className="relative flex min-h-[calc(100vh-3.5rem)] flex-col justify-center overflow-hidden px-5 pb-16 pt-10">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          animate={{ opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,229,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.05) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 65% 55% at 40% 40%, black, transparent)',
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <motion.p
            className="font-display text-[clamp(3.5rem,12vw,8.5rem)] font-extrabold leading-[0.9] tracking-[-0.04em] text-[var(--fg)]"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            Api
            <span className="text-[var(--cyan)]">Forge</span>
          </motion.p>

          <motion.h1
            className="mt-6 max-w-xl font-display text-2xl font-semibold tracking-tight text-[var(--fg)] sm:text-3xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            Local APIs, forged from your schema.
          </motion.h1>

          <motion.p
            className="mt-4 max-w-lg text-base leading-relaxed text-[var(--muted)] sm:text-lg"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.22 }}
          >
            Connect a database, choose what ships, and generate a production-shaped stack — without leaving your machine.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.34 }}
          >
            <Link to="/wizard" className="btn btn-primary">
              Start forging
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </motion.div>
        </div>
      </section>

      <section className="border-t border-[var(--border)]/70 px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--cyan)]">
            How it works
          </p>
          <div className="mt-10 grid gap-12 md:grid-cols-2">
            {STEPS.map((step) => (
              <div key={step.n} className="max-w-md">
                <p className="font-display text-sm font-semibold text-[var(--cyan-dim)]">{step.n}</p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">{step.title}</h2>
                <p className="mt-3 text-[var(--muted)] leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)]/70 px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--cyan)]">
            Stacks
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight">Four ways out.</h2>
          <ul className="mt-10 grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {Object.entries(STACK_LABELS).map(([id, label]) => (
              <li
                key={id}
                className="flex items-baseline gap-3 border-b border-[var(--border)]/60 pb-4"
              >
                <span className="mono text-xs text-[var(--cyan-dim)]">{id}</span>
                <span className="text-[var(--fg)]">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-[var(--border)]/70 px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-lg font-bold">
            Api<span className="text-[var(--cyan)]">Forge</span>
          </p>
          <p className="text-sm text-[var(--muted)]">Local API generator. Runs on your machine.</p>
        </div>
      </footer>
    </div>
  );
}
