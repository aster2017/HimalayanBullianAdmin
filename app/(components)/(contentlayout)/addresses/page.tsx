'use client';

import { Fragment, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { fetchAddresses, deleteAddress } from '@/shared/redux/addressesSlice';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';

const AddressesPage = () => {
  useProtectedRoute();

  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.addresses);

  useEffect(() => {
    dispatch(fetchAddresses());
  }, [dispatch]);

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      dispatch(deleteAddress(id));
    }
  };

  return (
    <Fragment>
      <Seo title="Addresses" />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Addresses
          </p>
          <p className="font-normal text-[#8c9097] dark:text-white/50 text-[0.813rem]">
            Manage your delivery and billing addresses
          </p>
        </div>
        <Link href="/addresses/create">
          <button className="ti-btn ti-btn-primary !text-white mt-2 md:mt-0">
            <i className="ri-add-line inline-block me-2"></i>Add Address
          </button>
        </Link>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-danger/40 text-sm border-t-4 border-danger text-danger/60 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-[#8c9097]">Loading addresses...</p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#8c9097] mb-4">No addresses found</p>
          <Link href="/addresses/create">
            <button className="ti-btn ti-btn-primary !text-white">Add Your First Address</button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {items.map((address) => (
            <div key={address.id} className="xl:col-span-4 lg:col-span-6 col-span-12">
              <div className="box">
                <div className="box-body">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h5 className="font-semibold">{address.addressName}</h5>
                      <div className="flex gap-2 mt-2">
                        {address.addressType && (
                          <span className="text-[0.75rem] bg-primary/20 text-primary px-2 py-1 rounded">
                            {address.addressType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-[0.875rem] text-[#8c9097] mb-4">
                    <p>{address.street}</p>
                    <p>
                      {address.city}, {address.state} {address.zipCode}
                    </p>
                    {address.country && <p>{address.country}</p>}
                  </div>

                  {address.phoneNumber && (
                    <p className="text-[0.875rem] mb-4">
                      <span className="text-[#8c9097]">Phone: </span>
                      {address.phoneNumber}
                    </p>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <Link href={`/addresses/${address.id}`} className="flex-1">
                      <button className="ti-btn ti-btn-sm ti-btn-light w-full">
                        Edit
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="ti-btn ti-btn-sm ti-btn-danger !text-white"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Fragment>
  );
};

export default AddressesPage;
