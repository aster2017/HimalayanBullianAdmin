'use client';

import { Fragment, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { fetchInvoiceById } from '@/shared/redux/invoicesSlice';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { InvoiceService } from '@/shared/services/invoiceService';

const InvoiceDetailPage = () => {
  useProtectedRoute();

  const params = useParams();
  const id = params.id as string;
  const dispatch = useAppDispatch();
  const { currentInvoice, loading, error } = useAppSelector((state) => state.invoices);

  useEffect(() => {
    if (id) {
      dispatch(fetchInvoiceById(id));
    }
  }, [dispatch, id]);

  const handleDownloadPDF = async () => {
    try {
      await InvoiceService.downloadAndOpenInvoicePdf(id);
    } catch (err) {
      console.error('Failed to download invoice', err);
    }
  };

  if (loading) {
    return (
      <Fragment>
        <Seo title="Invoice" />
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-[#8c9097]">Loading invoice...</p>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }

  if (error || !currentInvoice) {
    return (
      <Fragment>
        <Seo title="Invoice" />
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <p className="text-danger mb-4">{error || 'Invoice not found'}</p>
            <Link href="/invoices">
              <button className="ti-btn ti-btn-primary !text-white">Back to Invoices</button>
            </Link>
          </div>
        </div>
      </Fragment>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'secondary';
      case 'sent':
        return 'info';
      case 'paid':
        return 'success';
      case 'overdue':
        return 'danger';
      case 'cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  return (
    <Fragment>
      <Seo title={`Invoice ${currentInvoice.invoiceNumber}`} />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Invoice {currentInvoice.invoiceNumber}
          </p>
        </div>
        <div className="flex gap-2 mt-2 md:mt-0">
          <Link href="/invoices">
            <button className="ti-btn ti-btn-light">Back</button>
          </Link>
          <button
            onClick={handleDownloadPDF}
            className="ti-btn ti-btn-primary !text-white"
          >
            <i className="ri-download-line inline-block me-2"></i>Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Invoice Details */}
        <div className="xl:col-span-8 col-span-12">
          <div className="box">
            <div className="box-body">
              {/* Header Info */}
              <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b">
                <div>
                  <span className="text-[#8c9097] text-[0.875rem]">Invoice Date</span>
                  <p className="font-semibold">
                    {new Date(currentInvoice.invoiceDate).toLocaleDateString('en-PK')}
                  </p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.875rem]">Due Date</span>
                  <p className="font-semibold">
                    {currentInvoice.dueDate
                      ? new Date(currentInvoice.dueDate).toLocaleDateString('en-PK')
                      : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.875rem]">Status</span>
                  <p>
                    <span className={`badge bg-${getStatusColor(currentInvoice.status)}/20 text-${getStatusColor(currentInvoice.status)}`}>
                      {currentInvoice.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className="mb-6">
                <h5 className="font-semibold mb-4">Invoice Items</h5>
                {currentInvoice.lineItems && currentInvoice.lineItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="ti-custom-table">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Quantity</th>
                          <th>Unit Price</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentInvoice.lineItems.map((item, index) => (
                          <tr key={index}>
                            <td>{item.description}</td>
                            <td>{item.quantity}</td>
                            <td>Rs. {item.unitPrice?.toLocaleString('en-PK')}</td>
                            <td className="font-semibold">
                              Rs. {(item.quantity * (item.unitPrice || 0)).toLocaleString('en-PK')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[#8c9097]">No items in this invoice</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="xl:col-span-4 col-span-12">
          <div className="box">
            <div className="box-header">
              <h4 className="box-title">Invoice Summary</h4>
            </div>
            <div className="box-body space-y-4">
              <div className="flex justify-between">
                <span className="text-[#8c9097]">Subtotal</span>
                <span className="font-semibold">
                  Rs. {currentInvoice.subtotalAmount?.toLocaleString('en-PK')}
                </span>
              </div>

              {currentInvoice.taxAmount && currentInvoice.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#8c9097]">Tax</span>
                  <span className="font-semibold">
                    Rs. {currentInvoice.taxAmount.toLocaleString('en-PK')}
                  </span>
                </div>
              )}

              {currentInvoice.discountAmount && currentInvoice.discountAmount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span className="font-semibold">
                    -Rs. {currentInvoice.discountAmount.toLocaleString('en-PK')}
                  </span>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span className="font-semibold">Total Amount</span>
                  <span className="font-semibold text-primary text-[1.125rem]">
                    Rs. {currentInvoice.totalAmount?.toLocaleString('en-PK')}
                  </span>
                </div>
              </div>

              {currentInvoice.paidAmount && currentInvoice.paidAmount > 0 && (
                <div className="border-t pt-4">
                  <div className="flex justify-between text-success mb-2">
                    <span>Paid Amount</span>
                    <span className="font-semibold">
                      Rs. {currentInvoice.paidAmount.toLocaleString('en-PK')}
                    </span>
                  </div>
                  {currentInvoice.totalAmount &&
                    currentInvoice.paidAmount < currentInvoice.totalAmount && (
                      <div className="flex justify-between text-danger">
                        <span>Balance Due</span>
                        <span className="font-semibold">
                          Rs.{' '}
                          {(currentInvoice.totalAmount - currentInvoice.paidAmount).toLocaleString(
                            'en-PK'
                          )}
                        </span>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default InvoiceDetailPage;
