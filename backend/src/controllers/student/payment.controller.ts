import { Response } from 'express';
import { AuthRequest } from '../../types';
import { supabaseAdmin } from '../../db/supabaseAdmin';

export const getMyPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student_id = req.user?.id;

    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('student_id', student_id)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('Get my payments error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
