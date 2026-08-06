import { ArrowLeft, ArrowRight } from 'lucide-react';

interface StepNavProps {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  hideBack?: boolean;
}

export function StepNav({
  onBack,
  onNext,
  nextLabel = 'Continue',
  backLabel = 'Back',
  nextDisabled,
  nextLoading,
  hideBack,
}: StepNavProps) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-[var(--border)]/80 pt-6">
      {!hideBack && onBack ? (
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </button>
      ) : (
        <span />
      )}
      {onNext && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={onNext}
          disabled={nextDisabled || nextLoading}
        >
          {nextLoading ? 'Working…' : nextLabel}
          {!nextLoading && <ArrowRight className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
