import { StepNav } from '../components/StepNav';
import type { GenerateConfig, GeneratedStack } from '../types';
import { STACK_LABELS } from '../types';

interface StackStepProps {
  config: GenerateConfig;
  onChange: (patch: Partial<GenerateConfig>) => void;
  onBack: () => void;
  onNext: () => void;
}

const STACKS: { id: GeneratedStack; blurb: string }[] = [
  { id: 'net-minimal', blurb: 'Lean .NET 8 endpoints, minimal ceremony' },
  { id: 'net-webapi', blurb: 'Controllers, filters, classic Web API shape' },
  { id: 'node-express', blurb: 'Battle-tested Express with typed routes' },
  { id: 'node-fastify', blurb: 'High-throughput Fastify with schema hooks' },
];

export function StackStep({ config, onChange, onBack, onNext }: StackStepProps) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold tracking-tight">Stack</h2>
      <p className="mt-2 text-[var(--muted)]">Pick the runtime and project defaults.</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Generated stack">
        {STACKS.map((stack) => {
          const selected = config.stack === stack.id;
          return (
            <button
              key={stack.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange({ stack: stack.id })}
              className={[
                'rounded-lg border px-4 py-5 text-left transition-all',
                selected
                  ? 'border-[var(--cyan)] bg-[var(--cyan-glow)] shadow-[0_0_0_1px_var(--cyan)]'
                  : 'border-[var(--border)] hover:border-[var(--border-strong)]',
              ].join(' ')}
            >
              <span className="font-display block text-lg font-bold tracking-tight">
                {STACK_LABELS[stack.id]}
              </span>
              <span className="mt-1 block text-sm text-[var(--muted)]">{stack.blurb}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="project-name">
            Project name
          </label>
          <input
            id="project-name"
            className="field"
            value={config.projectName}
            onChange={(e) => onChange({ projectName: e.target.value })}
            placeholder="my-api"
          />
        </div>
        <div>
          <label className="label" htmlFor="port">
            Port
          </label>
          <input
            id="port"
            type="number"
            className="field"
            value={config.port}
            onChange={(e) => onChange({ port: Number(e.target.value) || 3000 })}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.includeSwagger}
            onChange={(e) => onChange({ includeSwagger: e.target.checked })}
            className="accent-[var(--cyan)]"
          />
          OpenAPI / Swagger
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.includeDocker}
            onChange={(e) => onChange({ includeDocker: e.target.checked })}
            className="accent-[var(--cyan)]"
          />
          Dockerfile
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.includePagination}
            onChange={(e) => onChange({ includePagination: e.target.checked })}
            className="accent-[var(--cyan)]"
          />
          Pagination helpers
        </label>
      </div>

      <StepNav
        onBack={onBack}
        onNext={onNext}
        nextDisabled={!config.projectName.trim()}
        nextLabel="Preview"
      />
    </div>
  );
}
