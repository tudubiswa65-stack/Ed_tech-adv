import { Response } from 'express';
import { AuthRequest } from '../../types';
import { supabaseAdmin } from '../../db/supabaseAdmin';

export const getMyPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student_id = req.user?.id;

    const [paymentsResult, enrollmentResult] = await Promise.all([
      supabaseAdmin
        .from('payments')
        .select('*')
        .eq('student_id', student_id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('enrollments')
        .select('courses(price, name)')
        .eq('student_id', student_id)
        .in('status', ['active', 'completed'])
        .order('enrolled_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (paymentsResult.error) {
      res.status(400).json({ success: false, error: paymentsResult.error.message });
      return;
    }

    const payments = paymentsResult.data || [];
    const enrollment = enrollmentResult.data;

    // Course fee from current enrollment
    const courseFee = (enrollment?.courses as any)?.price ?? null;

    // Monthly paid: sum of completed payments in the current calendar month
    const now = new Date();
    const monthlyPaid = payments
      .filter((p) => {
        if (p.status !== 'completed') return false;
        const d = new Date(p.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Upcoming payment: first pending payment, or estimated 30 days after last completed
    const pendingPayment = payments.find((p) => p.status === 'pending');
    const completedPayments = payments.filter((p) => p.status === 'completed');
    let nextPaymentDate: string | null = null;
    let nextPaymentAmount: number | null = null;
    if (pendingPayment) {
      nextPaymentDate = pendingPayment.created_at;
      nextPaymentAmount = Number(pendingPayment.amount);
    } else if (completedPayments.length > 0) {
      const lastDate = new Date(completedPayments[0].created_at);
      lastDate.setDate(lastDate.getDate() + 30);
      nextPaymentDate = lastDate.toISOString();
      nextPaymentAmount = courseFee ?? Number(completedPayments[0].amount);
    }

    res.json({
      success: true,
      data: payments,
      summary: {
        courseFee,
        monthlyPaid,
        nextPaymentDate,
        nextPaymentAmount,
      },
    });
  } catch (error: any) {
    console.error('Get my payments error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getMyPaymentReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student_id = req.user?.id;
    const { id } = req.params;

    const { data: receipt, error } = await supabaseAdmin
      .from('receipts')
      .select('*')
      .eq('payment_id', id)
      .eq('student_id', student_id)
      .single();

    if (error || !receipt) {
      // Fall back to payment record and verify it belongs to this student
      const { data: payment, error: pErr } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('id', id)
        .eq('student_id', student_id)
        .single();

      if (pErr || !payment) {
        res.status(404).json({ success: false, error: 'Receipt not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          receipt_number: `PAY-${payment.id.substring(0, 8).toUpperCase()}`,
          payment_id: payment.id,
          amount: payment.amount,
          payment_method: payment.payment_method,
          issued_at: payment.created_at,
          signature_hash: payment.receipt_signature,
        },
      });
      return;
    }

    res.json({ success: true, data: receipt });
  } catch (error: any) {
    console.error('Get my payment receipt error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
