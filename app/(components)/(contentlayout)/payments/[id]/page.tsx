'use client';

import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import apiClient from '@/shared/services/apiClient';

const PaymentDetailPage = () => {
  useProtectedRoute();

  const params = useParams();
  const id = params.id as string;
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const res = await apiClient.get(`/payments/${id}`);
        setPayment(res.data?.data || res.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Payment not found');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPayment();
  }, [id]);

  if (loading) {
    return (
      <Fragment>
        <Seo title="Payment" />
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Fragment>
    );
  }

  if (error || !payment) {
    return (
      <Fragment>
        <Seo title="Payment" />
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <p className="text-danger mb-4">{error || 'Payment not found'}</p>
            <Link href="/payments"><button className="ti-btn ti-btn-primary-full !text-white">Back to Payments</button></Link>
          </div>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title={`Payment ${payment.paymentNumber}`} />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Payment #{payment.paymentNumber}
          </p>
        </div>
        <Link href="/payments"><button className="ti-btn ti-btn-light mt-2 md:mt-0">Back</button></Link>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-8 col-span-12">
          <div className="box">
            <div className="box-header">
              <h4 className="box-title">Payment Details</h4>
            </div>
            <div className="box-body">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-[#8c9097] text-[0.813rem]">Payment Number</span>
                  <p className="font-semibold text-[1rem]">{payment.paymentNumber}</p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.813rem]">Payment Date</span>
                  <p className="font-semibold">{new Date(payment.paymentDate).toLocaleDateString('en-NP')}</p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.813rem]">Status</span>
                  <p><span className="badge bg-success/20 text-success">{payment.status}</span></p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.813rem]">Invoice</span>
                  <p className="font-semibold">{payment.invoiceNumber || '-'}</p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.813rem]">Payment Method</span>
                  <p className="font-semibold">{payment.paymentMethod || '-'}</p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.813rem]">Transaction ID</span>
                  <p className="font-mono text-[0.813rem]">{payment.transactionId || '-'}</p>
                </div>
              </div>

              {payment.notes && (
                <div className="mt-6 pt-4 border-t">
                  <span className="text-[#8c9097] text-[0.813rem]">Notes</span>
                  <p>{payment.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 col-span-12">
          <div className="box bg-success/5 border-l-4 border-success">
            <div className="box-body text-center py-8">
              <p className="text-[#8c9097] text-[0.875rem] mb-2">Amount Paid</p>
              <p className="font-bold text-success text-[2rem]">Rs. {payment.amount?.toLocaleString()}</p>
            </div>
          </div>

          {payment.syncStatus && (
            <div className="box mt-4">
              <div className="box-body">
                <span className="text-[#8c9097] text-[0.75rem]">Sync Status</span>
                <p className="font-semibold text-[0.875rem]">{payment.syncStatus}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Fragment>
  );
};

export default PaymentDetailPage;
