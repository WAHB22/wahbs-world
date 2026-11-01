import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const control =
  'min-h-12 w-full min-w-0 rounded-[var(--radius-md)] border border-rule bg-paper px-3.5 text-base text-ink-strong placeholder:text-ink-mute transition-[border-color,box-shadow] duration-150 focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/25 aria-[invalid=true]:border-vase';

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  children: (id: string, describedBy: string | undefined) => ReactNode;
  className?: string;
}

/** Label + control + hint/error, wired for screen readers. */
export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const describedBy = error || hint ? hintId : undefined;
  return (
    <div className={cn('mt-4 first:mt-1', className)}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-soft">
        {label}
      </label>
      {children(id, describedBy)}
      {(error || hint) && (
        <p id={hintId} role={error ? 'alert' : undefined} className={cn('mt-1.5 text-sm', error ? 'text-vase' : 'text-ink-mute')}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(control, className)} {...props} />;
});

/** Money input: decimal keyboard on phones, tabular figures. */
export const MoneyInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>>(function MoneyInput(
  { className, ...props },
  ref,
) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute">$</span>
      <input ref={ref} type="text" inputMode="decimal" autoComplete="off" className={cn(control, 'num pl-7', className)} {...props} />
    </div>
  );
});

/** Native select: the phone's own picker is the best picker. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(control, 'appearance-none pr-10', className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-ink-mute" aria-hidden />
    </div>
  );
});

/** Segmented choice as chips (e.g. Visa / Chequing / Not sure). */
export function Choice<T extends string | null>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'min-h-11 rounded-full border px-4 text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97]',
              on ? 'border-cobalt bg-cobalt text-on-cobalt' : 'border-rule bg-surface text-ink-soft hover:border-cobalt/60',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
