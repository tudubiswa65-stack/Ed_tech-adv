'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';

interface Settings {
  platform_name?: string;
  tagline?: string;
  primary_color?: string;
  logo_url?: string;
  currency?: string;
  timezone?: string;
  session_timeout?: number;
  payment_threshold?: number;
  late_fee_percentage?: number;
  grace_period_days?: number;
  max_upload_size_mb?: number;
  allowed_file_types?: string[];
  [key: string]: any;
}

interface Features {
  maintenance_mode?: boolean;
  user_registration?: boolean;
  email_notifications?: boolean;
  sms_notifications?: boolean;
  [key: string]: any;
}

const TIMEZONES = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Kolkata', 'Asia/Karachi', 'Asia/Dubai'];
const FILE_TYPES = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'mp3', 'doc', 'docx', 'xls', 'xlsx'];
const DEFAULT_ENABLED_TYPES = ['pdf', 'jpg', 'jpeg', 'png', 'docx'];

// Dot colors per file type family
const TYPE_DOT_COLORS: Record<string, string> = {
  pdf: '#f87171',
  jpg: '#60a5fa', jpeg: '#60a5fa', png: '#60a5fa', gif: '#60a5fa',
  mp4: '#a78bfa', mp3: '#a78bfa',
  docx: '#34d399', doc: '#34d399',
  xls: '#4ade80', xlsx: '#4ade80',
};

// ─── Global token style helpers ───────────────────────────────────────────────
const S = {
  card: {
    background: '#1e293b',
    borderRadius: 12,
    padding: 16,
    border: '0.5px solid rgba(255,255,255,0.06)',
    marginBottom: 20,
  } as React.CSSProperties,
  sectionLabel: {
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 10,
  } as React.CSSProperties,
  input: {
    background: '#0f172a',
    borderRadius: 8,
    border: '0.5px solid rgba(255,255,255,0.1)',
    padding: '10px 12px',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  fieldCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 14,
  } as React.CSSProperties,
};

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={S.sectionLabel}>{children}</p>;
}

// ─── Field label ──────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>
      {children}
    </span>
  );
}

// ─── Dark text input ──────────────────────────────────────────────────────────
function DarkInput({
  value, onChange, placeholder, type = 'text', min, max, mono,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
  mono?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      style={{
        ...S.input,
        fontFamily: mono ? 'monospace' : undefined,
      }}
    />
  );
}

// ─── Dark select (dropdown with chevron) ──────────────────────────────────────
function DarkSelect({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          ...S.input,
          appearance: 'none',
          WebkitAppearance: 'none',
          paddingRight: 32,
          cursor: 'pointer',
        }}
      >
        {options.map(o => <option key={o} value={o} style={{ background: '#1e293b' }}>{o}</option>)}
      </select>
      {/* Chevron icon */}
      <svg
        viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round"
        style={{ width: 14, height: 14, position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

// ─── Custom toggle switch ─────────────────────────────────────────────────────
function ToggleSwitch({
  checked, onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      style={{
        width: 42,
        height: 24,
        borderRadius: 12,
        background: checked ? '#3b82f6' : 'rgba(255,255,255,0.1)',
        border: checked ? 'none' : '0.5px solid rgba(255,255,255,0.1)',
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.2s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: checked ? '#fff' : 'rgba(180,180,180,0.7)',
          top: 3,
          left: checked ? undefined : 3,
          right: checked ? 3 : undefined,
          transition: 'left 0.2s, right 0.2s',
        }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>({});
  const [features, setFeatures] = useState<Features>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSettings = async () => {
    try {
      const [settingsRes, featuresRes] = await Promise.all([
        apiClient.get('/super-admin/settings'),
        apiClient.get('/super-admin/settings/features'),
      ]);
      if (settingsRes.data.success) setSettings(settingsRes.data.data || {});
      if (featuresRes.data.success) setFeatures(featuresRes.data.data || {});
    } catch {
      showToast('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...settings, ...features };
      const res = await apiClient.put('/super-admin/settings', payload);
      if (res.data.success) {
        showToast('success', 'Settings saved successfully');
      }
    } catch {
      showToast('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all settings to defaults?')) return;
    try {
      const res = await apiClient.post('/super-admin/settings/reset');
      if (res.data.success) {
        showToast('success', 'Settings reset to defaults');
        fetchSettings();
      }
    } catch {
      showToast('error', 'Failed to reset settings');
    }
  };

  const toggleFileType = (type: string) => {
    const current = settings.allowed_file_types || [];
    const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
    setSettings({ ...settings, allowed_file_types: updated });
  };

  const toggleFeature = (key: string) => {
    setFeatures({ ...features, [key]: !features[key] });
  };

  // Derive initials for avatar
  const initials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'SA';

  const primaryColor = settings.primary_color || '#6366f1';
  const maxUpload = settings.max_upload_size_mb || 10;
  const MAX_UPLOAD_CAP = 100;
  const uploadProgress = Math.min((maxUpload / MAX_UPLOAD_CAP) * 100, 100);

  const enabledFileTypes = settings.allowed_file_types ?? DEFAULT_ENABLED_TYPES;

  const featureFlagRows = [
    { key: 'maintenance_mode', label: 'Maintenance Mode', description: 'Put the platform in read-only maintenance state' },
    { key: 'user_registration', label: 'User Registration', description: 'Allow new users to register accounts' },
    { key: 'email_notifications', label: 'Email Notifications', description: 'Send automated email alerts to users' },
    { key: 'sms_notifications', label: 'SMS Notifications', description: 'Send SMS alerts via integrated provider' },
  ];

  if (loading) {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading settings…</span>
      </div>
    );
  }

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', paddingBottom: 80 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          padding: '10px 16px', borderRadius: 10, fontSize: 13,
          background: toast.type === 'success' ? '#16a34a' : '#dc2626',
          color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          {toast.message}
        </div>
      )}

      {/* ── Mobile header (hidden on desktop where Navbar shows) ── */}
      <div className="flex lg:hidden" style={{
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        background: '#0f172a',
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
          Global Settings
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Notification bell */}
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={1.8}
              strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          {/* Avatar */}
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#6366f1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, color: '#fff',
          }}>
            {initials}
          </div>
        </div>
      </div>

      {/* ── Page content ── */}
      <div style={{ padding: '20px 16px 0' }}>

        {/* Page title block */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 500, color: '#fff', margin: 0, lineHeight: 1.3 }}>Settings</h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>Configure your platform</p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.2)',
              color: '#f87171',
              fontSize: 11,
              fontWeight: 500,
              padding: '7px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Reset defaults
          </button>
        </div>

        <form onSubmit={handleSave}>

          {/* ── Branding ─────────────────────────────────────────────────── */}
          <SectionLabel>Branding</SectionLabel>
          <div style={S.card}>
            <div style={S.fieldCol}>
              {/* Platform Name */}
              <div>
                <FieldLabel>Platform Name</FieldLabel>
                <DarkInput
                  value={settings.platform_name || ''}
                  onChange={v => setSettings({ ...settings, platform_name: v })}
                  placeholder="e.g. EduPlatform"
                />
              </div>

              {/* Tagline */}
              <div>
                <FieldLabel>Tagline</FieldLabel>
                <DarkInput
                  value={settings.tagline || ''}
                  onChange={v => setSettings({ ...settings, tagline: v })}
                  placeholder="Your platform tagline"
                />
              </div>

              {/* Primary Color */}
              <div>
                <FieldLabel>Primary Color</FieldLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Color swatch — clicking opens native color picker */}
                  <label style={{ cursor: 'pointer', flexShrink: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: primaryColor,
                      border: '0.5px solid rgba(255,255,255,0.15)',
                    }} />
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
                      style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' as const }}
                      aria-label="Pick primary color"
                    />
                  </label>
                  <DarkInput
                    value={primaryColor}
                    onChange={v => setSettings({ ...settings, primary_color: v })}
                    placeholder="#6366f1"
                    mono
                  />
                </div>
              </div>

              {/* Logo URL with link icon */}
              <div>
                <FieldLabel>Logo URL</FieldLabel>
                <div style={{ position: 'relative' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={1.8}
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ width: 14, height: 14, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                  </svg>
                  <input
                    type="text"
                    value={settings.logo_url || ''}
                    onChange={e => setSettings({ ...settings, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    style={{ ...S.input, paddingLeft: 34 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Feature Flags ─────────────────────────────────────────────── */}
          <SectionLabel>Feature Flags</SectionLabel>
          <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
            {featureFlagRows.map((row, idx) => {
              const isOn = !!features[row.key];
              return (
                <div
                  key={row.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderBottom: idx < featureFlagRows.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: isOn ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                      {row.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                      {row.description}
                    </div>
                  </div>
                  <ToggleSwitch checked={isOn} onChange={() => toggleFeature(row.key)} />
                </div>
              );
            })}
          </div>

          {/* ── Platform Settings ─────────────────────────────────────────── */}
          <SectionLabel>Platform Settings</SectionLabel>
          <div style={S.card}>
            <div style={S.fieldCol}>
              {/* Currency */}
              <div>
                <FieldLabel>Currency</FieldLabel>
                <DarkSelect
                  value={settings.currency || 'INR'}
                  onChange={v => setSettings({ ...settings, currency: v })}
                  options={['USD', 'EUR', 'GBP', 'INR', 'PKR']}
                />
              </div>

              {/* Timezone */}
              <div>
                <FieldLabel>Timezone</FieldLabel>
                <DarkSelect
                  value={settings.timezone || 'UTC'}
                  onChange={v => setSettings({ ...settings, timezone: v })}
                  options={TIMEZONES}
                />
              </div>

              {/* Session Timeout */}
              <div>
                <FieldLabel>
                  Session Timeout{' '}
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>(minutes)</span>
                </FieldLabel>
                <DarkInput
                  type="number"
                  value={settings.session_timeout || 60}
                  onChange={v => setSettings({ ...settings, session_timeout: Number(v) })}
                  min={5}
                  mono
                />
              </div>
            </div>
          </div>

          {/* ── Payment Settings ──────────────────────────────────────────── */}
          <SectionLabel>Payment Settings</SectionLabel>
          <div style={S.card}>
            <div style={S.fieldCol}>
              {/* Payment Threshold with $ prefix */}
              <div>
                <FieldLabel>Payment Threshold</FieldLabel>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 13, color: 'rgba(255,255,255,0.2)', pointerEvents: 'none',
                  }}>$</span>
                  <input
                    type="number"
                    value={settings.payment_threshold || 0}
                    onChange={e => setSettings({ ...settings, payment_threshold: Number(e.target.value) })}
                    min={0}
                    style={{ ...S.input, paddingLeft: 24, fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              {/* Late Fee & Grace Period side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <FieldLabel>
                    Late Fee{' '}
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>(%)</span>
                  </FieldLabel>
                  <DarkInput
                    type="number"
                    value={settings.late_fee_percentage || 0}
                    onChange={v => setSettings({ ...settings, late_fee_percentage: Number(v) })}
                    min={0}
                    max={100}
                    mono
                  />
                </div>
                <div>
                  <FieldLabel>
                    Grace Period{' '}
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>(days)</span>
                  </FieldLabel>
                  <DarkInput
                    type="number"
                    value={settings.grace_period_days || 0}
                    onChange={v => setSettings({ ...settings, grace_period_days: Number(v) })}
                    min={0}
                    mono
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Upload Settings ───────────────────────────────────────────── */}
          <SectionLabel>Upload Settings</SectionLabel>
          <div style={S.card}>
            <div style={S.fieldCol}>
              {/* Max Upload Size + progress bar */}
              <div>
                <FieldLabel>Max Upload Size <span style={{ color: 'rgba(255,255,255,0.2)' }}>(MB)</span></FieldLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 110, flexShrink: 0 }}>
                    <DarkInput
                      type="number"
                      value={maxUpload}
                      onChange={v => setSettings({ ...settings, max_upload_size_mb: Number(v) })}
                      min={1}
                      mono
                    />
                  </div>
                  {/* Progress bar */}
                  <div style={{
                    flex: 1,
                    height: 4,
                    background: 'rgba(255,255,255,0.07)',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${uploadProgress}%`,
                      background: '#3b82f6',
                      borderRadius: 4,
                      transition: 'width 0.3s',
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                    {maxUpload}/{MAX_UPLOAD_CAP} MB
                  </span>
                </div>
              </div>

              {/* Allowed File Types — pill chips */}
              <div>
                <FieldLabel>Allowed File Types</FieldLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {FILE_TYPES.map(type => {
                    const enabled = enabledFileTypes.includes(type);
                    const dotColor = TYPE_DOT_COLORS[type] ?? 'rgba(255,255,255,0.2)';
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleFileType(type)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '5px 10px',
                          borderRadius: 20,
                          border: enabled
                            ? '1px solid rgba(59,130,246,0.25)'
                            : '1px solid rgba(255,255,255,0.08)',
                          background: enabled
                            ? 'rgba(59,130,246,0.15)'
                            : 'rgba(255,255,255,0.05)',
                          cursor: 'pointer',
                          transition: 'background 0.15s, border-color 0.15s',
                        }}
                      >
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: enabled ? dotColor : 'rgba(255,255,255,0.2)',
                          flexShrink: 0,
                        }} />
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: 11,
                          color: enabled ? '#60a5fa' : 'rgba(255,255,255,0.3)',
                        }}>
                          .{type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Save button ───────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              background: saving ? 'rgba(59,130,246,0.5)' : '#3b82f6',
              borderRadius: 10,
              padding: 14,
              fontSize: 13,
              fontWeight: 500,
              color: '#fff',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              marginTop: 4,
              transition: 'background 0.2s',
            }}
          >
            {saving ? 'Saving…' : 'Save all changes'}
          </button>

        </form>
      </div>
    </div>
  );
}
