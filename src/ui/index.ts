/**
 * UI Primitives — The shared component library.
 *
 * Import from here: `import { Button, Card, Badge } from '@/ui'`
 * These are the only components allowed to set visual styling directly.
 * Feature components should compose these, not reinvent them.
 */

export { Button } from './Button';
export { TextInput, TextArea, Select, Field } from './Input';
export { Card } from './Card';
export { Modal } from './Modal';
export { Badge, StatusBadge } from './Badge';
export { Tabs } from './Tabs';
export { Kbd } from './Kbd';
export { Spinner } from './Spinner';
export { EmptyState } from './EmptyState';
export { ErrorBoundary, RouteErrorBoundary } from './ErrorBoundary';
export { Skeleton, SkeletonCard, SkeletonText } from './Skeleton';
export { Drawer } from './Drawer';

// ComponentErrorBoundary available via direct import when needed:
// import { ComponentErrorBoundary } from '../ui/ErrorBoundary';
