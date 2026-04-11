/**
 * ConnectionCard — Auth method + endpoint + credential fields.
 * Used by ToolEditor + ConnectorEditor.
 */

interface ConnectionCardProps {
  endpoint: string;
  onEndpointChange: (v: string) => void;
  authMethod: string;
  onAuthMethodChange: (v: string) => void;
  authUser?: string;
  readOnly?: boolean;
}

export function ConnectionCard({
  endpoint,
  onEndpointChange,
  authMethod,
  onAuthMethodChange,
  authUser,
  readOnly = false,
}: ConnectionCardProps) {
  const inputStyle = {
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    borderColor: 'var(--color-border, #E5E7EB)',
    background: 'var(--color-bg-primary, #F9FAFB)',
    color: 'var(--color-text-primary, #111827)',
  };

  return (
    <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: 'var(--color-border, #E5E7EB)' }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}>
        Connection
      </div>

      {/* Endpoint */}
      <div>
        <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text-secondary, #6B7280)' }}>
          Endpoint URL
        </label>
        <input
          type="text"
          value={endpoint}
          onChange={(e) => onEndpointChange(e.target.value)}
          readOnly={readOnly}
          placeholder="https://api.example.com/v1"
          className="w-full px-3 py-1.5 rounded-lg border"
          style={inputStyle}
        />
      </div>

      {/* Auth method */}
      <div>
        <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text-secondary, #6B7280)' }}>
          Auth Method
        </label>
        <select
          value={authMethod}
          onChange={(e) => onAuthMethodChange(e.target.value)}
          disabled={readOnly}
          className="w-full px-3 py-1.5 rounded-lg border text-[11px]"
          style={{ ...inputStyle, fontFamily: 'var(--font-ui)' }}
        >
          <option value="none">None</option>
          <option value="api-key">API Key</option>
          <option value="oauth">OAuth 2.0</option>
          <option value="service-account">Service Account</option>
        </select>
      </div>

      {/* Auth user (if connected) */}
      {authUser && (
        <div className="flex items-center gap-2 text-[10px] px-3 py-2 rounded-md"
          style={{ background: '#ECFDF5', color: '#059669' }}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Connected as {authUser}
        </div>
      )}
    </div>
  );
}
