'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiCall } from '@/lib/student-api-hooks';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/attendance', label: 'Attendance', icon: '📅' },
  { href: '/results', label: 'Results', icon: '📊' },
  { href: '/fees', label: 'Fees', icon: '💰' },
  { href: '/assignments', label: 'Assignments', icon: '📝' },
  { href: '/timetable', label: 'Timetable', icon: '🕐' },
  { href: '/notices', label: 'Notices', icon: '📢' },
  { href: '/library', label: 'Library', icon: '📚' },
  { href: '/profile', label: 'Profile', icon: '👤' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await apiCall('/api/auth/logout', 'POST');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Student Portal</h1>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-700 hover:text-gray-900 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm min-h-screen">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
