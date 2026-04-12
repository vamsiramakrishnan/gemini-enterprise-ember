/**
 * ChipLinker — Component for linking @chip references between editors.
 *
 * Shows linked chips as removable badges + autocomplete input for adding new ones.
 * Filters by chip type. Used by AgentEditor (tools, guards, delegates),
 * GuardEditor (schema ref), etc.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRegistry } from '../../contexts/AppContext';
import { CHIP_CONFIG } from '../../config/chipConfig';
import type { ChipType, SmartChip } from '../../parser/types';

interface ChipLinkerProps {
  /** Filter to specific chip type(s) */
  filterType: ChipType | ChipType[];
  /** Currently linked chip IDs */
  linkedIds: string[];
  /** Called when links change */
  onChange: (ids: string[]) => void;
  /** Allow multiple selections? */
  multiple?: boolean;
  label?: string;
  placeholder?: string;
}

function XIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8">
      <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="flex-shrink-0">
      <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1" fill="none" />
      <path d="M7.5 7.5L10 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function ChipLinker({
  filterType,
  linkedIds,
  onChange,
  multiple = true,
  label,
  placeholder = 'Search assets...',
}: ChipLinkerProps) {
  const { chips } = useRegistry();
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const types = Array.isArray(filterType) ? filterType : [filterType];

  // Filter chips by type and search
  const available = chips.filter((c: SmartChip) => {
    if (!types.includes(c.type)) return false;
    if (linkedIds.includes(c.id)) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const linked = chips.filter((c: SmartChip) => linkedIds.includes(c.id));

  const addChip = useCallback(
    (id: string) => {
      if (multiple) {
        onChange([...linkedIds, id]);
      } else {
        onChange([id]);
      }
      setSearch('');
      setShowDropdown(false);
    },
    [linkedIds, onChange, multiple],
  );

  const removeChip = useCallback(
    (id: string) => {
      onChange(linkedIds.filter((lid) => lid !== id));
    },
    [linkedIds, onChange],
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} className="space-y-2">
      {label && (
        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}>
          {label}
        </div>
      )}

      {/* Linked chips as badges */}
      {linked.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {linked.map((chip) => {
            const cfg = CHIP_CONFIG[chip.type];
            return (
              <span
                key={chip.id}
                className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-md"
                style={{ background: cfg.colors.tint, color: cfg.colors.text, border: `1px solid ${cfg.colors.border}` }}
              >
                <span style={{ fontSize: '9px' }}>{cfg.icon}</span>
                @{chip.type}({chip.name})
                <button
                  onClick={() => removeChip(chip.id)}
                  className="ml-0.5 p-0.5 rounded-full transition-colors hover:bg-black/10"
                >
                  <XIcon />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
          style={{ borderColor: showDropdown ? types[0] && CHIP_CONFIG[types[0]].colors.accent : 'var(--color-border, #E5E7EB)', background: 'var(--color-bg-primary, #F9FAFB)' }}>
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder={placeholder}
            className="flex-1 text-[11px] bg-transparent outline-none"
            style={{ color: 'var(--color-text-primary, #111827)' }}
          />
        </div>

        {/* Dropdown */}
        {showDropdown && available.length > 0 && (
          <div
            className="absolute z-20 w-full mt-1 rounded-lg border shadow-lg overflow-hidden max-h-48 overflow-y-auto"
            style={{ background: 'var(--color-bg-surface, #FFFFFF)', borderColor: 'var(--color-border, #E5E7EB)' }}
          >
            {available.slice(0, 8).map((chip) => {
              const cfg = CHIP_CONFIG[chip.type];
              return (
                <button
                  key={chip.id}
                  onClick={() => addChip(chip.id)}
                  className="w-full px-3 py-2 flex items-center gap-2 text-left transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary, #F3F4F6)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span
                    className="w-5 h-5 rounded flex items-center justify-center text-[10px]"
                    style={{ background: cfg.colors.tint, color: cfg.colors.accent }}
                  >
                    {cfg.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium truncate" style={{ color: 'var(--color-text-primary, #111827)' }}>
                      {chip.name}
                    </div>
                    <div className="text-[10px] truncate" style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}>
                      {chip.description}
                    </div>
                  </div>
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: cfg.colors.bg, color: cfg.colors.text }}>
                    v{chip.version}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
