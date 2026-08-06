import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, FolderOpen, Trash2 } from 'lucide-react';
import { deleteProject, listProjects } from '../lib/api';
import { STACK_LABELS, type GeneratedStack, type ProjectRecord } from '../types';

type ProjectSummary = Pick<ProjectRecord, 'id' | 'name' | 'stack' | 'createdAt'>;

export function Projects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDelete(id: string) {
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--cyan)]">
            Library
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Projects</h1>
          <p className="mt-2 text-[var(--muted)]">Recent generations from this machine.</p>
        </div>
        <Link to="/wizard" className="btn btn-primary shrink-0">
          New forge
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {loading && (
        <p className="mt-12 text-sm text-[var(--muted)]">Loading projects…</p>
      )}

      {error && (
        <p className="mt-8 rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="mt-16 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-[var(--muted)]" strokeWidth={1.5} />
          <p className="mt-4 text-[var(--muted)]">No projects yet. Forge your first API.</p>
          <Link to="/wizard" className="btn btn-ghost mt-6">
            Open wizard
          </Link>
        </div>
      )}

      <ul className="mt-10 space-y-0">
        {projects.map((project, i) => (
          <motion.li
            key={project.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center justify-between gap-4 border-b border-[var(--border)]/70 py-5"
          >
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold">{project.name}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {STACK_LABELS[project.stack as GeneratedStack] ?? project.stack}
                <span className="mx-2 text-[var(--border-strong)]">·</span>
                {new Date(project.createdAt).toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-danger px-3 py-2"
              aria-label={`Delete ${project.name}`}
              onClick={() => void onDelete(project.id)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
