'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

type Row = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  daysOverdue: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
};

const severity = (d: number): string =>
  d > 90 ? 'danger' : d > 60 ? 'danger' : d > 30 ? 'warning' : d > 0 ? 'info' : 'secondary';

export default function InvoiceOverduePage() {
  useProtectedRoute();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/reports/invoice-overdue`, { headers: getAuthHeaders() });
      const d = await r.json();
      setRows(d?.data || []);
    } catch { toast.error('Failed to load overdue invoices'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const sendReminder = async (invoiceId: string, customerEmail: string) => {
    if (!window.confirm(`Email the invoice to ${customerEmail}?`)) return;
    setEmailing(invoiceId);
    try {
      const r = await fetch(`${API}/invoices/${invoiceId}/send-email`, { method: 'POST', headers: getAuthHeaders() });
      const d = await r.json();
      if (d?.success) toast.success(d.message || 'Reminder sent');
      else toast.error(d?.message || 'Send failed');
    } finally { setEmailing(null); }
  };

  const totals = rows.reduce(
    (acc, r) => ({ count: acc.count + 1, total: acc.total + r.balanceAmount }),
    { count: 0, total: 0 }
  );

  return (
    <Fragment>
      <div className="my-[1.5rem]">
        <p className="font-semibold text-[1.125rem] !mb-0">Overdue Invoices</p>
        <p className="text-[0.813rem] text-[#8c9097]">
          {totals.count} invoice{totals.count === 1 ? '' : 's'} past due · Rs. {totals.total.toLocaleString()} outstanding
          <Link href="/reports/payment-aging" className="text-primary ms-2">Aging buckets →</Link>
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary inline-block"></div>
        </div>
      ) : rows.length === 0 ? (
        <div className="box">
          <div className="box-body text-center py-12">
            <i className="ri-checkbox-circle-line text-5xl text-success block mb-2"></i>
            <p className="text-[#8c9097]">No overdue invoices — nothing to chase.</p>
          </div>
        </div>
      ) : (
        <div className="box">
          <div className="box-body">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="ti-custom-table ti-striped-table ti-custom-table-hover min-w-[700px] sm:min-w-0">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left p-2">Invoice</th>
                    <th className="text-left p-2 hidden md:table-cell">Customer</th>
                    <th className="text-left p-2 hidden lg:table-cell">Due</th>
                    <th className="text-center p-2">Days overdue</th>
                    <th className="text-right p-2">Balance</th>
                    <th className="text-right p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const sev = severity(r.daysOverdue);
                    return (
                      <tr key={r.id} className="border-t">
                        <td className="p-2 font-mono text-[0.813rem]">
                          <Link href={`/invoices/${r.id}`} className="text-primary hover:underline">{r.invoiceNumber}</Link>
                          <div className="md:hidden text-[0.7rem] text-gray-500 mt-1 truncate max-w-[140px]">{r.customerName}</div>
                        </td>
                        <td className="p-2 hidden md:table-cell">
                          <Link href={`/customers/${r.customerId}`} className="text-primary text-sm hover:underline">{r.customerName}</Link>
                          <div className="text-[0.7rem] text-gray-400">{r.customerEmail}</div>
                        </td>
                        <td className="p-2 text-[0.813rem] hidden lg:table-cell">{new Date(r.dueDate).toLocaleDateString('en-NP')}</td>
                        <td className="p-2 text-center">
                          <span className={`badge bg-${sev}/20 text-${sev} text-[10px] px-2 py-0.5 rounded font-semibold`}>
                            {r.daysOverdue} {r.daysOverdue === 1 ? 'day' : 'days'}
                          </span>
                        </td>
                        <td className="p-2 text-right font-mono font-semibold">Rs. {r.balanceAmount.toLocaleString()}</td>
                        <td className="p-2 text-right">
                          {r.customerEmail && (
                            <button
                              onClick={() => sendReminder(r.id, r.customerEmail)}
                              disabled={emailing === r.id}
                              className="ti-btn ti-btn-warning ti-btn-sm !text-white !opacity-100 disabled:!opacity-50"
                              title={`Email invoice to ${r.customerEmail}`}
                            >
                              {emailing === r.id ? '…' : <><i className="ri-mail-send-line me-1"></i>Remind</>}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
