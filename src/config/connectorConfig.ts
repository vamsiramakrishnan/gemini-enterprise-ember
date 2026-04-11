/**
 * connectorConfig — Visual identity registry for connector providers.
 *
 * To add a new connector (e.g., 'monday'):
 *   1. Add a ConnectorEntry in data/connectors.ts
 *   2. Add one entry here for its visual identity
 *   3. Done — ConnectorHub, autocomplete, and badges all derive automatically.
 *
 * Note: ConnectorEntry data (entities, actions, auth) lives in data/connectors.ts.
 * This file only holds VISUAL config (abbreviation, brand colors) that the UI
 * uses to render connector badges and cards.
 */

export interface ConnectorVisualConfig {
  /** 1-2 letter abbreviation (e.g., "GD" for Google Drive) */
  abbr: string;
  /** Brand background color */
  bg: string;
  /** Brand foreground/text color */
  fg: string;
}

/** Fallback for unknown connectors. */
export const DEFAULT_CONNECTOR_VISUAL: ConnectorVisualConfig = {
  abbr: '??',
  bg: '#F3F4F6',
  fg: '#6B7280',
};

/** Visual identity for each connector provider. */
export const CONNECTOR_VISUALS: Record<string, ConnectorVisualConfig> = {
  // Google-native
  'google-drive':    { abbr: 'GD', bg: '#E8F0FE', fg: '#1A73E8' },
  'gmail':           { abbr: 'GM', bg: '#FCE8E6', fg: '#D93025' },
  'google-calendar': { abbr: 'GC', bg: '#E6F4EA', fg: '#1E8E3E' },
  'bigquery':        { abbr: 'BQ', bg: '#E8F0FE', fg: '#1A73E8' },
  'cloud-storage':   { abbr: 'CS', bg: '#E8F0FE', fg: '#4285F4' },
  'spanner':         { abbr: 'SP', bg: '#FEF7E0', fg: '#F9AB00' },
  'firestore':       { abbr: 'FS', bg: '#FEF7E0', fg: '#F9AB00' },
  'bigtable':        { abbr: 'BT', bg: '#E8F0FE', fg: '#4285F4' },
  'alloydb':         { abbr: 'AD', bg: '#E8EAF6', fg: '#3F51B5' },
  'cloud-sql':       { abbr: 'SQ', bg: '#E8F0FE', fg: '#4285F4' },
  'google-sites':    { abbr: 'GS', bg: '#E8F0FE', fg: '#4285F4' },
  'google-groups':   { abbr: 'GG', bg: '#E8F0FE', fg: '#4285F4' },

  // Third-party
  'jira':            { abbr: 'J',  bg: '#E3F2FD', fg: '#0052CC' },
  'salesforce':      { abbr: 'SF', bg: '#E3F2FD', fg: '#00A1E0' },
  'slack':           { abbr: 'SL', bg: '#F3E5F5', fg: '#611F69' },
  'confluence':      { abbr: 'CF', bg: '#E3F2FD', fg: '#0052CC' },
  'servicenow':      { abbr: 'SN', bg: '#E8F5E9', fg: '#2E7D32' },
  'sharepoint':      { abbr: 'SP', bg: '#E3F2FD', fg: '#036C70' },
  'onedrive':        { abbr: 'OD', bg: '#E3F2FD', fg: '#0078D4' },
  'outlook':         { abbr: 'OL', bg: '#E3F2FD', fg: '#0078D4' },
  'box':             { abbr: 'BX', bg: '#E3F2FD', fg: '#0061D5' },
  'dropbox':         { abbr: 'DB', bg: '#E8F0FE', fg: '#0061FF' },
  'github':          { abbr: 'GH', bg: '#F3F4F6', fg: '#24292F' },
  'hubspot':         { abbr: 'HS', bg: '#FFF3E0', fg: '#FF7043' },
  'monday':          { abbr: 'MN', bg: '#E8F5E9', fg: '#00CA72' },
};

/** Look up a connector's visual config with fallback. */
export function getConnectorVisual(connectorId: string): ConnectorVisualConfig {
  return CONNECTOR_VISUALS[connectorId] ?? DEFAULT_CONNECTOR_VISUAL;
}
