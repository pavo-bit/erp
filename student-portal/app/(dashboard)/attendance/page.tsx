'use client';

import { useMyAttendance } from '@/lib/student-api-hooks';
import { useState } from 'react';

export default function AttendancePage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const { data } = useMyAttendance(`month=${month}`);
  const attendance = data?.data || [];

  // Calculate statistics
  const present = attendance.filter((a: any) => a.status === 'PRESENT').length;
  const absent = attendance.filter((a: any) => a.status === 'ABSENT').length;
  const late = attendance.filter((a: any) => a.status === 'LATE').length;
  const total = attendance.length;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-800';
      case 'ABSENT':
        return 'bg-red-100 text-red-800';
      case 'LATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'HOLIDAY':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-600 mt-1">Track your attendance record</p>
      </div>

      {/* Month Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Select Month:</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <p className="text-sm font-medium text-green-600">Present</p>
          <p className="text-3xl font-bold text-green-700 mt-2">{present}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-6 border border-red-200">
          <p className="text-sm font-medium text-red-600">Absent</p>
          <p className="text-3xl font-bold text-red-700 mt-2">{absent}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
          <p className="text-sm font-medium text-yellow-600">Late</p>
          <p className="text-3xl font-bold text-yellow-700 mt-2">{late}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <p className="text-sm font-medium text-blue-600">Attendance %</p>
          <p className="text-3xl font-bold text-blue-700 mt-2">{percentage}%</p>
        </div>
      </div>

      {/* Attendance List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Attendance Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendance.map((record: any) => (
                <tr key={record.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(record.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {record.remarks || '-'}
                  </td>
                </tr>
              ))}
              {attendance.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    No attendance records found for this month
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
