'use client';

import { Fragment, useEffect, useState } from 'react';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { useAppSelector } from '@/shared/redux/hooks';
import Seo from '@/shared/layout-components/seo/seo';
import apiClient from '@/shared/services/apiClient';
import toast from 'react-hot-toast';
import Link from 'next/link';

const SettingsPage = () => {
  useProtectedRoute();

  const user = useAppSelector((state) => state.auth.user);
  const [zohoStatus, setZohoStatus] = useState<any>(null);
  const [profile, setProfile] = useState({ firstName: '', lastName: '', phoneNumber: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load Zoho status
    apiClient.get('/sync/zoho').then(r => setZohoStatus(r.data)).catch(() => {});
    // Load profile
    if (user) {
      setProfile({ firstName: user.firstName || '', lastName: user.lastName || '', phoneNumber: (user as any).phoneNumber || '' });
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.put('/auth/profile', profile);
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    }
    setLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/change-password', passwords);
      toast.success('Password changed');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to change password');
    }
    setLoading(false);
  };

  return (
    <Fragment>
      <Seo title="Settings" />

      <div className="my-[1.5rem] page-header-breadcrumb">
        <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">Settings</p>
        <p className="font-normal text-[#8c9097] text-[0.813rem]">Manage your account and system settings</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Profile */}
        <div className="col-span-12 md:col-span-6">
          <div className="box">
            <div className="box-header"><h4 className="box-title">Profile</h4></div>
            <form onSubmit={handleProfileUpdate} className="box-body space-y-4">
              <div>
                <label className="form-label">Email (Read-only)</label>
                <input type="email" value={user?.email || ''} disabled className="form-control opacity-60" />
              </div>
              <div>
                <label className="form-label">First Name</label>
                <input type="text" value={profile.firstName} onChange={e => setProfile({...profile, firstName: e.target.value})} className="form-control" />
              </div>
              <div>
                <label className="form-label">Last Name</label>
                <input type="text" value={profile.lastName} onChange={e => setProfile({...profile, lastName: e.target.value})} className="form-control" />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input type="tel" value={profile.phoneNumber} onChange={e => setProfile({...profile, phoneNumber: e.target.value})} className="form-control" />
              </div>
              <button type="submit" disabled={loading} className="ti-btn ti-btn-primary-full !text-white">Save Profile</button>
            </form>
          </div>
        </div>

        {/* Password */}
        <div className="col-span-12 md:col-span-6">
          <div className="box">
            <div className="box-header"><h4 className="box-title">Change Password</h4></div>
            <form onSubmit={handlePasswordChange} className="box-body space-y-4">
              <div>
                <label className="form-label">Current Password</label>
                <input type="password" value={passwords.currentPassword} onChange={e => setPasswords({...passwords, currentPassword: e.target.value})} className="form-control" required />
              </div>
              <div>
                <label className="form-label">New Password</label>
                <input type="password" value={passwords.newPassword} onChange={e => setPasswords({...passwords, newPassword: e.target.value})} className="form-control" required />
              </div>
              <div>
                <label className="form-label">Confirm New Password</label>
                <input type="password" value={passwords.confirmPassword} onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})} className="form-control" required />
              </div>
              <button type="submit" disabled={loading} className="ti-btn ti-btn-primary-full !text-white">Change Password</button>
            </form>
          </div>
        </div>

        {/* Zoho Integration */}
        <div className="col-span-12">
          <div className="box">
            <div className="box-header"><h4 className="box-title">Zoho Integration</h4></div>
            <div className="box-body">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-[#8c9097] text-[0.813rem] mb-1">Connection Status</p>
                  <span className={`badge ${zohoStatus?.zoho ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                    {zohoStatus?.zoho ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div>
                  <p className="text-[#8c9097] text-[0.813rem] mb-1">Manage Sync</p>
                  <Link href="/sync" className="ti-btn ti-btn-sm ti-btn-light !opacity-100">Open Sync Dashboard</Link>
                </div>
                <div>
                  <p className="text-[#8c9097] text-[0.813rem] mb-1">Account Info</p>
                  <p className="text-[0.813rem]">
                    <span className="text-[#8c9097]">Role:</span> <span className="font-semibold">{user?.roles?.join(', ') || 'User'}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Configuration */}
        <div className="col-span-12">
          <div className="box">
            <div className="box-header"><h4 className="box-title">System Configuration</h4></div>
            <div className="box-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/settings/bank-details" className="border rounded-lg p-4 hover:border-primary hover:bg-primary/5 transition-colors flex items-start gap-3">
                  <div className="p-2 rounded bg-primary/10 text-primary"><i className="bx bx-credit-card text-2xl"></i></div>
                  <div className="flex-1">
                    <p className="font-semibold mb-1">Bank Details</p>
                    <p className="text-[0.75rem] text-[#8c9097]">Accounts and digital wallets shown to customers for offline transfer.</p>
                  </div>
                  <i className="bx bx-chevron-right text-xl text-[#8c9097]"></i>
                </Link>

                <Link href="/settings/smtp" className="border rounded-lg p-4 hover:border-primary hover:bg-primary/5 transition-colors flex items-start gap-3">
                  <div className="p-2 rounded bg-primary/10 text-primary"><i className="bx bx-envelope text-2xl"></i></div>
                  <div className="flex-1">
                    <p className="font-semibold mb-1">Email / SMTP</p>
                    <p className="text-[0.75rem] text-[#8c9097]">Outgoing mail used for OTP, password reset, order confirmations.</p>
                  </div>
                  <i className="bx bx-chevron-right text-xl text-[#8c9097]"></i>
                </Link>

                <Link href="/settings/operations" className="border rounded-lg p-4 hover:border-primary hover:bg-primary/5 transition-colors flex items-start gap-3">
                  <div className="p-2 rounded bg-primary/10 text-primary"><i className="bx bx-toggle-right text-2xl"></i></div>
                  <div className="flex-1">
                    <p className="font-semibold mb-1">Operations &amp; App Config</p>
                    <p className="text-[0.75rem] text-[#8c9097]">Credits toggle, ConnectIPS env, contact info, maintenance banner.</p>
                  </div>
                  <i className="bx bx-chevron-right text-xl text-[#8c9097]"></i>
                </Link>

                <Link href="/rates" className="border rounded-lg p-4 hover:border-primary hover:bg-primary/5 transition-colors flex items-start gap-3">
                  <div className="p-2 rounded bg-primary/10 text-primary"><i className="bx bx-time-five text-2xl"></i></div>
                  <div className="flex-1">
                    <p className="font-semibold mb-1">Silver Rates &amp; Store Hours</p>
                    <p className="text-[0.75rem] text-[#8c9097]">Live silver rate plus store open/close hours used across the app.</p>
                  </div>
                  <i className="bx bx-chevron-right text-xl text-[#8c9097]"></i>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Legal / Compliance */}
        <div className="col-span-12">
          <div className="box">
            <div className="box-header"><h4 className="box-title">Legal &amp; Compliance</h4></div>
            <div className="box-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link
                  href="/settings/ubo"
                  className="border rounded-lg p-4 hover:border-primary hover:bg-primary/5 transition-colors flex items-start gap-3"
                >
                  <div className="p-2 rounded bg-primary/10 text-primary">
                    <i className="bx bx-shield-quarter text-2xl"></i>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold mb-1">UBO Declaration</p>
                    <p className="text-[0.75rem] text-[#8c9097]">
                      Versioned legal text customers accept at signup. Publish a new version to prompt re-confirmation.
                    </p>
                  </div>
                  <i className="bx bx-chevron-right text-xl text-[#8c9097]"></i>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default SettingsPage;
