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
  const [activeTab, setActiveTab] = useState('profile');

  // Bank details state
  const [bankDetails, setBankDetails] = useState<any>({
    accounts: [{ id: '1', bankName: '', accountNumber: '', accountName: '', branch: '', isActive: true, isPrimary: true }],
    wallets: [
      { name: 'eSewa', id: '', isActive: true },
      { name: 'Khalti', id: '', isActive: true },
      { name: 'Fonepay', id: '', isActive: true }
    ],
    instructions: ''
  });
  const [bankLoading, setBankLoading] = useState(false);

  // Market hours state
  const [marketHours, setMarketHours] = useState<any>({
    openTime: '11:00',
    closeTime: '17:00',
    timezone: 'Asia/Kathmandu',
    closedDays: ['Saturday'],
    closedMessage: 'Market is closed. Trading hours: 11:00 AM - 5:00 PM NPT (Sun-Fri)'
  });
  const [marketLoading, setMarketLoading] = useState(false);

  useEffect(() => {
    apiClient.get('/sync/zoho').then(r => setZohoStatus(r.data)).catch(() => {});
    if (user) {
      setProfile({ firstName: user.firstName || '', lastName: user.lastName || '', phoneNumber: (user as any).phoneNumber || '' });
    }
    // Load bank details
    apiClient.get('/settings/bank-details').then(r => {
      if (r.data) setBankDetails(r.data);
    }).catch(() => {});
    // Load market hours from rates API
    apiClient.get('/rates/store-hours').then(r => {
      if (r.data) {
        setMarketHours({
          ...marketHours,
          openTime: r.data.openTime || '11:00',
          closeTime: r.data.closeTime || '17:00',
          timezone: r.data.timezone || 'Asia/Kathmandu'
        });
      }
    }).catch(() => {});
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

  const handleBankDetailsSave = async () => {
    setBankLoading(true);
    try {
      await apiClient.put('/settings/bank-details', bankDetails);
      toast.success('Bank details updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update bank details');
    }
    setBankLoading(false);
  };

  const handleMarketHoursSave = async () => {
    setMarketLoading(true);
    try {
      const [openH, openM] = (marketHours.openTime || '11:00').split(':').map(Number);
      const [closeH, closeM] = (marketHours.closeTime || '17:00').split(':').map(Number);
      await apiClient.put('/rates/store-hours', {
        openHour: openH,
        openMinute: openM,
        closeHour: closeH,
        closeMinute: closeM
      });
      toast.success('Market hours updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update market hours');
    }
    setMarketLoading(false);
  };

  const updateAccount = (index: number, field: string, value: string) => {
    const accounts = [...bankDetails.accounts];
    accounts[index] = { ...accounts[index], [field]: value };
    setBankDetails({ ...bankDetails, accounts });
  };

  const updateWallet = (index: number, field: string, value: any) => {
    const wallets = [...bankDetails.wallets];
    wallets[index] = { ...wallets[index], [field]: value };
    setBankDetails({ ...bankDetails, wallets });
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: 'ri-user-line' },
    { id: 'bank', label: 'Bank & Payment', icon: 'ri-bank-line' },
    { id: 'market', label: 'Market Hours', icon: 'ri-time-line' },
    { id: 'zoho', label: 'Zoho Integration', icon: 'ri-links-line' },
  ];

  return (
    <Fragment>
      <Seo title="Settings" />

      <div className="my-[1.5rem] page-header-breadcrumb">
        <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">Settings</p>
        <p className="font-normal text-[#8c9097] text-[0.813rem]">Manage business, payment, and system settings</p>
      </div>

      {/* Tabs */}
      <div className="box">
        <div className="box-body p-0">
          <div className="flex border-b">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-[0.875rem] font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-[#8c9097] hover:text-defaulttextcolor'
                }`}>
                <i className={`${tab.icon} me-2`}></i>{tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-12 gap-6">
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
        </div>
      )}

      {/* Bank & Payment Tab */}
      {activeTab === 'bank' && (
        <div className="grid grid-cols-12 gap-6">
          {/* Bank Accounts */}
          <div className="col-span-12 xl:col-span-8">
            <div className="box">
              <div className="box-header">
                <h4 className="box-title">Bank Account Details</h4>
                <p className="text-[#8c9097] text-[0.75rem] mt-1">These details are shown to customers when they place an order</p>
              </div>
              <div className="box-body space-y-6">
                {bankDetails.accounts?.map((account: any, i: number) => (
                  <div key={i} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="font-semibold">Account {i + 1}</h5>
                      {account.isPrimary && <span className="badge bg-primary/20 text-primary">Primary</span>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Bank Name</label>
                        <input type="text" value={account.bankName || ''} onChange={e => updateAccount(i, 'bankName', e.target.value)}
                          className="form-control" placeholder="Nepal Bank Limited" />
                      </div>
                      <div>
                        <label className="form-label">Account Number</label>
                        <input type="text" value={account.accountNumber || ''} onChange={e => updateAccount(i, 'accountNumber', e.target.value)}
                          className="form-control" placeholder="0123456789" />
                      </div>
                      <div>
                        <label className="form-label">Account Name</label>
                        <input type="text" value={account.accountName || ''} onChange={e => updateAccount(i, 'accountName', e.target.value)}
                          className="form-control" placeholder="Himalayan Bullion Company Ltd" />
                      </div>
                      <div>
                        <label className="form-label">Branch</label>
                        <input type="text" value={account.branch || ''} onChange={e => updateAccount(i, 'branch', e.target.value)}
                          className="form-control" placeholder="New Baneshwor, Kathmandu" />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Payment Instructions */}
                <div>
                  <label className="form-label">Payment Instructions</label>
                  <textarea value={bankDetails.instructions || ''} onChange={e => setBankDetails({...bankDetails, instructions: e.target.value})}
                    className="form-control" rows={3} placeholder="Please include your order number as payment reference" />
                </div>

                <button onClick={handleBankDetailsSave} disabled={bankLoading}
                  className="ti-btn ti-btn-primary-full !text-white disabled:opacity-50">
                  {bankLoading ? 'Saving...' : 'Save Bank Details'}
                </button>
              </div>
            </div>
          </div>

          {/* Digital Wallets */}
          <div className="col-span-12 xl:col-span-4">
            <div className="box">
              <div className="box-header"><h4 className="box-title">Digital Wallets</h4></div>
              <div className="box-body space-y-4">
                {bankDetails.wallets?.map((wallet: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold text-[0.875rem]">{wallet.name}</p>
                      <input type="text" value={wallet.id || ''} onChange={e => updateWallet(i, 'id', e.target.value)}
                        className="form-control form-control-sm mt-1" placeholder="Wallet ID / Number" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={wallet.isActive ?? true}
                        onChange={e => updateWallet(i, 'isActive', e.target.checked)}
                        className="form-check-input" />
                      <span className="text-[0.75rem] text-[#8c9097]">Active</span>
                    </label>
                  </div>
                ))}

                <button onClick={() => {
                  const name = prompt('Wallet name (e.g., IME Pay):');
                  if (name) {
                    setBankDetails({
                      ...bankDetails,
                      wallets: [...(bankDetails.wallets || []), { name, id: '', isActive: true }]
                    });
                  }
                }} className="ti-btn ti-btn-light !opacity-100 w-full">
                  <i className="ri-add-line me-1"></i> Add Wallet
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="box mt-4">
              <div className="box-header"><h4 className="box-title">Customer Preview</h4></div>
              <div className="box-body">
                <p className="text-[#8c9097] text-[0.75rem] mb-2">This is what customers see when placing an order:</p>
                <div className="p-3 bg-gray-50 dark:bg-bodybg rounded-lg text-[0.813rem]">
                  {bankDetails.accounts?.[0] && (
                    <div className="space-y-1 mb-2">
                      <p><span className="text-[#8c9097]">Bank:</span> <strong>{bankDetails.accounts[0].bankName || '—'}</strong></p>
                      <p><span className="text-[#8c9097]">A/C:</span> <strong>{bankDetails.accounts[0].accountNumber || '—'}</strong></p>
                      <p><span className="text-[#8c9097]">Name:</span> <strong>{bankDetails.accounts[0].accountName || '—'}</strong></p>
                    </div>
                  )}
                  {bankDetails.wallets?.filter((w: any) => w.isActive).length > 0 && (
                    <p className="text-[#8c9097]">
                      Or pay via {bankDetails.wallets.filter((w: any) => w.isActive).map((w: any) => w.name).join(' · ')}
                    </p>
                  )}
                  {bankDetails.instructions && (
                    <p className="text-warning mt-2 italic">{bankDetails.instructions}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Market Hours Tab */}
      {activeTab === 'market' && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-6">
            <div className="box">
              <div className="box-header">
                <h4 className="box-title">Trading Hours</h4>
                <p className="text-[#8c9097] text-[0.75rem] mt-1">Orders can only be placed during market hours</p>
              </div>
              <div className="box-body space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Market Opens</label>
                    <input type="time" value={marketHours.openTime} onChange={e => setMarketHours({...marketHours, openTime: e.target.value})}
                      className="form-control" />
                  </div>
                  <div>
                    <label className="form-label">Market Closes</label>
                    <input type="time" value={marketHours.closeTime} onChange={e => setMarketHours({...marketHours, closeTime: e.target.value})}
                      className="form-control" />
                  </div>
                </div>

                <div>
                  <label className="form-label">Timezone</label>
                  <select value={marketHours.timezone} onChange={e => setMarketHours({...marketHours, timezone: e.target.value})} className="form-control">
                    <option value="Asia/Kathmandu">Asia/Kathmandu (NPT, UTC+5:45)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Closed Days</label>
                  <div className="flex flex-wrap gap-2">
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                      <label key={day} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer text-[0.813rem] ${
                        marketHours.closedDays?.includes(day) ? 'bg-danger/10 border-danger text-danger' : 'border-gray-200'
                      }`}>
                        <input type="checkbox" checked={marketHours.closedDays?.includes(day) || false}
                          onChange={e => {
                            const days = marketHours.closedDays || [];
                            setMarketHours({
                              ...marketHours,
                              closedDays: e.target.checked ? [...days, day] : days.filter((d: string) => d !== day)
                            });
                          }} className="hidden" />
                        {day.slice(0, 3)}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="form-label">Closed Message (shown to customers)</label>
                  <textarea value={marketHours.closedMessage || ''} onChange={e => setMarketHours({...marketHours, closedMessage: e.target.value})}
                    className="form-control" rows={2} />
                </div>

                <button onClick={handleMarketHoursSave} disabled={marketLoading}
                  className="ti-btn ti-btn-primary-full !text-white disabled:opacity-50">
                  {marketLoading ? 'Saving...' : 'Save Market Hours'}
                </button>
              </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="box">
              <div className="box-header"><h4 className="box-title">Current Status</h4></div>
              <div className="box-body">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-3 h-3 rounded-full ${isMarketOpen(marketHours) ? 'bg-success animate-pulse' : 'bg-danger'}`}></div>
                  <span className="font-semibold text-[1rem]">{isMarketOpen(marketHours) ? 'Market OPEN' : 'Market CLOSED'}</span>
                </div>
                <div className="space-y-2 text-[0.875rem]">
                  <p><span className="text-[#8c9097]">Trading Hours:</span> <strong>{formatTime(marketHours.openTime)} - {formatTime(marketHours.closeTime)} NPT</strong></p>
                  <p><span className="text-[#8c9097]">Timezone:</span> <strong>{marketHours.timezone}</strong></p>
                  <p><span className="text-[#8c9097]">Closed Days:</span> <strong>{marketHours.closedDays?.join(', ') || 'None'}</strong></p>
                </div>
              </div>
            </div>

            <div className="box mt-4">
              <div className="box-header"><h4 className="box-title">Business Rules</h4></div>
              <div className="box-body text-[0.813rem] space-y-3">
                <div className="p-3 bg-info/5 rounded-lg">
                  <p className="font-semibold text-info mb-1">Order &lt; 500g</p>
                  <p className="text-[#8c9097]">100% payment required + 10% making charge</p>
                </div>
                <div className="p-3 bg-success/5 rounded-lg">
                  <p className="font-semibold text-success mb-1">Order &ge; 500g</p>
                  <p className="text-[#8c9097]">50% booking now, 50% on collection + FREE making + FREE delivery</p>
                </div>
                <div className="p-3 bg-warning/5 rounded-lg">
                  <p className="font-semibold text-warning mb-1">Minimum Delivery</p>
                  <p className="text-[#8c9097]">10g minimum for delivery eligibility</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zoho Integration Tab */}
      {activeTab === 'zoho' && (
        <div className="grid grid-cols-12 gap-6">
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
        </div>
      )}
    </Fragment>
  );
};

// Helper: check if market is currently open
function isMarketOpen(hours: any): boolean {
  try {
    const now = new Date();
    const nptOffset = 5 * 60 + 45; // NPT is UTC+5:45
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const nptMinutes = utcMinutes + nptOffset;
    const nptHour = Math.floor(nptMinutes / 60) % 24;
    const nptMin = nptMinutes % 60;

    const [openH, openM] = (hours.openTime || '11:00').split(':').map(Number);
    const [closeH, closeM] = (hours.closeTime || '17:00').split(':').map(Number);

    const currentMin = nptHour * 60 + nptMin;
    const openMin = openH * 60 + openM;
    const closeMin = closeH * 60 + closeM;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const nptDay = days[now.getUTCDay()]; // Approximate — close enough for display

    if (hours.closedDays?.includes(nptDay)) return false;
    return currentMin >= openMin && currentMin < closeMin;
  } catch {
    return false;
  }
}

function formatTime(time: string): string {
  try {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  } catch { return time; }
}

export default SettingsPage;
