/**
 * StatusBadge — re-exports the canonical StatusBadge from ui/Badge.
 *
 * This file previously contained a standalone implementation.
 * It now delegates to the shared Badge primitive for consistency.
 * Any existing imports from this path continue to work.
 */

export { StatusBadge } from '../../ui/Badge';
