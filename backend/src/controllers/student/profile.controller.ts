import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import bcrypt from 'bcryptjs';
import { JWTPayload } from '../../types';

interface AuthRequest extends Request {
  user?: JWTPayload;
  file?: Express.Multer.File;
  cookies: {
    token?: string;
    [key: string]: any;
  };
}

// Get student profile
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;

    const { data, error } = await supabaseAdmin
      .from('students')
      .select(`
        id,
        name,
        email,
        roll_number,
        phone,
        avatar_url,
        created_at,
        last_login,
        is_active
      `)
      .eq('id', studentId)
      .eq('institute_id', instituteId)
      .single();

    if (error) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
};

// Update student profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;
    const { name, phone, avatar_url } = req.body;

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    const { data, error } = await supabaseAdmin
      .from('students')
      .update(updateData)
      .eq('id', studentId)
      .eq('institute_id', instituteId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
};

// Change password
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
    }

    // Get current password hash
    const { data: student, error: fetchError } = await supabaseAdmin
      .from('students')
      .select('password_hash')
      .eq('id', studentId)
      .single();

    if (fetchError || !student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, student.password_hash);

    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    const { error } = await supabaseAdmin
      .from('students')
      .update({ password_hash: newPasswordHash, updated_at: new Date().toISOString() })
      .eq('id', studentId);

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
};

// Get student activity
export const getActivity = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;
    const { limit = 20 } = req.query;

    const { data, error } = await supabaseAdmin
      .from('activity_log')
      .select('*')
      .eq('user_id', studentId)
      .eq('user_type', 'student')
      .eq('institute_id', instituteId)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activity' });
  }
};

// Delete account (soft delete)
export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required to delete account' });
    }

    // Verify password
    const { data: student, error: fetchError } = await supabaseAdmin
      .from('students')
      .select('password_hash')
      .eq('id', studentId)
      .single();

    if (fetchError || !student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const isValid = await bcrypt.compare(password, student.password_hash);

    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Incorrect password' });
    }

    // Soft delete by deactivating
    const { error } = await supabaseAdmin
      .from('students')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', studentId);

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
};

// Get notification preferences
export const getNotificationPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;

    // Default preferences
    const defaultPrefs = {
      emailNotifications: true,
      testReminders: true,
      resultNotifications: true,
      announcementNotifications: true
    };

    // Could be stored in a separate table, returning defaults for now
    res.json({ success: true, data: defaultPrefs });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch preferences' });
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const prefs = req.body;

    // Could store in a separate table, for now just acknowledge
    res.json({ success: true, message: 'Preferences updated', data: prefs });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
};

// Upload student avatar
// NOTE: Requires a public 'avatars' bucket in Supabase Storage.
// Create the bucket via the Supabase dashboard: Storage → New bucket → name: "avatars" → Public: true
export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const file = req.file;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ success: false, error: 'Only JPG, PNG, GIF, or WebP images are allowed' });
    }

    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'Image must be smaller than 5 MB' });
    }

    const rawExt = file.mimetype.split('/')[1];
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
    const filePath = `avatars/${instituteId}/${studentId}/avatar.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return res.status(500).json({ success: false, error: 'Failed to upload image' });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Update the users table so the auth context (/auth/me) returns the new avatar_url.
    // This is the source of truth for the navbar and auth state.
    const { error: usersUpdateError } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', studentId)
      .eq('role', 'student');

    if (usersUpdateError) {
      console.error('Failed to update users table avatar_url:', usersUpdateError);
      return res.status(500).json({ success: false, error: 'Failed to update profile' });
    }

    // Also update the students table for the student profile page.
    // Use only studentId as the filter since instituteId may not be in the JWT payload.
    const { error: studentsUpdateError } = await supabaseAdmin
      .from('students')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', studentId);

    if (studentsUpdateError) {
      // Non-fatal: the users table (auth source of truth) was already updated.
      // Log so that any data-sync issues are visible in server logs.
      console.error('Failed to sync avatar_url to students table:', studentsUpdateError);
    }

    res.json({ success: true, data: { avatar_url: publicUrl } });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload avatar' });
  }
};

export default {
  getProfile,
  updateProfile,
  changePassword,
  getActivity,
  deleteAccount,
  getNotificationPreferences,
  updateNotificationPreferences,
  uploadAvatar,
};
