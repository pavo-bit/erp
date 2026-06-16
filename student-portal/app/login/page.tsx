'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall } from '@/lib/student-api-hooks';

export default function LoginPage() {
  const router = useRouter();
  const [admissionNo, setAdmissionNo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiCall('/api/auth/student/login', 'POST', {
        admissionNo,
        password,
      });

      if (result.success) {
        // Check if password change required
        if (result.data?.mustChangePassword) {
          router.push('/profile?forceChange=true');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Student Portal</h1>
          <p className="text-gray-600 mt-2">SSVM College Square</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="admissionNo" className="block text-sm font-medium text-gray-700 mb-2">
              Admission Number
            </label>
            <input
              id="admissionNo"
              type="text"
              value={admissionNo}
              onChange={(e) => setAdmissionNo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your admission number"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Forgot your password? Contact your school administrator.</p>
        </div>
      </div>
    </div>
  );
}
