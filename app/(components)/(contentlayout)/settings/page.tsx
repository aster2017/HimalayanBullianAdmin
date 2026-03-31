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
              <button type="submit" disabled={loading} className="ti-btn ti-btn-primary !text-white">Save Profile</button>
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
              <button type="submit" disabled={loading} className="ti-btn ti-btn-primary !text-white">Change Password</button>
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
                  <Link href="/sync" className="ti-btn ti-btn-sm ti-btn-light">Open Sync Dashboard</Link>
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
      </div>
    </Fragment>
  );
};

export default SettingsPage;
