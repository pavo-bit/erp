'use client';

import { useMyProfile, useMyAttendance, useSchoolNotices } from '@/lib/student-api-hooks';

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: profileData } = useMyProfile();
  const { data: attendanceData } = useMyAttendance();
  const { data: noticesData } = useSchoolNotices();

  const profile = profileData?.data;
  const attendance = attendanceData?.data || [];
  const notices = noticesData?.data || [];

  // Calculate attendance percentage
  const totalDays = attendance.length;
  const presentDays = attendance.filter((a: any) => a.status === 'PRESENT').length;
  const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {profile?.name}!</h1>
        <p className="text-gray-600 mt-1">
          {profile?.sectionRef?.class?.name} - {profile?.sectionRef?.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Attendance"
          value={`${attendancePercentage}%`}
          icon="📊"
          color="text-green-600"
        />
        <StatCard
          title="Pending Assignments"
          value="0"
          icon="📝"
          color="text-orange-600"
        />
        <StatCard
          title="Upcoming Exams"
          value="0"
          icon="📚"
          color="text-blue-600"
        />
        <StatCard
          title="Fee Due"
          value="₹0"
          icon="💰"
          color="text-red-600"
        />
      </div>

      {/* Recent Notices */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Recent Notices</h2>
        </div>
        <div className="divide-y">
          {notices.slice(0, 3).map((notice: any) => (
            <div key={notice.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{notice.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{notice.content?.substring(0, 100)}...</p>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(notice.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
          {notices.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              No notices available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
