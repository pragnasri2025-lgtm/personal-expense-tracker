import { useState, type FormEvent } from 'react';
import { Check, Lock, User } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { CURRENCY_OPTIONS, type UserProfile } from '../types';

interface ProfileViewProps {
  user: UserProfile;
  onUserUpdated: (user: UserProfile) => void;
}

export function ProfileView({ user, onUserUpdated }: ProfileViewProps) {
  const [name, setName] = useState(user.Name);
  const [currency, setCurrency] = useState(user.Currency);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileSaving(true);
    try {
      const res = await apiRequest<{ user: UserProfile }>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, currency }),
      });
      onUserUpdated(res.user);
      setProfileSuccess('Profile settings updated successfully.');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword !== confirmPassword) {
      setPwError('New password and confirmation do not match.');
      return;
    }

    setPwSaving(true);
    try {
      await apiRequest('/api/profile/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwSuccess('Password changed successfully.');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Unable to change password.');
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Account Details Form */}
      <div className="bg-white border border-[#E5DEC9] rounded-xl p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#F2EDE0]">
          <div className="w-10 h-10 rounded-lg bg-[#A6C8E2]/45 flex items-center justify-center text-[#173247]">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-[#173247]">
              Profile &amp; Currency Preferences
            </h2>
            <p className="text-xs text-[#4E6B82]">
              Account ID #{user.User_ID} · {user.Email}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
          {profileError && (
            <div
              role="alert"
              className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-4 py-2.5 text-sm text-[#B91C1C]"
            >
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="rounded-lg bg-[#EFF6FA] border border-[#A6C8E2] px-4 py-2.5 text-sm text-[#1D3E58] flex items-center gap-2">
              <Check className="w-4 h-4 text-[#619DC6]" />
              <span>{profileSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-name" className="block text-sm font-medium text-[#1D3E58] mb-1.5">
                Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#D8D0BC] bg-white text-sm text-[#173247] focus:outline-none focus:ring-2 focus:ring-[#619DC6]/35"
              />
            </div>

            <div>
              <label
                htmlFor="profile-currency"
                className="block text-sm font-medium text-[#1D3E58] mb-1.5"
              >
                Display Currency
              </label>
              <select
                id="profile-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#D8D0BC] bg-white text-sm text-[#173247] focus:outline-none focus:ring-2 focus:ring-[#619DC6]/35"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={profileSaving}
              className="h-10 px-5 rounded-lg bg-[#1D3E58] hover:bg-[#173247] disabled:opacity-60 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              {profileSaving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Password Update Form */}
      <div className="bg-white border border-[#E5DEC9] rounded-xl p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#F2EDE0]">
          <div className="w-10 h-10 rounded-lg bg-[#F4BAA3]/45 flex items-center justify-center text-[#173247]">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-[#173247]">
              Security &amp; Password
            </h2>
            <p className="text-xs text-[#4E6B82]">
              Update your account password. Passwords are protected with salted scrypt hashing.
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
          {pwError && (
            <div
              role="alert"
              className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-4 py-2.5 text-sm text-[#B91C1C]"
            >
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="rounded-lg bg-[#EFF6FA] border border-[#A6C8E2] px-4 py-2.5 text-sm text-[#1D3E58] flex items-center gap-2">
              <Check className="w-4 h-4 text-[#619DC6]" />
              <span>{pwSuccess}</span>
            </div>
          )}

          <div>
            <label htmlFor="pw-current" className="block text-sm font-medium text-[#1D3E58] mb-1.5">
              Current Password
            </label>
            <input
              id="pw-current"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#D8D0BC] bg-white text-sm text-[#173247] focus:outline-none focus:ring-2 focus:ring-[#619DC6]/35"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pw-new" className="block text-sm font-medium text-[#1D3E58] mb-1.5">
                New Password
              </label>
              <input
                id="pw-new"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#D8D0BC] bg-white text-sm text-[#173247] focus:outline-none focus:ring-2 focus:ring-[#619DC6]/35"
              />
            </div>

            <div>
              <label
                htmlFor="pw-confirm"
                className="block text-sm font-medium text-[#1D3E58] mb-1.5"
              >
                Confirm New Password
              </label>
              <input
                id="pw-confirm"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#D8D0BC] bg-white text-sm text-[#173247] focus:outline-none focus:ring-2 focus:ring-[#619DC6]/35"
              />
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={pwSaving}
              className="h-10 px-5 rounded-lg bg-[#1D3E58] hover:bg-[#173247] disabled:opacity-60 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              {pwSaving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
