'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMyProfile, apiCall } from '@/lib/student-api-hooks';

function ProfileContent() {
  const searchParams = useSearchParams();
  const forceChange = searchParams?.get('forceChange') === 'true';
  const { data: profile } = useMyProfile();
  
  const [showPasswordForm, setShowPasswordForm] = useState(forceChange);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const result = await apiCall('/api/auth/change-password', 'POST', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (result.success) {
        setMessage('Password changed successfully. Please log in again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(result.error || 'Failed to change password');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>

      {forceChange && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-medium">
            ⚠️ You must change your password before continuing to use the portal.
          </p>
        </div>
      )}

      {/* Profile Information */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-600">Name</label>
            <p className="mt-1 text-gray-900">{profile?.data?.name || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Admission Number</label>
            <p className="mt-1 text-gray-900">{profile?.data?.admissionNo || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Roll Number</label>
            <p className="mt-1 text-gray-900">{profile?.data?.rollNo || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Class</label>
            <p className="mt-1 text-gray-900">
              {profile?.data?.sectionRef?.class?.name || '-'} - {profile?.data?.sectionRef?.name || '-'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Date of Birth</label>
            <p className="mt-1 text-gray-900">
              {profile?.data?.dob ? new Date(profile.data.dob).toLocaleDateString() : '-'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Blood Group</label>
            <p className="mt-1 text-gray-900">{profile?.data?.bloodGroup || '-'}</p>
          </div>
        </div>
      </div>

      {/* Guardian Information */}
      {profile?.data?.guardian && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Guardian Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600">Primary Name</label>
              <p className="mt-1 text-gray-900">{profile.data.guardian.primaryName || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Primary Phone</label>
              <p className="mt-1 text-gray-900">{profile.data.guardian.primaryPhone || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Email</label>
              <p className="mt-1 text-gray-900">{profile.data.guardian.primaryEmail || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Relation</label>
              <p className="mt-1 text-gray-900">{profile.data.guardian.primaryRelation || '-'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
          {!showPasswordForm && !forceChange && (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Change Password
            </button>
          )}
        </div>

        {showPasswordForm && (
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {message}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be 8+ characters with 1 uppercase, 1 number, 1 special character
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Change Password
              </button>
              {!forceChange && (
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(false)}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}



export default function ProfilePage() {
  return (
    <React.Suspense fallback={<div>Loading profile...</div>}>
      <ProfileContent />
    </React.Suspense>
  );
}

