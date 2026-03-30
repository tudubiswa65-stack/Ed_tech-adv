import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';

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

    // Convert to key-value object
    const settingsObj = settings?.reduce((acc, setting) => {
      acc[setting.key] = {
        value: setting.value,
        description: setting.description,
        updated_at: setting.updated_at
      };
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

    const updateData: any = {
      value,
      updated_at: new Date().toISOString()
    };

    if (description !== undefined) {
      updateData.description = description;
    }

    const { data: setting, error } = await supabaseAdmin
      .from('super_admin_settings')
      .update(updateData)
      .eq('key', key)
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
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ success: false, error: 'Settings object is required' });
      return;
    }

    const updates = Object.entries(settings).map(([key, value]) => {
      return supabaseAdmin
        .from('super_admin_settings')
        .update({
          value,
          updated_at: new Date().toISOString()
        })
        .eq('key', key);
    });

    await Promise.all(updates);

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
    const { data: settings } = await supabaseAdmin
      .from('super_admin_settings')
      .select('*')
      .in('key', ['platform_name', 'platform_tagline', 'primary_color', 'secondary_color', 'logo_url', 'favicon_url']);

    // Convert to key-value object
    const branding = settings?.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
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
    const {
      platform_name,
      platform_tagline,
      primary_color,
      secondary_color,
      logo_url,
      favicon_url
    } = req.body;

    const brandingSettings = [
      { key: 'platform_name', value: platform_name },
      { key: 'platform_tagline', value: platform_tagline },
      { key: 'primary_color', value: primary_color },
      { key: 'secondary_color', value: secondary_color },
      { key: 'logo_url', value: logo_url },
      { key: 'favicon_url', value: favicon_url }
    ];

    const updates = brandingSettings.map(setting => {
      if (setting.value !== undefined) {
        return supabaseAdmin
          .from('super_admin_settings')
          .update({
            value: setting.value,
            updated_at: new Date().toISOString()
          })
          .eq('key', setting.key);
      }
      return Promise.resolve();
    });

    await Promise.all(updates);

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
    const { data: settings } = await supabaseAdmin
      .from('super_admin_settings')
      .select('*')
      .in('key', ['maintenance_mode', 'registration_enabled', 'max_upload_size', 'session_timeout']);

    // Convert to key-value object
    const features = settings?.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
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
    // Reset to default values
    const defaultSettings = {
      platform_name: 'EdTech Platform',
      platform_tagline: 'Empowering Education',
      primary_color: '#2E86C1',
      secondary_color: '#1A7A4A',
      default_currency: 'USD',
      timezone: 'UTC',
      maintenance_mode: false,
      registration_enabled: true,
      max_upload_size: 50,
      session_timeout: 604800
    };

    const updates = Object.entries(defaultSettings).map(([key, value]) => {
      return supabaseAdmin
        .from('super_admin_settings')
        .update({
          value,
          updated_at: new Date().toISOString()
        })
        .eq('key', key);
    });

    await Promise.all(updates);

    res.json({
      success: true,
      message: 'Settings reset to defaults successfully'
    });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({ success: false, error: 'Failed to reset settings' });
  }
};
