'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

type Item = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  totalAmount: number;
  balanceAmount: number;
  status: string;
  customerId: string;
  customerName: string;
};

type Bucket = {
  bucket: string;
  count: number;
  total: number;
  items: Item[];
};

const BUCKET_COLOR: Record<string, string> = {
  'Current': 'success',
  '1-30 days': 'info',
  '31-60 days': 'warning',
  '61-90 days': 'warning',
  'Over 90 days': 'danger',
};

export default function PaymentAgingPage() {
  useProtectedRoute();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [totals, setTotals] = useState<{ grandTotal: number; invoiceCount: number; customerCount: number }>({
    grandTotal: 0, invoiceCount: 0, customerCount: 0,
  });
  const [asOf, setAsOf] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [expandedBucket, setExpandedBucket] = useState<string | null>('Over 90 days');

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/reports/payment-aging`, { headers: getAuthHeaders() });
      const d = await r.json();
      const data = d?.data || {};
      setBuckets(data.buckets || []);
      setTotals(data.totals || { grandTotal: 0, invoiceCount: 0, customerCount: 0 });
      setAsOf(data.asOf || '');
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <Fragment>
      <div className="my-[1.5rem]">
        <p className="font-semibold text-[1.125rem] !mb-0">Payment Aging</p>
        <p className="text-[0.813rem] text-[#8c9097]">
          Outstanding invoice balances bucketed by days overdue.
          {asOf && <> · As of {new Date(asOf).toLocaleDateString('en-NP')}</>}
          <Link href="/reports/invoice-overdue" className="text-primary ms-2">Overdue list →</Link>
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary inline-block"></div>
        </div>
      ) : (
        <Fragment>
          {/* Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="box p-4">
              <p className="text-xs text-gray-500 uppercase mb-1">Outstanding total</p>
              <p className="text-2xl font-bold text-warning">Rs. {totals.grandTotal.toLocaleString()}</p>
            </div>
            <div className="box p-4">
              <p className="text-xs text-gray-500 uppercase mb-1">Open invoices</p>
              <p className="text-2xl font-bold">{totals.invoiceCount}</p>
            </div>
            <div className="box p-4">
              <p className="text-xs text-gray-500 uppercase mb-1">Affected customers</p>
              <p className="text-2xl font-bold">{totals.customerCount}</p>
            </div>
          </div>

          {/* Bucket cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {buckets.map(b => {
              const color = BUCKET_COLOR[b.bucket] || 'secondary';
              const isActive = expandedBucket === b.bucket;
              return (
                <button
                  key={b.bucket}
                  onClick={() => setExpandedBucket(isActive ? null : b.bucket)}
                  className={`box p-3 text-left transition-all border-2 ${isActive ? `border-${color}` : 'border-transparent'} hover:shadow-sm`}
                >
                  <p className={`text-xs text-${color} font-semibold mb-1`}>{b.bucket}</p>
                  <p className="font-bold">{b.count}</p>
                  <p className="text-[11px] text-gray-500 font-mono">Rs. {b.total.toLocaleString()}</p>
                </button>
              );
            })}
          </div>

          {/* Drill-in table */}
          {expandedBucket && (() => {
            const b = buckets.find(x => x.bucket === expandedBucket);
            if (!b || b.items.length === 0) return (
              <div className="box">
                <div className="box-body text-center py-8 text-sm text-gray-500">
                  No invoices in <strong>{expandedBucket}</strong>.
                </div>
              </div>
            );
            return (
              <div className="box">
                <div className="box-header">
                  <h6 className="box-title mb-0">{expandedBucket} ({b.count} invoices, Rs. {b.total.toLocaleString()})</h6>
                </div>
                <div className="box-body">
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="ti-custom-table ti-striped-table ti-custom-table-hover min-w-[640px] sm:min-w-0">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase">
                          <th className="text-left p-2">Invoice</th>
                          <th className="text-left p-2 hidden md:table-cell">Customer</th>
                          <th className="text-left p-2">Issued</th>
                          <th className="text-left p-2 hidden lg:table-cell">Due</th>
                          <th className="text-right p-2">Balance</th>
                          <th className="text-center p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b.items.map(i => (
                          <tr key={i.id} className="border-t">
                            <td className="p-2 font-mono text-[0.813rem]">
                              <Link href={`/invoices/${i.id}`} className="text-primary hover:underline">{i.invoiceNumber}</Link>
                              <div className="md:hidden text-[0.7rem] text-gray-500 mt-1 truncate max-w-[140px]">{i.customerName}</div>
                            </td>
                            <td className="p-2 hidden md:table-cell">
                              <Link href={`/customers/${i.customerId}`} className="text-primary text-sm hover:underline">{i.customerName}</Link>
                            </td>
                            <td className="p-2 text-[0.813rem]">{new Date(i.invoiceDate).toLocaleDateString('en-NP')}</td>
                            <td className="p-2 text-[0.813rem] hidden lg:table-cell">
                              {i.dueDate ? new Date(i.dueDate).toLocaleDateString('en-NP') : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="p-2 text-right font-mono font-semibold">Rs. {i.balanceAmount.toLocaleString()}</td>
                            <td className="p-2 text-center text-xs">{i.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {b.count > 50 && (
                    <p className="text-xs text-gray-500 mt-3 text-center">Showing top 50 by balance — see /invoices for the full list.</p>
                  )}
                </div>
              </div>
            );
          })()}
        </Fragment>
      )}
    </Fragment>
  );
}
