import type { DbEngine } from '../types';
import { ENGINE_LABELS } from '../types';
import { Cylinder, Database, HardDrive, Server } from 'lucide-react';

const ENGINES: {
  id: DbEngine;
  icon: typeof Database;
  hint: string;
}[] = [
  { id: 'postgresql', icon: Database, hint: 'Port 5432' },
  { id: 'mysql', icon: Cylinder, hint: 'Port 3306' },
  { id: 'sqlserver', icon: Server, hint: 'Port 1433' },
  { id: 'sqlite', icon: HardDrive, hint: 'Local file' },
];

interface EnginePickerProps {
  value: DbEngine;
  onChange: (engine: DbEngine) => void;
}

export function EnginePicker({ value, onChange }: EnginePickerProps) {
  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      role="radiogroup"
      aria-label="Database engine"
    >
      {ENGINES.map(({ id, icon: Icon, hint }) => {
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(id)}
            className={[
              'flex flex-col items-start gap-2 rounded-lg border px-3 py-3 text-left transition-all',
              selected
                ? 'border-[var(--cyan)] bg-[var(--cyan-glow)] shadow-[0_0_0_1px_var(--cyan)]'
                : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-strong)]',
            ].join(' ')}
          >
            <Icon
              className={selected ? 'h-5 w-5 text-[var(--cyan)]' : 'h-5 w-5 text-[var(--muted)]'}
              strokeWidth={1.75}
            />
            <span>
              <span className="block text-sm font-semibold">{ENGINE_LABELS[id]}</span>
              <span className="block text-xs text-[var(--muted)]">{hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
