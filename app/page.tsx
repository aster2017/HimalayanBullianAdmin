'use client';

import { basePath } from '@/next.config';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { loginUser, clearError } from '@/shared/redux/authSlice';
import { getStoredToken } from '@/shared/utils/tokenStorage';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);
  const { isLoading = false, error = null, isAuthenticated = false } = authState || {};

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated && getStoredToken()) {
      window.location.href = '/dashboards/admin';
    }
  }, [isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) {
      dispatch(clearError());
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch(loginUser(formData));
  };

  return (
    <div className="container">
      <div className="flex justify-center authentication authentication-basic items-center h-screen text-defaultsize text-defaulttextcolor">
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
              <p className="h5 font-semibold mb-2 text-center">Sign In</p>

              {error && (
                <div
                  className="p-4 mb-4 bg-danger/40 text-sm border-t-4 border-danger text-danger/60 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <p className="mb-4 text-[#8c9097] dark:text-white/50 opacity-[0.7] font-normal text-center">
                Welcome to HBC Silver
              </p>

              <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-y-4">
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

                <div className="xl:col-span-12 col-span-12 mb-2">
                  <label htmlFor="password" className="form-label text-default block">
                    Password
                    <Link href="/forgot-password" className="float-right text-danger text-sm">
                      Forgot password?
                    </Link>
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

                <div className="xl:col-span-12 col-span-12 grid mt-0">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="ti-btn ti-btn-primary !bg-primary !text-white !font-medium disabled:opacity-50"
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </button>
                </div>
              </form>

              <div className="text-center">
                <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mt-4">
                  Don't have an account?{' '}
                  <Link href="/register" className="text-primary font-semibold">
                    Sign Up
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
