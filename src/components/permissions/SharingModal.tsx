/**
 * SharingModal — Screen 4: Google-Docs-style sharing dialog.
 *
 * Mirrors the Google Docs sharing experience applied to agent assets.
 */

import { useState } from 'react';
import { useNotifications } from '../../contexts/AppContext';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';

interface SharedUser {
  name: string;
  email: string;
  avatar: string;
  role: 'Viewer' | 'Invoker' | 'Editor' | 'Admin';
  inherited?: string;
}

const SHARED_USERS: SharedUser[] = [
  { name: 'Priya Sharma', email: 'priya@acme.com', avatar: 'PS', role: 'Admin' },
  { name: 'Vamsi K', email: 'vamsi@acme.com', avatar: 'VK', role: 'Editor' },
  { name: 'Wei Chen', email: 'wei@acme.com', avatar: 'WC', role: 'Editor' },
  { name: 'APAC Claims Team', email: 'apac-claims@acme.com', avatar: 'AC', role: 'Invoker', inherited: 'APAC Support Team catalog' },
  { name: 'Platform Team', email: 'platform-team@acme.com', avatar: 'PT', role: 'Viewer', inherited: 'Engineering org' },
  { name: 'Security Audit', email: 'security-audit@acme.com', avatar: 'SA', role: 'Viewer' },
];

const ROLES = ['Viewer', 'Invoker', 'Editor', 'Admin'] as const;

function Avatar({ text, size = 'md' }: { text: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs';
  return (
    <div className={`${s} rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0`}>
      {text}
    </div>
  );
}

export function SharingModal() {
  const { addNotification } = useNotifications();
  const [generalAccess, setGeneralAccess] = useState<'restricted' | 'organization' | 'published'>('organization');
  const [users, setUsers] = useState(SHARED_USERS);
  const [addEmail, setAddEmail] = useState('');

  return (
    <div className="h-full bg-gray-100/80 flex items-center justify-center p-2 sm:p-4">
      {/* Background context */}
      <div className="fixed inset-0 bg-[var(--color-surface-0)] -z-10 opacity-50" />

      <div className="w-full max-w-lg">

        {/* Modal */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border overflow-hidden max-h-[90vh] overflow-y-auto" style={{ borderColor: 'var(--color-border)' }}>
          {/* Header */}
          <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'var(--font-ui)' }}>
                Share "Claims Processing Agent"
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ background: CHIP_COLORS.agent.bg, color: CHIP_COLORS.agent.text, border: `1px solid ${CHIP_COLORS.agent.border}` }}
              >
                <span style={{ color: CHIP_COLORS.agent.accent }}>{CHIP_ICONS.agent}</span> Agent Playbook
              </span>
              <span>v2.1 · Published</span>
            </div>
          </div>

          {/* Add people */}
          <div className="px-6 py-3 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
                placeholder="Add people, groups, or emails"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={() => {
                  const trimmed = addEmail.trim();
                  if (!trimmed) return;
                  const initials = trimmed.split('@')[0].slice(0, 2).toUpperCase();
                  setUsers(prev => [...prev, { name: trimmed.split('@')[0], email: trimmed, avatar: initials, role: 'Viewer' }]);
                  setAddEmail('');
                  addNotification({ type: 'success', title: 'Invitation sent', message: `Access shared with ${trimmed}` });
                }}
                className="px-4 py-2 bg-[#1A73E8] text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
              >
                Send
              </button>
            </div>
          </div>

          {/* People with access */}
          <div className="px-6 py-3 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-700 mb-3">People with access</h3>
            <div className="space-y-2">
              {users.map((user, i) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <Avatar text={user.avatar} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate flex items-center gap-2">
                      {user.name}
                      {user.role === 'Admin' && (
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-700">OWNER</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {user.email}
                      {user.inherited && (
                        <span className="text-gray-400"> · Inherited from: {user.inherited}</span>
                      )}
                    </div>
                  </div>
                  <select
                    value={user.role}
                    onChange={e => {
                      const newRole = e.target.value as SharedUser['role'];
                      const next = [...users];
                      next[i] = { ...next[i], role: newRole };
                      setUsers(next);
                      addNotification({ type: 'info', title: 'Role updated', message: `${user.name} is now ${newRole}` });
                    }}
                    className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* General access */}
          <div className="px-6 py-3 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-700 mb-3">General access</h3>
            <div className="space-y-2">
              {[
                { key: 'restricted' as const, icon: '◉', label: 'Restricted', desc: 'Only people with explicit access' },
                { key: 'organization' as const, icon: '◎', label: 'ACME Insurance', desc: 'Anyone in the organization can discover and invoke' },
                { key: 'published' as const, icon: '◈', label: 'Published', desc: 'Available in the public registry for cross-org sharing' },
              ].map(opt => (
                <label
                  key={opt.key}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    generalAccess === opt.key
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="access"
                    checked={generalAccess === opt.key}
                    onChange={() => {
                      setGeneralAccess(opt.key);
                      addNotification({ type: 'info', title: 'Access updated', message: `General access set to ${opt.label}` });
                    }}
                    className="accent-blue-600"
                  />
                  <span className="text-base">{opt.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Service perimeter */}
          <div className="px-6 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="text-gray-400">△</span>
              <span>Service Perimeter: <span className="font-mono text-gray-700">apac-finance-perimeter</span></span>
            </div>
          </div>

          {/* Footer note */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Permissions determine @-reference visibility. Users without <strong>Invoker</strong> access cannot
              reference this asset in their playbooks. <strong>Editor</strong> access is required to modify the
              playbook content or publish new versions.
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 py-3 border-t border-gray-100 flex justify-between items-center">
            <button
              onClick={() => {
                navigator.clipboard.writeText('https://agent-builder.acme.com/agent/claims-processing/v2.1');
                addNotification({ type: 'success', title: 'Link copied to clipboard' });
              }}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              Copy link
            </button>
            <button
              onClick={() => {
                addNotification({ type: 'success', title: 'Sharing settings saved' });
              }}
              className="px-5 py-2 bg-[#1A73E8] text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
