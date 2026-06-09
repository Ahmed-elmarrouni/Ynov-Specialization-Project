import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Shield, Users, Save, Key,
  Phone, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getUserProfile, updateUserProfile, sendPassword2FA,
  changePassword, deleteAccount, toggle2FA
} from '../../services/user';
import { inviteUser } from '../../services/invitations';

const SettingsPage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [is2faLoading, setIs2faLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');

  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', phone_number: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', code: '' });
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'student' });
  const [deletePassword, setDeletePassword] = useState('');

  // Initial fetch and deep linking logic
  useEffect(() => {
    fetchProfile();
    
    // Deep linking logic: parse ?tab=... from URL
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['profile', 'security', 'team', 'danger'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  const fetchProfile = async () => {
    try {
      const data = await getUserProfile();
      setProfile(data);
      setProfileForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone_number: data.phone_number || ''
      });
    } catch (err) {
      toast.error('Failed to load profile');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await updateUserProfile(profileForm);
      toast.success('Profile updated successfully');
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
    }
  };

  const handleToggle2FA = async () => {
    setIs2faLoading(true);
    try {
      await toggle2FA(!profile.is_2fa_enabled);
      toast.success(`2FA ${!profile.is_2fa_enabled ? 'enabled' : 'disabled'}`);
      fetchProfile();
    } catch (err) {
      toast.error('Action failed');
    } finally {
      setIs2faLoading(false);
    }
  };

  const initiatePasswordChange = async (e) => {
    e.preventDefault();
    try {
      await sendPassword2FA();
      toast.success('Security code sent to your email');
      setModalType('password');
      setIsModalOpen(true);
    } catch (err) {
      toast.error('Failed to send code');
    }
  };

  const confirmPasswordChange = async () => {
    try {
      await changePassword({
        current_password: passwordForm.current,
        new_password: passwordForm.new,
        two_factor_code: passwordForm.code
      });
      toast.success('Password changed successfully');
      setIsModalOpen(false);
      setPasswordForm({ current: '', new: '', code: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Verification failed');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      await inviteUser(inviteForm.email, inviteForm.role);
      toast.success(`Invitation sent to ${inviteForm.email}`);
      setInviteForm({ email: '', role: 'student' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invitation failed');
    }
  };

  const handleAccountDeletion = async () => {
    try {
      await deleteAccount(deletePassword);
      toast.success('Account deleted');
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Incorrect password');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'team', label: 'Team', icon: Users, roles: ['admin', 'pedagogical_manager'] },
    { id: 'danger', label: 'Danger Zone', icon: ShieldAlert },
  ];

  const filteredTabs = tabs.filter(t => !t.roles || t.roles.includes(profile?.role));

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 grid grid-cols-1 md:grid-cols-12 gap-8">

      {/* Sidebar Navigation */}
      <div className="md:col-span-3 space-y-2">
        {filteredTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${activeTab === tab.id
              ? 'bg-primary text-surface shadow-lg shadow-primary/20'
              : 'text-text-muted hover:bg-surface hover:text-text-main'
              }`}
          >
            <tab.icon className="w-4 h-4 mr-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="md:col-span-9">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-surface/50 backdrop-blur-md border border-border/50 rounded-2xl p-8 shadow-sm h-auto"
          >
            {activeTab === 'profile' && (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <h3 className="text-xl font-bold text-secondary mb-6 flex items-center">
                  <User className="w-5 h-5 mr-2 text-primary" /> Profile Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">First Name</label>
                    <input type="text" value={profileForm.first_name} onChange={e => setProfileForm({ ...profileForm, first_name: e.target.value })} className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">Last Name</label>
                    <input type="text" value={profileForm.last_name} onChange={e => setProfileForm({ ...profileForm, last_name: e.target.value })} className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-text-muted mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input type="text" value={profileForm.phone_number} onChange={e => setProfileForm({ ...profileForm, phone_number: e.target.value })} className="w-full pl-10 pr-4 py-2.5 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                  </div>
                </div>
                <button type="submit" className="flex items-center px-6 py-2.5 bg-primary text-surface rounded-xl font-medium hover:bg-primary/90 transition-all cursor-pointer">
                  <Save className="w-4 h-4 mr-2" /> Save Changes
                </button>
              </form>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between p-6 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mr-4">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-secondary">Two-Factor Authentication</h4>
                      <p className="text-sm text-text-muted">Adds an extra layer of security.</p>
                    </div>
                  </div>
                  <button onClick={handleToggle2FA} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${profile?.is_2fa_enabled ? 'bg-primary' : 'bg-text-muted/30'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-surface transition-transform ${profile?.is_2fa_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <form onSubmit={initiatePasswordChange} className="space-y-6 pt-4">
                  <h3 className="text-lg font-bold text-secondary flex items-center"><Key className="w-5 h-5 mr-2 text-primary" /> Change Password</h3>
                  <div className="space-y-4 max-w-md">
                    <input type="password" placeholder="Current Password" required value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl outline-none" />
                    <input type="password" placeholder="New Password" required value={passwordForm.new} onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })} className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl outline-none" />
                    <button type="submit" className="w-full py-2.5 bg-secondary text-surface rounded-xl font-medium hover:opacity-90 cursor-pointer">Request Change</button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'team' && (
              <form onSubmit={handleInvite} className="space-y-6">
                <h3 className="text-xl font-bold text-secondary flex items-center"><Users className="w-5 h-5 mr-2 text-primary" /> Team Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                  <input type="email" placeholder="Email Address" required value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl outline-none" />
                  <select value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })} className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl outline-none">
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="pedagogical_manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button type="submit" className="flex items-center px-8 py-2.5 bg-primary text-surface rounded-xl font-medium cursor-pointer">Send Invitation</button>
              </form>
            )}

            {activeTab === 'danger' && (
              <div className="p-6 bg-error/5 border border-error/10 rounded-2xl">
                <h3 className="text-xl font-bold text-error flex items-center mb-4"><AlertTriangle className="w-5 h-5 mr-2" /> Danger Zone</h3>
                <button onClick={() => { setModalType('delete'); setIsModalOpen(true); }} className="px-6 py-2.5 bg-error text-surface rounded-xl font-medium cursor-pointer">Delete My Account</button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modal System */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-secondary/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <div className="relative bg-surface rounded-3xl p-8 max-w-sm w-full border border-border">
              {modalType === 'password' ? (
                <>
                  <h4 className="text-xl font-bold text-secondary mb-4">Verify Change</h4>
                  <input type="text" maxLength={6} placeholder="123 456" value={passwordForm.code} onChange={e => setPasswordForm({ ...passwordForm, code: e.target.value })} className="w-full text-center text-2xl py-3 bg-background border border-border rounded-xl mb-6 outline-none" />
                  <div className="flex gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 text-text-muted font-medium cursor-pointer">Cancel</button>
                    <button onClick={confirmPasswordChange} className="flex-1 py-2.5 bg-primary text-surface rounded-xl font-bold cursor-pointer">Verify</button>
                  </div>
                </>
              ) : (
                <>
                  <h4 className="text-xl font-bold text-error mb-4">Confirm Deletion</h4>
                  <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} placeholder="Enter password" className="w-full py-3 px-4 bg-background border border-border rounded-xl mb-6 outline-none" />
                  <div className="flex gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 text-text-muted font-medium cursor-pointer">Keep</button>
                    <button onClick={handleAccountDeletion} className="flex-1 py-2.5 bg-error text-surface rounded-xl font-bold cursor-pointer">Delete Forever</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
