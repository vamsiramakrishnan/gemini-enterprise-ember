/**
 * Input & Textarea — Shared form input primitives.
 *
 * Consistent styling, focus rings, and label support.
 */

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';

// ─── Field wrapper ───────────────────────────────────────────────────

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, children, className = '' }: FieldProps) {
  return (
    <div className={`mb-3.5 ${className}`}>
      {label && (
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] mb-1">
          {label}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-[11px] text-[var(--color-unresolved)]">{error}</p>
      )}
    </div>
  );
}

// ─── Input ───────────────────────────────────────────────────────────

type InputSize = 'sm' | 'md';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  inputSize?: InputSize;
}

const inputSizeStyles: Record<InputSize, string> = {
  sm: 'px-2 py-1.5 text-[12px]',
  md: 'px-2.5 py-2 text-[13px]',
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ inputSize = 'md', className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={[
          'w-full rounded-lg border border-[var(--color-border)] bg-white',
          'outline-none transition-colors duration-150',
          'focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-light)]',
          'placeholder:text-[var(--color-text-tertiary)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          inputSizeStyles[inputSize],
          className,
        ].join(' ')}
        {...props}
      />
    );
  },
);

TextInput.displayName = 'TextInput';

// ─── Textarea ────────────────────────────────────────────────────────

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  inputSize?: InputSize;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ inputSize = 'md', className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={[
          'w-full rounded-lg border border-[var(--color-border)] bg-white resize-vertical',
          'outline-none transition-colors duration-150',
          'focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-light)]',
          'placeholder:text-[var(--color-text-tertiary)]',
          inputSizeStyles[inputSize],
          className,
        ].join(' ')}
        {...props}
      />
    );
  },
);

TextArea.displayName = 'TextArea';

// ─── Select ──────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  inputSize?: InputSize;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ inputSize = 'md', className = '', children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={[
          'w-full rounded-lg border border-[var(--color-border)] bg-white',
          'outline-none transition-colors duration-150',
          'focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-light)]',
          inputSizeStyles[inputSize],
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </select>
    );
  },
);

Select.displayName = 'Select';
