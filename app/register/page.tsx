'use client';

import { basePath } from '@/next.config';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { registerUser, clearError } from '@/shared/redux/authSlice';

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [validationError, setValidationError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValidationError('');
    if (error) {
      dispatch(clearError());
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName.trim()) {
      setValidationError('First name is required');
      return;
    }
    if (!formData.lastName.trim()) {
      setValidationError('Last name is required');
      return;
    }
    if (!formData.email.trim()) {
      setValidationError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setValidationError('Please enter a valid email address');
      return;
    }
    if (formData.password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    dispatch(
      registerUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      })
    ).then((action) => {
      if (action.type === registerUser.fulfilled.type) {
        router.push('/');
      }
    });
  };

  return (
    <div className="container">
      <div className="flex justify-center authentication authentication-basic items-center min-h-screen text-defaultsize text-defaulttextcolor">
        <div className="grid grid-cols-12">
          <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-3 sm:col-span-2"></div>
          <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-6 sm:col-span-8 col-span-12">
            <div className="my-[2.5rem] flex justify-center">
              <Link href="/">
                <img
                  src={`${process.env.NODE_ENV === 'production' ? basePath : ''}/assets/images/brand-logos/desktop-logo.png`}
                  alt="logo"
                  className="desktop-logo"
                />
                <img
                  src={`${process.env.NODE_ENV === 'production' ? basePath : ''}/assets/images/brand-logos/desktop-dark.png`}
                  alt="logo"
                  className="desktop-dark"
                />
              </Link>
            </div>

            <div className="box !p-[3rem]">
              <p className="h5 font-semibold mb-2 text-center">Create Account</p>

              {(error || validationError) && (
                <div
                  className="p-4 mb-4 bg-danger/40 text-sm border-t-4 border-danger text-danger/60 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"
                  role="alert"
                >
                  {error || validationError}
                </div>
              )}

              <p className="mb-4 text-[#8c9097] dark:text-white/50 opacity-[0.7] font-normal text-center">
                Join HBC Silver today
              </p>

              <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-y-4">
                <div className="xl:col-span-6 col-span-12">
                  <label htmlFor="firstName" className="form-label text-default">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    className="form-control form-control-lg w-full !rounded-md"
                    id="firstName"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="xl:col-span-6 col-span-12">
                  <label htmlFor="lastName" className="form-label text-default">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    className="form-control form-control-lg w-full !rounded-md"
                    id="lastName"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="xl:col-span-12 col-span-12">
                  <label htmlFor="email" className="form-label text-default">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    className="form-control form-control-lg w-full !rounded-md"
                    id="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="xl:col-span-12 col-span-12">
                  <label htmlFor="password" className="form-label text-default">
                    Password
                  </label>
                  <div className="input-group">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      className="form-control !border-s form-control-lg !rounded-s-md"
                      id="password"
                      placeholder="Enter password"
                      required
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="toggle password visibility"
                      className="ti-btn ti-btn-light !rounded-s-none !mb-0"
                      type="button"
                    >
                      <i className={`${showPassword ? 'ri-eye-line' : 'ri-eye-off-line'} align-middle`}></i>
                    </button>
                  </div>
                </div>

                <div className="xl:col-span-12 col-span-12">
                  <label htmlFor="confirmPassword" className="form-label text-default">
                    Confirm Password
                  </label>
                  <div className="input-group">
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="form-control !border-s form-control-lg !rounded-s-md"
                      id="confirmPassword"
                      placeholder="Confirm password"
                      required
                    />
                    <button
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label="toggle confirm password visibility"
                      className="ti-btn ti-btn-light !rounded-s-none !mb-0"
                      type="button"
                    >
                      <i className={`${showConfirmPassword ? 'ri-eye-line' : 'ri-eye-off-line'} align-middle`}></i>
                    </button>
                  </div>
                </div>

                <div className="xl:col-span-12 col-span-12 grid mt-0">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="ti-btn ti-btn-primary !bg-primary !text-white !font-medium disabled:opacity-50"
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </div>
              </form>

              <div className="text-center">
                <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mt-4">
                  Already have an account?{' '}
                  <Link href="/" className="text-primary font-semibold">
                    Sign In
                  </Link>
                </p>
              </div>
            </div>
          </div>
          <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-3 sm:col-span-2"></div>
        </div>
      </div>
    </div>
  );
}
