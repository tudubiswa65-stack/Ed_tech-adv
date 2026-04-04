import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';
import { toSignedAvatarUrl } from '../../utils/avatarUrl';

// NOTE: Requires a PRIVATE 'avatars' bucket in Supabase Storage.
// Create the bucket via the Supabase dashboard: Storage → New bucket → name: "avatars" → Public: false

// Get admin profile
export const getAdminProfile = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id;

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, avatar_url, branch_id, created_at')
      .eq('id', adminId)
      .in('role', ['admin', 'super_admin', 'branch_admin'])
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    const signedAvatarUrl = await toSignedAvatarUrl(data.avatar_url);

    res.json({ success: true, data: { ...data, avatar_url: signedAvatarUrl } });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
};

// Update admin profile
export const updateAdminProfile = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { name, avatar_url } = req.body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', adminId)
      .in('role', ['admin', 'super_admin', 'branch_admin'])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
};

// Upload admin avatar
export const uploadAdminAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    const instituteId = req.user?.instituteId;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const file = req.file;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ success: false, error: 'Only JPG, PNG, GIF, or WebP images are allowed' });
    }

    if (file.size > 2 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'Image is too large (max 2 MB). Please resize your image before uploading.' });
    }

    const rawExt = file.mimetype.split('/')[1];
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
    // Use adminId as fallback to avoid path collisions when instituteId is absent
    const scope = instituteId ?? adminId;
    const filePath = `avatars/${scope}/${adminId}/avatar.${ext}`;

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

    // Store the file path (not a public URL) so the bucket can remain private.
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: filePath, updated_at: new Date().toISOString() })
      .eq('id', adminId);

    if (updateError) {
      return res.status(500).json({ success: false, error: 'Failed to update profile' });
    }

    // Generate a short-lived signed URL so the frontend never receives a raw
    // storage URL and the bucket stays private.
    const signedAvatarUrl = await toSignedAvatarUrl(filePath);

    res.json({ success: true, data: { avatar_url: signedAvatarUrl } });
  } catch (error) {
    console.error('Upload admin avatar error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload avatar' });
  }
};

export default { getAdminProfile, updateAdminProfile, uploadAdminAvatar, getAdminAvatarUrl };

// Get a fresh signed URL for the current admin's avatar
export async function getAdminAvatarUrl(req: AuthRequest, res: Response) {
  try {
    const adminId = req.user?.id;

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('avatar_url')
      .eq('id', adminId)
      .in('role', ['admin', 'super_admin', 'branch_admin'])
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    const signedAvatarUrl = await toSignedAvatarUrl(data.avatar_url);

    res.json({ success: true, data: { avatar_url: signedAvatarUrl } });
  } catch (error) {
    console.error('Get admin avatar URL error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate avatar URL' });
  }
}
