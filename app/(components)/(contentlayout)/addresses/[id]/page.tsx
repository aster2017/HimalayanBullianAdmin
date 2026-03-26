'use client';

import { Fragment, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { updateAddress, fetchAddresses } from '@/shared/redux/addressesSlice';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';

const EditAddressPage = () => {
  useProtectedRoute();

  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { items, isLoading, error } = useAppSelector((state) => state.addresses);
  const address = items.find((a) => a.id === id);

  const [formData, setFormData] = useState({
    addressName: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    phoneNumber: '',
    addressType: 'Billing' as 'Billing' | 'Shipping' | 'Both',
  });

  const [validationError, setValidationError] = useState('');
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  useEffect(() => {
    if (address) {
      setFormData({
        addressName: address.addressName || '',
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        zipCode: address.zipCode || '',
        country: address.country || '',
        phoneNumber: address.phoneNumber || '',
        addressType: address.addressType || 'Billing',
      });
      setIsLoadingPage(false);
    } else if (items.length === 0) {
      dispatch(fetchAddresses());
    }
  }, [address, items, dispatch]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setValidationError('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError('');

    if (!formData.addressName.trim()) {
      setValidationError('Address name is required');
      return;
    }
    if (!formData.street.trim()) {
      setValidationError('Street address is required');
      return;
    }
    if (!formData.city.trim()) {
      setValidationError('City is required');
      return;
    }
    if (!formData.zipCode.trim()) {
      setValidationError('ZIP code is required');
      return;
    }

    dispatch(updateAddress({ id, request: formData })).then((action) => {
      if (action.type === updateAddress.fulfilled.type) {
        router.push('/addresses');
      }
    });
  };

  if (isLoadingPage) {
    return (
      <Fragment>
        <Seo title="Edit Address" />
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-[#8c9097]">Loading address...</p>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }

  if (!address) {
    return (
      <Fragment>
        <Seo title="Edit Address" />
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <p className="text-danger mb-4">Address not found</p>
            <Link href="/addresses">
              <button className="ti-btn ti-btn-primary !text-white">Back to Addresses</button>
            </Link>
          </div>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title="Edit Address" />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Edit Address
          </p>
        </div>
        <Link href="/addresses">
          <button className="ti-btn ti-btn-light mt-2 md:mt-0">Back</button>
        </Link>
      </div>

      {(error || validationError) && (
        <div className="p-4 mb-4 bg-danger/40 text-sm border-t-4 border-danger text-danger/60 rounded-lg">
          {error || validationError}
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-6 col-span-12">
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label text-default">Address Name</label>
                  <input
                    type="text"
                    name="addressName"
                    className="form-control form-control-lg"
                    placeholder="e.g., Home, Office"
                    value={formData.addressName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="form-label text-default">Street Address</label>
                  <input
                    type="text"
                    name="street"
                    className="form-control form-control-lg"
                    placeholder="Street address"
                    value={formData.street}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label text-default">City</label>
                    <input
                      type="text"
                      name="city"
                      className="form-control form-control-lg"
                      placeholder="City"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label text-default">State/Province</label>
                    <input
                      type="text"
                      name="state"
                      className="form-control form-control-lg"
                      placeholder="State"
                      value={formData.state}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label text-default">ZIP Code</label>
                    <input
                      type="text"
                      name="zipCode"
                      className="form-control form-control-lg"
                      placeholder="ZIP code"
                      value={formData.zipCode}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label text-default">Country</label>
                    <input
                      type="text"
                      name="country"
                      className="form-control form-control-lg"
                      placeholder="Country"
                      value={formData.country}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label text-default">Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    className="form-control form-control-lg"
                    placeholder="Phone number"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="form-label text-default">Address Type</label>
                  <select
                    name="addressType"
                    className="form-control form-control-lg"
                    value={formData.addressType}
                    onChange={handleChange}
                  >
                    <option value="Billing">Billing</option>
                    <option value="Shipping">Shipping</option>
                    <option value="Both">Both</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="ti-btn ti-btn-primary !text-white disabled:opacity-50"
                  >
                    {isLoading ? 'Updating Address...' : 'Update Address'}
                  </button>
                  <Link href="/addresses">
                    <button type="button" className="ti-btn ti-btn-light">
                      Cancel
                    </button>
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default EditAddressPage;
