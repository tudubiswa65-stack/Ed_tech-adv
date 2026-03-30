import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';

export const getAllPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status,
      branch_id,
      start_date,
      end_date
    } = req.query;

    let query = supabaseAdmin
      .from('payments')
      .select(`
        *,
        students!inner(
          id,
          name,
          email,
          branch_id
        ),
        branches (
          id,
          name
        )
      `, { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    if (search) {
      query = query.or(`students.name.ilike.%${search}%,students.email.ilike.%${search}%,transaction_id.ilike.%${search}%`);
    }

    const from = ((parseInt(page as string) - 1) * parseInt(limit as string));
    const to = from + parseInt(limit as string) - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch payments' });
      return;
    }

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payments' });
  }
};

export const getPaymentsByBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { branch_id } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    let query = supabaseAdmin
      .from('payments')
      .select(`
        *,
        students!inner(
          id,
          name,
          email
        )
      `, { count: 'exact' })
      .eq('branch_id', branch_id);

    if (status) {
      query = query.eq('status', status);
    }

    const from = ((parseInt(page as string) - 1) * parseInt(limit as string));
    const to = from + parseInt(limit as string) - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching branch payments:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch branch payments' });
      return;
    }

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching branch payments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch branch payments' });
  }
};

export const getDefaulters = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, branch_id } = req.query;

    // Get students with pending payments or overdue payments
    const { data: students, error } = await supabaseAdmin
      .from('students')
      .select(`
        id,
        name,
        email,
        branch_id,
        branches (
          id,
          name
        ),
        payments (
          id,
          amount,
          status,
          created_at
        )
      `);

    if (error) {
      console.error('Error fetching defaulters:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch defaulters' });
      return;
    }

    // Filter for students with pending payments
    const defaulters = students?.map(student => {
      const pendingPayments = student.payments?.filter((p: any) => p.status === 'pending') || [];
      const failedPayments = student.payments?.filter((p: any) => p.status === 'failed') || [];
      const totalDue = [...pendingPayments, ...failedPayments].reduce((sum, p) => sum + (p.amount || 0), 0);

      if (totalDue > 0) {
        return {
          ...student,
          pendingAmount: totalDue,
          pendingPaymentCount: pendingPayments.length + failedPayments.length
        };
      }
      return null;
    }).filter(Boolean) || [];

    // Filter by branch if specified
    let filteredDefaulters = defaulters;
    if (branch_id) {
      filteredDefaulters = defaulters.filter((d: any) => d.branch_id === branch_id);
    }

    // Pagination
    const startIndex = ((parseInt(page as string) - 1) * parseInt(limit as string));
    const endIndex = startIndex + parseInt(limit as string);
    const paginatedDefaulters = filteredDefaulters.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedDefaulters,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: filteredDefaulters.length,
        totalPages: Math.ceil(filteredDefaulters.length / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching defaulters:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch defaulters' });
  }
};

export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error verifying payment:', error);
      res.status(500).json({ success: false, error: 'Failed to verify payment' });
      return;
    }

    res.json({
      success: true,
      data,
      message: 'Payment verified successfully'
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, error: 'Failed to verify payment' });
  }
};

export const generateReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        students!inner(
          id,
          name,
          email
        ),
        branches (
          id,
          name,
          location
        )
      `)
      .eq('id', id)
      .single();

    if (error || !payment) {
      res.status(404).json({ success: false, error: 'Payment not found' });
      return;
    }

    // Generate receipt data
    const receiptData = {
      receipt_number: `RCP-${Date.now()}-${payment.id.slice(0, 8)}`,
      payment_id: payment.id,
      student_name: payment.students.name,
      student_email: payment.students.email,
      amount: payment.amount,
      payment_method: payment.payment_method,
      transaction_id: payment.transaction_id,
      date: payment.created_at,
      branch_name: payment.branches?.name,
      branch_location: payment.branches?.location
    };

    res.json({
      success: true,
      data: receiptData
    });
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ success: false, error: 'Failed to generate receipt' });
  }
};

export const getPaymentAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { branch_id, start_date, end_date } = req.query;

    let query = supabaseAdmin
      .from('payments')
      .select('amount, status, branch_id, created_at');

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data: payments } = await query;

    const totalRevenue = payments?.reduce((sum, p) => {
      return p.status === 'completed' ? sum + (p.amount || 0) : sum;
    }, 0) || 0;

    const pendingAmount = payments?.reduce((sum, p) => {
      return p.status === 'pending' ? sum + (p.amount || 0) : sum;
    }, 0) || 0;

    const completedCount = payments?.filter(p => p.status === 'completed').length || 0;
    const pendingCount = payments?.filter(p => p.status === 'pending').length || 0;
    const failedCount = payments?.filter(p => p.status === 'failed').length || 0;

    // Branch-wise breakdown
    const branchBreakdown = payments?.reduce((acc, p) => {
      const branchId = p.branch_id || 'unassigned';
      if (!acc[branchId]) {
        acc[branchId] = { total: 0, completed: 0, pending: 0 };
      }
      acc[branchId].total += p.amount || 0;
      if (p.status === 'completed') acc[branchId].completed += p.amount || 0;
      if (p.status === 'pending') acc[branchId].pending += p.amount || 0;
      return acc;
    }, {} as Record<string, any>) || {};

    res.json({
      success: true,
      data: {
        totalRevenue,
        pendingAmount,
        completedCount,
        pendingCount,
        failedCount,
        branchBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching payment analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payment analytics' });
  }
};
