'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import apiClient from '@/shared/services/apiClient';
import { setStoredToken } from '@/shared/utils/tokenStorage';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    fullName: '', email: '', phoneNumber: '', password: '', confirmPassword: '',
    panNumber: '', customerNumber: '', address: '', city: 'Kathmandu', state: '', postalCode: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.fullName.trim()) return 'Full name is required';
    if (!formData.email.trim() || !formData.email.includes('@')) return 'Valid email is required';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep1();
    if (err) { setError(err); return; }

    if (formData.panNumber && !/^\d{9}$/.test(formData.panNumber)) {
      setError('PAN number must be 9 digits');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/auth/signup', { ...formData, source: 'Web' });
      const data = res.data;
      if (data.success && data.token) {
        setStoredToken({ token: data.token, refreshToken: data.refreshToken, expiresAt: data.expiresAt, type: 'Bearer' });
        toast.success('Account created successfully!');
        router.push('/dashboards/admin');
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create account');
    }
    setIsLoading(false);
  };

  return (
    <div className="container">
      <div className="flex justify-center authentication authentication-basic items-center min-h-screen text-defaultsize text-defaulttextcolor">
        <div className="grid grid-cols-12">
          <div className="xxl:col-span-3 xl:col-span-3 lg:col-span-3 md:col-span-2 sm:col-span-1"></div>
          <div className="xxl:col-span-6 xl:col-span-6 lg:col-span-6 md:col-span-8 sm:col-span-10 col-span-12">
            <div className="box !p-[2rem]">
              <p className="h5 font-semibold mb-1 text-center">Create Account</p>
              <p className="mb-4 text-[#8c9097] text-center text-[0.813rem]">
                Step {step} of 2 — {step === 1 ? 'Basic Info' : 'Identity & Address'}
              </p>

              {/* Progress */}
              <div className="w-full bg-gray-200 rounded-full h-1 mb-6">
                <div className="bg-primary h-1 rounded-full transition-all" style={{ width: step === 1 ? '50%' : '100%' }}></div>
              </div>

              {error && (
                <div className="p-3 mb-4 bg-danger/10 text-sm border-l-4 border-danger text-danger rounded">{error}</div>
              )}

              <form onSubmit={handleSubmit}>
                {step === 1 ? (
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Full Name *</label>
                      <input type="text" name="fullName" value={formData.fullName} onChange={handleChange}
                        className="form-control form-control-lg" placeholder="Ram Bahadur Sharma" required />
                    </div>
                    <div>
                      <label className="form-label">Email *</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange}
                        className="form-control form-control-lg" placeholder="your@email.com" required />
                    </div>
                    <div>
                      <label className="form-label">Phone Number</label>
                      <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange}
                        className="form-control form-control-lg" placeholder="+977-98XXXXXXXX" />
                    </div>
                    <div>
                      <label className="form-label">Password * (min 8 chars)</label>
                      <input type="password" name="password" value={formData.password} onChange={handleChange}
                        className="form-control form-control-lg" placeholder="Min 8 characters" required />
                    </div>
                    <div>
                      <label className="form-label">Confirm Password *</label>
                      <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                        className="form-control form-control-lg" placeholder="Confirm password" required />
                    </div>
                    <button type="button" onClick={handleNext}
                      className="ti-btn ti-btn-primary-full !text-white w-full !text-[1rem] py-3">
                      Next &rarr;
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[0.75rem] text-[#8c9097] font-semibold uppercase tracking-wider">Identity</p>
                    <div>
                      <label className="form-label">PAN Number (9 digits)</label>
                      <input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange}
                        className="form-control form-control-lg" placeholder="123456789" maxLength={9} />
                    </div>
                    <div>
                      <label className="form-label">Zoho Customer # (optional)</label>
                      <input type="text" name="customerNumber" value={formData.customerNumber} onChange={handleChange}
                        className="form-control form-control-lg" placeholder="For linking existing Zoho account" />
                    </div>

                    <p className="text-[0.75rem] text-[#8c9097] font-semibold uppercase tracking-wider pt-2">Address</p>
                    <div>
                      <label className="form-label">Street Address</label>
                      <input type="text" name="address" value={formData.address} onChange={handleChange}
                        className="form-control form-control-lg" placeholder="Street address" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">City</label>
                        <input type="text" name="city" value={formData.city} onChange={handleChange}
                          className="form-control form-control-lg" />
                      </div>
                      <div>
                        <label className="form-label">State</label>
                        <input type="text" name="state" value={formData.state} onChange={handleChange}
                          className="form-control form-control-lg" placeholder="Province" />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Postal Code</label>
                      <input type="text" name="postalCode" value={formData.postalCode} onChange={handleChange}
                        className="form-control form-control-lg" placeholder="44600" />
                    </div>

                    <div className="flex gap-3">
                      <button type="button" onClick={() => setStep(1)}
                        className="ti-btn ti-btn-light !opacity-100 flex-1 py-3">
                        &larr; Back
                      </button>
                      <button type="submit" disabled={isLoading}
                        className="ti-btn ti-btn-primary-full !text-white flex-1 !text-[1rem] py-3 disabled:opacity-50">
                        {isLoading ? 'Creating...' : 'Create Account'}
                      </button>
                    </div>
                  </div>
                )}
              </form>

              <div className="text-center mt-4">
                <p className="text-[0.813rem] text-[#8c9097]">
                  Already have an account? <Link href="/" className="text-primary font-semibold">Sign In</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
