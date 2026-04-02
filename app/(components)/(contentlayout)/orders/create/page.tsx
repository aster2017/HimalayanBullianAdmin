'use client';

import { Fragment, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import apiClient from '@/shared/services/apiClient';
import toast from 'react-hot-toast';

interface PriceBreakdown {
  quantityGrams: number;
  ratePerGram: number;
  subtotal: number;
  makingChargePercent: number;
  makingChargeAmount: number;
  totalAmount: number;
  paymentPercent: number;
  bookingAmount: number;
  balanceDue: number;
  deliveryEligible: boolean;
  minDeliveryGrams: number;
  gramsToFreeDelivery: number;
  deliveryMessage: string;
  paymentMessage: string;
}

const CreateOrderPage = () => {
  useProtectedRoute();
  const router = useRouter();

  const [quantity, setQuantity] = useState(100);
  const [price, setPrice] = useState<PriceBreakdown | null>(null);
  const [rate, setRate] = useState<number>(112.5);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');

  const quickOptions = [10, 50, 100, 250, 500, 1000];

  // Load silver rate
  useEffect(() => {
    apiClient.get('/rates/silver').then(res => {
      const data = res.data;
      setRate(data.buyRatePerGram || 112.5);
    }).catch(() => {});
  }, []);

  // Calculate price whenever quantity changes
  useEffect(() => {
    if (quantity < 1) return;
    setCalculating(true);
    const timer = setTimeout(() => {
      apiClient.post('/rates/calculate', { quantityGrams: quantity })
        .then(res => setPrice(res.data))
        .catch(() => {
          // Calculate locally as fallback
          const subtotal = quantity * rate;
          const makingPercent = quantity >= 500 ? 0 : 10;
          const makingAmount = subtotal * makingPercent / 100;
          const total = subtotal + makingAmount;
          const paymentPercent = quantity >= 500 ? 50 : 100;
          setPrice({
            quantityGrams: quantity, ratePerGram: rate, subtotal,
            makingChargePercent: makingPercent, makingChargeAmount: makingAmount,
            totalAmount: total, paymentPercent,
            bookingAmount: total * paymentPercent / 100,
            balanceDue: total - (total * paymentPercent / 100),
            deliveryEligible: quantity >= 10, minDeliveryGrams: 10,
            gramsToFreeDelivery: Math.max(0, 500 - quantity),
            deliveryMessage: quantity >= 500 ? 'FREE delivery' : '10% making charge',
            paymentMessage: paymentPercent === 100 ? 'Full payment required' : '50% booking, 50% on collection'
          });
        })
        .finally(() => setCalculating(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [quantity, rate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity < 1) { setError('Minimum order is 1 gram'); return; }

    setLoading(true);
    setError('');
    try {
      await apiClient.post('/orders', {
        customerId: '',
        lineItems: [{ sku: 'HBC-SILVER-9999', quantityGrams: quantity, ratePerGram: rate }],
        notes: `Silver order - ${quantity}g @ Rs ${rate}/g`,
        creditsApplied: 0
      });
      toast.success('Order created successfully!');
      router.push('/orders');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create order');
      toast.error('Failed to create order');
    }
    setLoading(false);
  };

  return (
    <Fragment>
      <Seo title="Buy Silver" />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Buy Silver
          </p>
          <p className="font-normal text-[#8c9097] text-[0.813rem]">
            Silver 999 Fine — Rs. {rate.toLocaleString()}/gram
          </p>
        </div>
        <button type="button" onClick={() => router.push('/orders')} className="ti-btn ti-btn-light !opacity-100 mt-2 md:mt-0">
          Back to Orders
        </button>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-danger/40 text-sm border-t-4 border-danger text-danger/60 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-12 gap-6">
          {/* Quantity Selection */}
          <div className="col-span-12 xl:col-span-7">
            <div className="box">
              <div className="box-header">
                <h4 className="box-title">How much silver?</h4>
              </div>
              <div className="box-body space-y-6">
                {/* Gram Input */}
                <div>
                  <label className="form-label text-[0.875rem]">Quantity (grams)</label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 10))}
                      className="px-3 py-2 border border-defaultborder rounded-sm text-defaulttextcolor hover:bg-gray-100 text-[1rem] font-bold">-10</button>
                    <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-2 border border-defaultborder rounded-sm text-defaulttextcolor hover:bg-gray-100 text-[1rem] font-bold">-1</button>
                    <input type="number" min="1" value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="form-control form-control-lg text-center text-[1.25rem] font-bold w-[120px]" />
                    <button type="button" onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-2 border border-defaultborder rounded-sm text-defaulttextcolor hover:bg-gray-100 text-[1rem] font-bold">+1</button>
                    <button type="button" onClick={() => setQuantity(quantity + 10)}
                      className="px-3 py-2 border border-defaultborder rounded-sm text-defaulttextcolor hover:bg-gray-100 text-[1rem] font-bold">+10</button>
                    <button type="button" onClick={() => setQuantity(quantity + 100)}
                      className="px-3 py-2 border border-defaultborder rounded-sm text-defaulttextcolor hover:bg-gray-100 text-[1rem] font-bold">+100</button>
                  </div>
                </div>

                {/* Quick Select */}
                <div>
                  <label className="form-label text-[0.813rem] text-[#8c9097]">Quick select</label>
                  <div className="flex flex-wrap gap-2">
                    {quickOptions.map(g => (
                      <button key={g} type="button" onClick={() => setQuantity(g)}
                        className={`px-4 py-2 rounded-sm text-[0.813rem] font-semibold border transition-colors ${
                          quantity === g
                            ? 'bg-primary text-white border-primary'
                            : 'border-defaultborder text-defaulttextcolor hover:border-primary hover:text-primary'
                        }`}>
                        {g >= 1000 ? `${g / 1000} kg` : `${g}g`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delivery Info */}
                {price && (
                  <div className={`p-4 rounded-lg ${price.deliveryEligible ? (quantity >= 500 ? 'bg-success/10 border border-success/30' : 'bg-warning/10 border border-warning/30') : 'bg-danger/10 border border-danger/30'}`}>
                    <div className="flex items-start gap-2">
                      <i className={`ri-${quantity >= 500 ? 'gift' : quantity >= 10 ? 'truck' : 'error-warning'}-line text-[1.2rem] ${quantity >= 500 ? 'text-success' : quantity >= 10 ? 'text-warning' : 'text-danger'}`}></i>
                      <div>
                        <p className="font-semibold text-[0.875rem]">{price.deliveryMessage}</p>
                        {quantity < 500 && quantity >= 10 && (
                          <p className="text-[0.75rem] text-[#8c9097] mt-1">
                            Making charge: {price.makingChargePercent}% = Rs. {price.makingChargeAmount.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="col-span-12 xl:col-span-5">
            <div className="box">
              <div className="box-header">
                <h4 className="box-title">Price Breakdown</h4>
              </div>
              <div className="box-body space-y-3">
                {calculating ? (
                  <div className="text-center py-8">
                    <i className="ri-loader-4-line animate-spin text-[1.5rem] text-primary"></i>
                  </div>
                ) : price ? (
                  <>
                    <div className="flex justify-between text-[0.875rem]">
                      <span className="text-[#8c9097]">Silver ({price.quantityGrams}g x Rs. {price.ratePerGram.toLocaleString()})</span>
                      <span className="font-semibold">Rs. {price.subtotal.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-[0.875rem]">
                      <span className="text-[#8c9097]">
                        Making charge ({price.makingChargePercent}%)
                        {price.makingChargePercent === 0 && <span className="badge bg-success/20 text-success ml-2">FREE</span>}
                      </span>
                      <span className={`font-semibold ${price.makingChargePercent === 0 ? 'text-success' : ''}`}>
                        {price.makingChargePercent === 0 ? 'Rs. 0' : `Rs. ${price.makingChargeAmount.toLocaleString()}`}
                      </span>
                    </div>

                    <div className="border-t pt-3 flex justify-between">
                      <span className="font-semibold text-[1rem]">Total</span>
                      <span className="font-bold text-primary text-[1.125rem]">Rs. {price.totalAmount.toLocaleString()}</span>
                    </div>

                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <i className={`ri-${price.paymentPercent === 100 ? 'wallet-3' : 'split-cells'}-line text-primary`}></i>
                        <span className="font-semibold text-[0.875rem]">Payment: {price.paymentPercent}%</span>
                      </div>
                      <p className="text-[0.75rem] text-[#8c9097] mb-3">{price.paymentMessage}</p>

                      <div className="flex justify-between text-[0.875rem]">
                        <span className="text-[#8c9097]">Due now</span>
                        <span className="font-bold text-danger">Rs. {price.bookingAmount.toLocaleString()}</span>
                      </div>

                      {price.balanceDue > 0 && (
                        <div className="flex justify-between text-[0.875rem] mt-1">
                          <span className="text-[#8c9097]">Balance on collection</span>
                          <span className="font-semibold">Rs. {price.balanceDue.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* Submit */}
            <div className="mt-4">
              <button type="submit" disabled={loading || quantity < 1}
                className="ti-btn ti-btn-primary-full !text-white w-full disabled:opacity-50 text-[1rem] py-3">
                {loading ? 'Placing Order...' : `Buy ${quantity}g Silver — Rs. ${(price?.bookingAmount || 0).toLocaleString()}`}
              </button>
              <p className="text-center text-[0.75rem] text-[#8c9097] mt-2">
                {price?.paymentPercent === 50 ? 'You pay 50% now. Balance due on collection.' : 'Full payment on order.'}
              </p>
            </div>
          </div>
        </div>
      </form>
    </Fragment>
  );
};

export default CreateOrderPage;
