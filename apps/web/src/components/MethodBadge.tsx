import type { EndpointPreview } from '../types';

const COLORS: Record<EndpointPreview['method'], string> = {
  GET: 'text-[#3dffa8] border-[#3dffa8]/40 bg-[#3dffa8]/10',
  POST: 'text-[var(--cyan)] border-[var(--cyan)]/40 bg-[var(--cyan)]/10',
  PUT: 'text-[#ffc857] border-[#ffc857]/40 bg-[#ffc857]/10',
  PATCH: 'text-[#ffc857] border-[#ffc857]/40 bg-[#ffc857]/10',
  DELETE: 'text-[var(--danger)] border-[var(--danger)]/40 bg-[var(--danger)]/10',
};

interface MethodBadgeProps {
  method: EndpointPreview['method'];
}

export function MethodBadge({ method }: MethodBadgeProps) {
  return (
    <span
      className={[
        'inline-flex min-w-[4.25rem] items-center justify-center rounded border px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wider',
        COLORS[method],
      ].join(' ')}
    >
      {method}
    </span>
  );
}
