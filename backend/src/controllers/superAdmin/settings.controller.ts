import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';

// Keys whose DB string values should be cast to numbers
const NUMBER_KEYS = new Set([
  'session_timeout', 'payment_threshold', 'late_fee_percentage',
  'grace_period_days', 'max_upload_size_mb'
]);

// Keys whose DB string values should be cast to booleans
const BOOLEAN_KEYS = new Set([
  'maintenance_mode', 'user_registration', 'email_notifications', 'sms_notifications'
]);

// Keys whose DB string values are JSON arrays
const JSON_ARRAY_KEYS = new Set(['allowed_file_types']);

type SettingValue = string | number | boolean | string[] | null;

function parseValue(key: string, raw: string | null): SettingValue {
  if (raw === null || raw === undefined) return null;
  if (BOOLEAN_KEYS.has(key)) return raw === 'true';
  if (NUMBER_KEYS.has(key)) return Number(raw);
  if (JSON_ARRAY_KEYS.has(key)) {
    try { return JSON.parse(raw) as string[]; } catch { return []; }
  }
  return raw;
}

function serializeValue(key: string, val: SettingValue | undefined): string {
  if (val === null || val === undefined) return '';
  if (JSON_ARRAY_KEYS.has(key)) return JSON.stringify(val);
  return String(val);
}

export const getAllSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('super_admin_settings')
      .select('*')
      .order('key', { ascending: true });

    if (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch settings' });
      return;
    }

    // Return flat { key: parsedValue } so the frontend can use values directly
    const settingsObj = settings?.reduce((acc, setting) => {
      acc[setting.key] = parseValue(setting.key, setting.value);
      return acc;
    }, {} as Record<string, any>) || {};

    res.json({
      success: true,
      data: settingsObj
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
};

export const updateSetting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    const serialized = serializeValue(key, value);

    const upsertData: Record<string, SettingValue | string> = {
      key,
      value: serialized,
      updated_at: new Date().toISOString()
    };

    if (description !== undefined) {
      upsertData.description = description;
    }

    const { data: setting, error } = await supabaseAdmin
      .from('super_admin_settings')
      .upsert(upsertData, { onConflict: 'key' })
      .select()
      .single();

    if (error) {
      console.error('Error updating setting:', error);
      res.status(500).json({ success: false, error: 'Failed to update setting' });
      return;
    }

    res.json({
      success: true,
      data: setting,
      message: 'Setting updated successfully'
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ success: false, error: 'Failed to update setting' });
  }
};

export const updateMultipleSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Frontend sends a flat object: { platform_name: 'x', maintenance_mode: true, ... }
    const body = req.body;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ success: false, error: 'Request body must be a settings object' });
      return;
    }

    const upsertRows = Object.entries(body as Record<string, SettingValue>).map(([key, value]) => ({
      key,
      value: serializeValue(key, value),
      updated_at: new Date().toISOString()
    }));

    if (upsertRows.length === 0) {
      res.json({ success: true, message: 'No settings to update' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('super_admin_settings')
      .upsert(upsertRows, { onConflict: 'key' });

    if (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ success: false, error: 'Failed to update settings' });
      return;
    }

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
};

export const getBrandingSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const BRANDING_KEYS = ['platform_name', 'tagline', 'primary_color', 'logo_url'];

    const { data: settings, error } = await supabaseAdmin
      .from('super_admin_settings')
      .select('*')
      .in('key', BRANDING_KEYS);

    if (error) {
      console.error('Error fetching branding settings:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch branding settings' });
      return;
    }

    const branding = settings?.reduce((acc, setting) => {
      acc[setting.key] = parseValue(setting.key, setting.value);
      return acc;
    }, {} as Record<string, any>) || {};

    res.json({
      success: true,
      data: branding
    });
  } catch (error) {
    console.error('Error fetching branding settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch branding settings' });
  }
};

export const updateBrandingSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { platform_name, tagline, primary_color, logo_url } = req.body;

    const brandingSettings: { key: string; value: any }[] = [
      { key: 'platform_name', value: platform_name },
      { key: 'tagline',       value: tagline },
      { key: 'primary_color', value: primary_color },
      { key: 'logo_url',      value: logo_url }
    ].filter(s => s.value !== undefined);

    if (brandingSettings.length === 0) {
      res.json({ success: true, message: 'No branding settings to update' });
      return;
    }

    const upsertRows = brandingSettings.map(s => ({
      key: s.key,
      value: serializeValue(s.key, s.value),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabaseAdmin
      .from('super_admin_settings')
      .upsert(upsertRows, { onConflict: 'key' });

    if (error) {
      console.error('Error updating branding settings:', error);
      res.status(500).json({ success: false, error: 'Failed to update branding settings' });
      return;
    }

    res.json({
      success: true,
      message: 'Branding settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating branding settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update branding settings' });
  }
};

export const getFeatureFlags = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const FEATURE_KEYS = ['maintenance_mode', 'user_registration', 'email_notifications', 'sms_notifications'];

    const { data: settings, error } = await supabaseAdmin
      .from('super_admin_settings')
      .select('*')
      .in('key', FEATURE_KEYS);

    if (error) {
      console.error('Error fetching feature flags:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch feature flags' });
      return;
    }

    // Return proper booleans so the frontend toggles work correctly
    const features = settings?.reduce((acc, setting) => {
      acc[setting.key] = parseValue(setting.key, setting.value);
      return acc;
    }, {} as Record<string, any>) || {};

    res.json({
      success: true,
      data: features
    });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch feature flags' });
  }
};

export const resetSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Default values keyed to match what the frontend Settings page expects
    const defaultSettings: Record<string, SettingValue> = {
      platform_name:       'EdTech Platform',
      tagline:             'Empowering Education',
      primary_color:       '#6366f1',
      logo_url:            '',
      currency:            'INR',
      timezone:            'UTC',
      session_timeout:     60,
      payment_threshold:   0,
      late_fee_percentage: 0,
      grace_period_days:   0,
      max_upload_size_mb:  10,
      allowed_file_types:  ['pdf', 'jpg', 'jpeg', 'png', 'docx'],
      maintenance_mode:    false,
      user_registration:   true,
      email_notifications: true,
      sms_notifications:   false
    };

    const upsertRows = Object.entries(defaultSettings).map(([key, value]) => ({
      key,
      value: serializeValue(key, value),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabaseAdmin
      .from('super_admin_settings')
      .upsert(upsertRows, { onConflict: 'key' });

    if (error) {
      console.error('Error resetting settings:', error);
      res.status(500).json({ success: false, error: 'Failed to reset settings' });
      return;
    }

    res.json({
      success: true,
      message: 'Settings reset to defaults successfully'
    });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({ success: false, error: 'Failed to reset settings' });
  }
};
