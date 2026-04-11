/**
 * SegmentedControl — A toggle group for switching between options.
 *
 * Used in editors for: tool kind, guard phase, trigger type, data transform kind, etc.
 * Renders as a horizontal pill group with animated active indicator.
 */

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accentColor?: string;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accentColor = '#4F46E5',
  size = 'sm',
}: SegmentedControlProps<T>) {
  const py = size === 'sm' ? 'py-1' : 'py-1.5';
  const text = size === 'sm' ? 'text-[10px]' : 'text-[11px]';

  return (
    <div
      className="inline-flex rounded-lg p-0.5"
      style={{ background: 'var(--color-bg-tertiary, #F3F4F6)', border: '1px solid var(--color-border, #E5E7EB)' }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`${text} font-medium px-3 ${py} rounded-md transition-all duration-150`}
            style={active
              ? { background: 'var(--color-bg-surface, #FFFFFF)', color: accentColor, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }
              : { color: 'var(--color-text-tertiary, #9CA3AF)' }
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
