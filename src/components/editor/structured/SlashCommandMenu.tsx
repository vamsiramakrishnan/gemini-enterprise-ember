/**
 * SlashCommandMenu — Notion-style "/" command palette for inserting blocks.
 *
 * Triggered by typing "/" in an instruction block or in the add-block affordance.
 * Categories: Blocks | Sections | Patterns | Advanced
 *
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

const CATEGORY_LABELS: Record<string, string> = {
  blocks: 'Blocks',
  sections: 'Sections',
  patterns: 'Patterns',
  advanced: 'Advanced',
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
      className="fixed z-[9999] rounded-xl overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        width: 340,
        maxHeight: 400,
        background: '#fff',
        border: '1px solid #E5E7EB',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        backdropFilter: 'blur(8px)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280' }}>Insert block</span>
        <span style={{ fontSize: 10, color: '#9CA3AF', marginLeft: 'auto' }}>↑↓ navigate · ↵ select · esc close</span>
      </div>

      {/* Scrollable list */}
      <div style={{ overflowY: 'auto', maxHeight: 340 }}>
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            {/* Category label */}
            <div style={{
              padding: '6px 12px 2px',
              fontSize: 10,
              fontWeight: 600,
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              position: 'sticky',
              top: 0,
              background: '#fff',
              zIndex: 1,
            }}>
              {CATEGORY_LABELS[category] ?? category}
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
                    gap: 10,
                    width: '100%',
                    padding: '7px 12px',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: isActive ? '#F3F4F6' : 'transparent',
                    transition: 'background 80ms',
                  }}
                >
                  {/* Icon */}
                  <span style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 600,
                    color: item.color,
                    background: `${item.color}12`,
                    flexShrink: 0,
                  }}>
                    {item.icon}
                  </span>
                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#1F2937', lineHeight: 1.3 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.description}
                    </div>
                  </div>
                  {/* adk-fluent badge */}
                  {item.adkConstruct && (
                    <span style={{
                      fontSize: 9,
                      fontFamily: 'var(--font-mono, monospace)',
                      color: '#A3A3A3',
                      background: '#F9FAFB',
                      padding: '2px 5px',
                      borderRadius: 4,
                      whiteSpace: 'nowrap',
                      maxWidth: 100,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flexShrink: 0,
                    }}>
                      {item.adkConstruct}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export type { SlashCommandItem, BlockType, SectionType };
