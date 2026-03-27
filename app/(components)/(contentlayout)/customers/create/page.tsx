'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Link from 'next/link';
import { CustomerService } from '@/shared/services/customerService';
import toast from 'react-hot-toast';

export default function CreateCustomerPage() {
  useProtectedRoute();

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      // Use the auth register endpoint for now
      // A proper backend endpoint for admin customer creation would be better
      toast.success('Customer creation feature coming soon');
      // Uncomment when backend endpoint is ready:
      // await CustomerService.createCustomer(formData);
      // router.push('/customers');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Fragment>
      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Create Customer
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/customers')}
          className="ti-btn ti-btn-light mt-2 md:mt-0 !opacity-100"
        >
          Back to Customers
        </button>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-danger/40 text-sm border-t-4 border-danger text-danger/60 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-6">
            <div className="box">
              <div className="box-header">
                <h4 className="box-title">Customer Information</h4>
              </div>
              <div className="box-body space-y-4">
                <div>
                  <label className="form-label">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                  />
                </div>

                <div>
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12">
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isLoading}
                className="ti-btn ti-btn-primary !text-white !bg-primary !opacity-100 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Customer'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/customers')}
                className="ti-btn ti-btn-light !opacity-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </Fragment>
  );
}
