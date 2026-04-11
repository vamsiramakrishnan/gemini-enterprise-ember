/**
 * NewAgentScreen — Create a new agent by writing a playbook.
 *
 * No form wizard. No "max turns" field. No model dropdown.
 * The user picks a template (or blank), names their agent,
 * and the playbook editor opens immediately.
 *
 * This is the core thesis: the document IS the agent.
 * Creating an agent = opening a document.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../../ui';
import { PLAYBOOK_TEMPLATES, BLANK_TEMPLATE, type PlaybookTemplate } from '../../data/templates';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useNotifications } from '../../contexts/NotificationContext';

export function NewAgentScreen() {
  const navigate = useNavigate();
  const { createWorkspace } = useWorkspace();
  const { addNotification } = useNotifications();
  const [name, setName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<PlaybookTemplate>(BLANK_TEMPLATE);
  const [step, setStep] = useState<'name' | 'template'>('name');

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;

    // Create a new workspace for this agent
    createWorkspace(name.trim());

    addNotification({
      type: 'success',
      title: `Created "${name.trim()}"`,
      message: 'Opening the playbook editor...',
    });

    // Navigate to the editor (which will show the template content)
    navigate('/editor');
  }, [name, createWorkspace, addNotification, navigate]);

  return (
    <div
      className="h-full overflow-auto"
      style={{
        background: 'var(--color-surface-1)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 'clamp(40px, 8vh, 80px)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 640, padding: '0 var(--space-page-x)' }}>

        {step === 'name' && (
          <div className="animate-in">
            {/* Heading */}
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div
                className="inline-flex items-center justify-center"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-accent-light)',
                  marginBottom: 16,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h1 style={{
                fontSize: 'clamp(20px, 3vw, 26px)',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-ui)',
                letterSpacing: '-0.03em',
                margin: 0,
              }}>
                Create a new agent
              </h1>
              <p style={{
                fontSize: 14,
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-ui)',
                marginTop: 8,
                lineHeight: 1.5,
              }}>
                Give it a name, then write its playbook. The document is the agent.
              </p>
            </div>

            {/* Name input */}
            <Card padding="lg">
              <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-tertiary)',
                marginBottom: 8,
              }}>
                Agent name
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Claims Processing Agent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && name.trim()) setStep('template');
                }}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: 17,
                  fontWeight: 500,
                  fontFamily: 'var(--font-ui)',
                  letterSpacing: '-0.01em',
                  color: 'var(--color-text-primary)',
                  background: 'var(--color-surface-1)',
                  border: '2px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none',
                  transition: 'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-accent)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-ring)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <div className="flex items-center justify-between" style={{ marginTop: 20 }}>
                <Button variant="ghost" size="md" onClick={() => navigate('/')}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={!name.trim()}
                  onClick={() => setStep('template')}
                >
                  Continue
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Button>
              </div>
            </Card>
          </div>
        )}

        {step === 'template' && (
          <div className="animate-in">
            {/* Heading */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h1 style={{
                fontSize: 'clamp(18px, 3vw, 22px)',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-ui)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}>
                Start with a template
              </h1>
              <p style={{
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-ui)',
                marginTop: 6,
              }}>
                Choose a starting point for <strong>{name}</strong>, or start blank.
              </p>
            </div>

            {/* Template cards */}
            <div className="space-y-3 stagger">
              {PLAYBOOK_TEMPLATES.map((tpl) => {
                const isSelected = selectedTemplate.id === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl)}
                    className="w-full text-left"
                    style={{
                      padding: '16px 20px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--color-accent-light)' : 'var(--color-surface-0)',
                      border: `2px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      cursor: 'pointer',
                      transition: 'all var(--duration-fast) var(--ease-out)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="shrink-0 flex items-center justify-center"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 'var(--radius-md)',
                          background: isSelected ? 'var(--color-accent)' : 'var(--color-surface-2)',
                          color: isSelected ? '#fff' : 'var(--color-text-tertiary)',
                          fontSize: 14,
                          transition: 'all var(--duration-fast) var(--ease-out)',
                        }}
                      >
                        {tpl.id === 'blank' ? '✎' : tpl.id === 'customer-service' ? '💬' : '⚙'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)',
                        }}>
                          {tpl.name}
                        </div>
                        <div style={{
                          fontSize: 12,
                          color: 'var(--color-text-secondary)',
                          marginTop: 2,
                        }}>
                          {tpl.description}
                        </div>
                      </div>
                      {isSelected && (
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <circle cx="9" cy="9" r="8" fill="var(--color-accent)"/>
                          <path d="M5.5 9l2.5 2.5L12.5 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between" style={{ marginTop: 24 }}>
              <Button variant="ghost" size="md" onClick={() => setStep('name')}>
                Back
              </Button>
              <Button variant="primary" size="md" onClick={handleCreate}>
                Create &amp; Open Editor
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
