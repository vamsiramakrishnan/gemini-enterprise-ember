/**
 * SlashCommandMenu — Notion-style "/" command palette for inserting blocks.
 *
 * Design: Calm, informative, fast. Every item teaches what it does.
 * The menu feels like an extension of your thought — not an interruption.
 *
 * Categories: Blocks | Sections | Patterns | Advanced
 * Maps to adk-fluent constructs — each item shows the Python expression it generates.
 */

import { useState, useRef, useEffect } from 'react';
import { SLASH_COMMANDS, type SlashCommandItem, type BlockType, type SectionType } from '../../../data/blocks';

interface SlashCommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: SlashCommandItem) => void;
  position: { top: number; left: number };
  filterText?: string;
}

const CATEGORY_LABELS: Record<string, { label: string; hint: string }> = {
  blocks:   { label: 'Blocks',   hint: 'Individual adk-fluent constructs' },
  sections: { label: 'Sections', hint: 'Semantic groupings for your playbook' },
  patterns: { label: 'Patterns', hint: 'Pre-built multi-agent workflows' },
  advanced: { label: 'Advanced', hint: 'Power user features' },
};

export function SlashCommandMenu({ isOpen, onClose, onSelect, position, filterText = '' }: SlashCommandMenuProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Filter commands
  const filtered = SLASH_COMMANDS.filter(cmd => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return cmd.label.toLowerCase().includes(q) ||
           cmd.description.toLowerCase().includes(q) ||
           cmd.id.includes(q);
  });

  // Group by category
  const grouped = filtered.reduce<Record<string, SlashCommandItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  // Flat list for keyboard navigation
  const flatItems = Object.values(grouped).flat();

  // Reset index when filter changes
  useEffect(() => { setActiveIndex(0); }, [filterText]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex(i => Math.min(i + 1, flatItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatItems[activeIndex]) onSelect(flatItems[activeIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, activeIndex, flatItems, onSelect, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const el = itemRefs.current.get(activeIndex);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  if (!isOpen || flatItems.length === 0) return null;

  let globalIndex = 0;

  return (
    <div
      ref={menuRef}
      className="se-slash-menu"
      style={{
        position: 'fixed',
        zIndex: 9999,
        top: position.top,
        left: position.left,
        width: 380,
        maxHeight: 440,
        background: '#FFFFFF',
        border: '1px solid #E8EAED',
        boxShadow: '0 8px 28px rgba(60,64,67,0.12), 0 2px 8px rgba(60,64,67,0.06)',
        borderRadius: 14,
        fontFamily: 'var(--font-ui, "Google Sans", sans-serif)',
        overflow: 'hidden',
        animation: 'se-scaleIn 150ms ease-out',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid #F1F3F4',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#5F6368', letterSpacing: '0.02em' }}>
          Insert block
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#9AA0A6', display: 'flex', alignItems: 'center', gap: 4 }}>
            <kbd style={{ padding: '0px 3px', borderRadius: 3, border: '1px solid #E8EAED', background: '#F8F9FA', fontSize: 9 }}>↑↓</kbd>
            <kbd style={{ padding: '0px 3px', borderRadius: 3, border: '1px solid #E8EAED', background: '#F8F9FA', fontSize: 9 }}>↵</kbd>
            <kbd style={{ padding: '0px 3px', borderRadius: 3, border: '1px solid #E8EAED', background: '#F8F9FA', fontSize: 9 }}>esc</kbd>
          </span>
        </div>
      </div>

      {/* Scrollable list */}
      <div style={{ overflowY: 'auto', maxHeight: 380, padding: '4px 0' }}>
        {Object.entries(grouped).map(([category, items]) => {
          const catMeta = CATEGORY_LABELS[category];
          return (
            <div key={category}>
              {/* Category label */}
              <div style={{
                padding: '10px 16px 4px',
                display: 'flex', alignItems: 'baseline', gap: 8,
                position: 'sticky', top: 0, background: '#fff', zIndex: 1,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: '#9AA0A6',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {catMeta?.label ?? category}
                </span>
                <span style={{ fontSize: 10, color: '#DADCE0', fontWeight: 400 }}>
                  {catMeta?.hint ?? ''}
                </span>
              </div>
              {items.map((item) => {
                const idx = globalIndex++;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={item.id}
                    ref={el => { if (el) itemRefs.current.set(idx, el); }}
                    onClick={() => onSelect(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '8px 16px',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      background: isActive ? '#F1F3F4' : 'transparent',
                      transition: 'background 100ms',
                      borderRadius: 0,
                    }}
                  >
                    {/* Icon */}
                    <span style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 15,
                      color: item.color,
                      background: `${item.color}10`,
                      flexShrink: 0,
                      transition: 'transform 150ms',
                      transform: isActive ? 'scale(1.05)' : 'scale(1)',
                    }}>
                      {item.icon}
                    </span>
                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500, lineHeight: 1.3,
                        color: isActive ? '#1F1F1F' : '#3C4043',
                      }}>
                        {item.label}
                      </div>
                      <div style={{
                        fontSize: 11, color: '#5F6368', lineHeight: 1.4, marginTop: 1,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {item.description}
                      </div>
                    </div>
                    {/* adk-fluent construct badge */}
                    {item.adkConstruct && (
                      <span style={{
                        fontSize: 9,
                        fontFamily: 'var(--font-mono, "Roboto Mono", monospace)',
                        color: isActive ? '#5F6368' : '#9AA0A6',
                        background: isActive ? '#E8EAED' : '#F8F9FA',
                        padding: '2px 6px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                        maxWidth: 120,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flexShrink: 0,
                        transition: 'all 100ms',
                      }}>
                        {item.adkConstruct}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}

        {/* No results state */}
        {flatItems.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#5F6368', marginBottom: 4 }}>No matching blocks</div>
            <div style={{ fontSize: 11, color: '#9AA0A6' }}>Try a different search term</div>
          </div>
        )}
      </div>
    </div>
  );
}

export type { SlashCommandItem, BlockType, SectionType };
