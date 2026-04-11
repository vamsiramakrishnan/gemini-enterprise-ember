// ─── Chip types ──────────────────────────────────────────────────────
export {
  CHIP_CONFIG,
  CHIP_COLORS,
  CHIP_ICONS,
  CHIP_ACCENTS,
  CHIP_TYPES,
  CHIP_TO_NODE_TYPE,
  NODE_COLORS,
  NODE_ICONS,
  ADK_CONSTRUCT,
  TYPE_OPTIONS,
  CREATE_CARDS,
} from './chipConfig';
export type { ChipTypeConfig, ChipColorPalette } from './chipConfig';

// ─── Guard kinds ─────────────────────────────────────────────────────
export { GUARD_CONFIG, GUARD_KINDS, GUARD_OPTIONS, GUARD_PHASES } from './guardConfig';
export type { GuardKindConfig } from './guardConfig';

// ─── Trigger types ───────────────────────────────────────────────────
export { TRIGGER_CONFIG, TRIGGER_TYPES, TRIGGER_OPTIONS } from './triggerConfig';
export type { TriggerTypeConfig, TriggerType, TriggerFormField } from './triggerConfig';

// ─── Status types ────────────────────────────────────────────────────
export { CHIP_STATUS_CONFIG, VERSION_STATUS_CONFIG, STATUS_COLORS } from './statusConfig';
export type { StatusConfig } from './statusConfig';

// ─── Connector visual identity ───────────────────────────────────────
export { CONNECTOR_VISUALS, DEFAULT_CONNECTOR_VISUAL, getConnectorVisual } from './connectorConfig';
export type { ConnectorVisualConfig } from './connectorConfig';
