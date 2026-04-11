/**
 * QuickView — Inspect any @referenced asset without leaving the editor.
 *
 * Opens as a right-side Drawer showing the asset's details, version,
 * usage, and a preview of its configuration. Users stay in the editor
 * context — they can see the playbook behind the drawer.
 *
 * This replaces the "click chip → navigate to Registry" pattern with
 * an in-context inspection model (like Linear's issue peek or
 * Notion's page preview).
 */

import { useMemo } from 'react';
import { Drawer } from '../../ui/Drawer';
import { Button, Badge, StatusBadge } from '../../ui';
import { CHIP_CONFIG } from '../../config/chipConfig';
import type { ChipType } from '../../parser/types';
import { findChip } from '../../data/registry';

interface QuickViewProps {
  open: boolean;
  onClose: () => void;
  chipType: ChipType | null;
  chipName: string | null;
}

export function QuickView({ open, onClose, chipType, chipName }: QuickViewProps) {
  const chip = useMemo(() => {
    if (!chipType || !chipName) return null;
    return findChip(chipType, chipName);
  }, [chipType, chipName]);

  const config = chipType ? CHIP_CONFIG[chipType] : null;

  if (!chipType || !chipName) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="md"
      title={chip ? `@${chipType}(${chipName})` : `@${chipType}(${chipName})`}
      subtitle={config?.label}
      footer={
        <div className="flex items-center gap-2 w-full">
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Open in Registry
          </Button>
        </div>
      }
    >
      {chip ? (
        <div className="space-y-5">
          {/* Identity */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-md)',
                background: config?.colors.tint,
                color: config?.colors.text,
                fontSize: 16,
              }}
            >
              {config?.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.01em',
              }}>
                {chip.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                {chip.registryId}
              </div>
            </div>
            <StatusBadge status={chip.status} />
          </div>

          {/* Description */}
          <div>
            <div className="text-section-label" style={{ marginBottom: 6 }}>Description</div>
            <p style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              margin: 0,
            }}>
              {chip.description}
            </p>
          </div>

          {/* Metadata grid */}
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: 'repeat(2, 1fr)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border)',
            }}
          >
            {[
              { label: 'Version', value: `v${chip.version}` },
              { label: 'Owner', value: chip.owner },
              { label: 'Permission', value: chip.permissions.currentUser },
              { label: 'Usage', value: `${chip.usageCount} playbooks` },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginTop: 2 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Type-specific details */}
          {chip.endpoint && (
            <div>
              <div className="text-section-label" style={{ marginBottom: 6 }}>Endpoint</div>
              <code style={{
                display: 'block',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-secondary)',
                background: 'var(--color-surface-1)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                wordBreak: 'break-all',
              }}>
                {chip.endpoint}
              </code>
            </div>
          )}

          {chip.healthStatus && (
            <div className="flex items-center gap-2">
              <div className="text-section-label">Health</div>
              <Badge
                dot={chip.healthStatus === 'healthy' ? 'var(--color-success)' : chip.healthStatus === 'degraded' ? '#EAB308' : 'var(--color-unresolved)'}
                color={chip.healthStatus === 'healthy' ? 'var(--color-success)' : chip.healthStatus === 'degraded' ? '#92400E' : 'var(--color-unresolved)'}
              >
                {chip.healthStatus}
              </Badge>
            </div>
          )}

          {/* adk-fluent reference */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
              adk-fluent construct
            </div>
            <code style={{
              fontSize: 13,
              fontFamily: 'var(--font-mono)',
              color: config?.colors.accent,
              fontWeight: 500,
            }}>
              {config?.adkConstruct}
            </code>
          </div>
        </div>
      ) : (
        /* Unresolved reference */
        <div className="space-y-4">
          <div
            style={{
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-unresolved)', marginBottom: 4 }}>
              Unresolved Reference
            </div>
            <div style={{ fontSize: 12, color: '#991B1B' }}>
              @{chipType}({chipName}) is not in the registry.
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={onClose}
              className="mt-3"
            >
              Create this asset
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
