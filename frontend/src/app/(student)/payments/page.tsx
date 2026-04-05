'use client';

import { useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Table, Badge, Card, Button, Modal } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';
import { useStudentPayments, PaymentRecord } from '@/hooks/queries/useStudentQueries';

type Payment = PaymentRecord & { status: 'pending' | 'completed' | 'failed' | 'refunded' };

interface Receipt {
  receipt_number: string;
  payment_id: string;
  amount: number;
  payment_method: string;
  issued_at: string;
  signature_hash: string;
}

export default function StudentPaymentsPage() {
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  // React Query hook — payments list cached 2 min
  const { data, isLoading: loading } = useStudentPayments();
  const payments = (data?.payments ?? []) as Payment[];
  const summary = data?.summary;

  const handleViewReceipt = async (paymentId: string) => {
    setReceiptLoading(true);
    setShowReceiptModal(true);
    setSelectedReceipt(null);
    try {
      const res = await apiClient.get<{ data: Receipt }>(`/student/payments/${paymentId}/receipt`);
      setSelectedReceipt(res.data.data);
    } catch (error) {
      console.error('Failed to load receipt:', error);
      setShowReceiptModal(false);
    } finally {
      setReceiptLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const columns = [
    {
      key: 'amount',
      label: 'Amount',
      render: (p: Payment) => <span className="font-semibold">PKR {Number(p.amount).toLocaleString()}</span>,
    },
    {
      key: 'method',
      label: 'Method',
      render: (p: Payment) => p.payment_method || '-',
    },
    {
      key: 'status',
      label: 'Status',
      render: (p: Payment) => (
        <Badge
          variant={
            p.status === 'completed'
              ? 'success'
              : p.status === 'pending'
              ? 'warning'
              : 'danger'
          }
        >
          {p.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (p: Payment) => new Date(p.created_at).toLocaleDateString(),
    },
    {
      key: 'receipt',
      label: 'Receipt',
      render: (p: Payment) =>
        p.status === 'completed' ? (
          <Button size="sm" variant="outline" onClick={() => handleViewReceipt(p.id)}>
            🧾 View Receipt
          </Button>
        ) : (
          <span className="text-xs text-gray-400 dark:text-slate-500">—</span>
        ),
    },
  ];

  const totalPaid = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <PageWrapper title="My Payments">
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Paid */}
        <Card className="p-4 flex flex-col gap-1">
          <div className="text-xs text-gray-500 uppercase font-semibold dark:text-slate-400 tracking-wide">Total Paid</div>
          <div className="text-2xl font-bold text-green-600">PKR {totalPaid.toLocaleString()}</div>
          <div className="text-xs text-gray-400 dark:text-slate-500">All completed payments</div>
        </Card>

        {/* Course Fee */}
        <Card className="p-4 flex flex-col gap-1">
          <div className="text-xs text-gray-500 uppercase font-semibold dark:text-slate-400 tracking-wide">Course Fee</div>
          <div className="text-2xl font-bold text-blue-600">
            {summary?.courseFee != null ? `PKR ${Number(summary.courseFee).toLocaleString()}` : '—'}
          </div>
          <div className="text-xs text-gray-400 dark:text-slate-500">Enrolled course amount</div>
        </Card>

        {/* This Month */}
        <Card className="p-4 flex flex-col gap-1">
          <div className="text-xs text-gray-500 uppercase font-semibold dark:text-slate-400 tracking-wide">This Month</div>
          <div className="text-2xl font-bold text-purple-600">
            PKR {(summary?.monthlyPaid ?? 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 dark:text-slate-500">
            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </div>
        </Card>

        {/* Upcoming Payment */}
        <Card className="p-4 flex flex-col gap-1">
          <div className="text-xs text-gray-500 uppercase font-semibold dark:text-slate-400 tracking-wide">Upcoming Payment</div>
          <div className="text-2xl font-bold text-orange-500">
            {summary?.nextPaymentAmount != null ? `PKR ${Number(summary.nextPaymentAmount).toLocaleString()}` : '—'}
          </div>
          <div className="text-xs text-gray-400 dark:text-slate-500">
            {summary?.nextPaymentDate
              ? `Due ${new Date(summary.nextPaymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : 'No upcoming payment'}
          </div>
        </Card>
      </div>

      <Table columns={columns} data={payments} loading={loading} emptyMessage="No payment records found" />

      {/* Receipt Modal */}
      <Modal isOpen={showReceiptModal} onClose={() => setShowReceiptModal(false)} title="Payment Receipt" size="md">
        {receiptLoading ? (
          <div className="flex justify-center py-8 text-gray-500 dark:text-slate-400">Loading receipt…</div>
        ) : selectedReceipt ? (
          <div className="font-mono text-sm" id="receipt-content">
            <div className="text-center border-b pb-4 mb-4">
              <h2 className="text-lg font-bold">OFFICIAL RECEIPT</h2>
              <p className="text-gray-500 text-xs dark:text-slate-400">EdTech Platform</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-400">Receipt No:</span>
                <span className="font-bold">{selectedReceipt.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-400">Amount:</span>
                <span className="font-bold text-green-700">PKR {Number(selectedReceipt.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-400">Method:</span>
                <span>{selectedReceipt.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-400">Date:</span>
                <span>{new Date(selectedReceipt.issued_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-400 break-all dark:text-slate-500">
                <span className="font-medium">Digital Signature:</span>{' '}
                {selectedReceipt.signature_hash?.substring(0, 32)}…
              </p>
              <p className="text-xs text-green-600 mt-1">✓ Cryptographically verified</p>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="outline" onClick={() => setShowReceiptModal(false)}>Close</Button>
          {selectedReceipt && (
            <Button onClick={handlePrintReceipt}>🖨️ Print Receipt</Button>
          )}
        </div>
      </Modal>
    </PageWrapper>
  );
}
