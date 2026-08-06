interface CodePanelProps {
  path?: string;
  content: string;
  emptyMessage?: string;
}

export function CodePanel({ path, content, emptyMessage = 'Select a file to preview' }: CodePanelProps) {
  if (!content) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg)]/60 text-sm text-[var(--muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[#0a0c12]">
      {path && (
        <div className="flex items-center border-b border-[var(--border)] px-3 py-2">
          <span className="mono truncate text-[var(--cyan-dim)]">{path}</span>
        </div>
      )}
      <pre className="mono scrollbar-thin flex-1 overflow-auto p-4 text-[var(--fg)]/90 whitespace-pre">
        {content}
      </pre>
    </div>
  );
}
