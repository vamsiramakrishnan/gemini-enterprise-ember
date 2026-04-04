/**
 * ReviewThread -- Comment thread attachable to specific lines or chips
 * in the chip-aware diff view (Screen 10).
 *
 * Threads can target a specific @chip or a diff line number. Comments
 * support reply chains and a "Resolve" action for review workflows.
 *
 * Maps to the review workflow described in the versioning spec:
 *   - Comments attach to specific lines/chips, not just line numbers
 *   - Reviewers can "Approve", "Request Changes", or add feedback
 *   - Resolved threads collapse but remain accessible
 */

import { useState } from 'react';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipType } from '../../parser/types';

// ─── Types ───────────────────────────────────────────────────────────

interface Comment {
  id: string;
  author: {
    name: string;
    avatarInitial: string;
    avatarColor: string;
  };
  timestamp: string;
  text: string;
}

export interface ReviewThreadProps {
  /** Optional chip name the thread is attached to (e.g. "slack") */
  chipName?: string;
  /** Optional chip type for color coding (e.g. "connector") */
  chipType?: ChipType;
  /** Optional diff line content the thread is attached to */
  lineContent?: string;
  /** Optional line number in the diff */
  lineNumber?: number;
  /** Called when the thread is resolved */
  onResolve?: () => void;
  /** Called when the thread is dismissed / collapsed */
  onDismiss?: () => void;
}

// ─── Sample Data ─────────────────────────────────────────────────────

const SAMPLE_COMMENTS_GUARD: Comment[] = [
  {
    id: 'c1',
    author: { name: 'Priya Sharma', avatarInitial: 'P', avatarColor: '#7C3AED' },
    timestamp: '2 hours ago',
    text: 'Are we sure we want to remove @guard(legacy-filter)? It catches edge cases in the APAC flow where claims have missing jurisdiction codes.',
  },
  {
    id: 'c2',
    author: { name: 'Wei Chen', avatarInitial: 'W', avatarColor: '#2563EB' },
    timestamp: '1 hour ago',
    text: 'Good point -- I\'ve added a replacement check in @guard(apac-compliance-rules) that covers those cases. The new guard also validates against the updated MAS guidelines. See line 34 in the diff.',
  },
];

const SAMPLE_COMMENTS_CONNECTOR: Comment[] = [
  {
    id: 'c3',
    author: { name: 'Vamsi K', avatarInitial: 'V', avatarColor: '#D97706' },
    timestamp: '45 min ago',
    text: 'The Slack connector rate limit is ~10 req/min. For the escalation channel, this should be fine, but if we add more notification triggers we may need to request a higher quota.',
  },
];

function getDefaultComments(chipName?: string, chipType?: string): Comment[] {
  if (chipType === 'guard' || chipName === 'legacy-filter') {
    return SAMPLE_COMMENTS_GUARD;
  }
  if (chipType === 'connector' || chipName === 'slack') {
    return SAMPLE_COMMENTS_CONNECTOR;
  }
  return [SAMPLE_COMMENTS_GUARD[0]];
}

// ─── Avatar ──────────────────────────────────────────────────────────

function ThreadAvatar({ initial, color }: { initial: string; color: string }) {
  return (
    <span
      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
      style={{ background: color }}
    >
      {initial}
    </span>
  );
}

// ─── Inline Chip Render ──────────────────────────────────────────────

function InlineChip({ type, name }: { type: ChipType; name: string }) {
  const colors = CHIP_COLORS[type];
  const icon = CHIP_ICONS[type];
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
      style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
    >
      <span style={{ color: colors.accent }}>{icon}</span> {name}
    </span>
  );
}

// ─── Comment Bubble ──────────────────────────────────────────────────

function CommentBubble({ comment }: { comment: Comment }) {
  // Render comment text with inline chip references
  const renderText = (text: string) => {
    const parts = text.split(/(@\w+\([^)]+\))/g);
    return parts.map((part, i) => {
      const chipMatch = part.match(/@(\w+)\(([^)]+)\)/);
      if (chipMatch) {
        const type = chipMatch[1] as ChipType;
        const name = chipMatch[2];
        if (CHIP_COLORS[type]) {
          return <InlineChip key={i} type={type} name={name} />;
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex gap-2.5 group">
      <ThreadAvatar
        initial={comment.author.avatarInitial}
        color={comment.author.avatarColor}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-gray-800">
            {comment.author.name}
          </span>
          <span className="text-[10px] text-gray-400">{comment.timestamp}</span>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">
          {renderText(comment.text)}
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function ReviewThread({
  chipName,
  chipType,
  lineContent,
  lineNumber,
  onResolve,
  onDismiss,
}: ReviewThreadProps) {
  const [comments, setComments] = useState<Comment[]>(() =>
    getDefaultComments(chipName, chipType),
  );
  const [newComment, setNewComment] = useState('');
  const [resolved, setResolved] = useState(false);

  const accentColor = chipType ? CHIP_COLORS[chipType]?.accent : '#6B7280';

  const handleAddComment = () => {
    if (newComment.trim() === '') return;
    const comment: Comment = {
      id: `c-${Date.now()}`,
      author: { name: 'You', avatarInitial: 'Y', avatarColor: '#1A73E8' },
      timestamp: 'Just now',
      text: newComment.trim(),
    };
    setComments((prev) => [...prev, comment]);
    setNewComment('');
  };

  const handleResolve = () => {
    setResolved(true);
    onResolve?.();
  };

  const handleReopen = () => {
    setResolved(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAddComment();
    }
  };

  // ── Header label ──
  const headerLabel = chipName && chipType ? (
    <span className="flex items-center gap-1.5">
      Comment on <InlineChip type={chipType} name={chipName} />
    </span>
  ) : lineNumber != null ? (
    <span className="text-xs text-gray-600">
      Comment on <span className="font-mono text-gray-500">line {lineNumber}</span>
    </span>
  ) : (
    <span className="text-xs text-gray-600">General comment</span>
  );

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all duration-200 ${
        resolved
          ? 'border-gray-200 bg-gray-50/50 opacity-75'
          : 'border-gray-200 bg-white shadow-sm'
      }`}
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: resolved ? '#D1D5DB' : accentColor,
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          {headerLabel}
          {resolved ? (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">
              Resolved
            </span>
          ) : (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
              Open
            </span>
          )}
          <span className="text-[10px] text-gray-400">
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!resolved ? (
            <button
              onClick={handleResolve}
              className="text-[10px] font-medium px-2 py-1 rounded-md text-green-700 hover:bg-green-50 transition-colors"
            >
              Resolve
            </button>
          ) : (
            <button
              onClick={handleReopen}
              className="text-[10px] font-medium px-2 py-1 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Reopen
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="w-5 h-5 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors text-[10px]"
              aria-label="Dismiss"
            >
              x
            </button>
          )}
        </div>
      </div>

      {/* ── Line context (if provided) ─────────────────────────── */}
      {lineContent && (
        <div className="px-4 py-2 bg-gray-50/80 border-b border-gray-100">
          <code className="text-[10px] text-gray-500 font-mono leading-relaxed block truncate">
            {lineNumber != null && (
              <span className="text-gray-400 mr-2 select-none">{lineNumber}</span>
            )}
            {lineContent}
          </code>
        </div>
      )}

      {/* ── Comments ───────────────────────────────────────────── */}
      <div className="px-4 py-3 space-y-4">
        {comments.map((comment) => (
          <CommentBubble key={comment.id} comment={comment} />
        ))}
      </div>

      {/* ── Add comment input ──────────────────────────────────── */}
      {!resolved && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/30">
          <div className="flex gap-2">
            <ThreadAvatar initial="Y" color="#1A73E8" />
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a comment... (Cmd+Enter to submit)"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]/20 bg-white placeholder-gray-400 resize-none"
                rows={2}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-gray-400">
                  Supports @chip(name) references
                </span>
                <button
                  onClick={handleAddComment}
                  disabled={newComment.trim() === ''}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                    newComment.trim() === ''
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#1A73E8] text-white hover:bg-[#1557B0] shadow-sm'
                  }`}
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
