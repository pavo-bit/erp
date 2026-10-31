import useSWR from 'swr';

async function fetchWithCsrf(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (typeof window !== 'undefined') {
    const token = window.sessionStorage.getItem('csrfToken');
    if (token && !['GET', 'HEAD', 'OPTIONS'].includes((init.method || 'GET').toUpperCase())) headers.set('X-CSRF-Token', token);
  }
  const response = await fetch(input, { ...init, headers });
  const token = response.headers.get('X-CSRF-Token');
  if (token && typeof window !== 'undefined') window.sessionStorage.setItem('csrfToken', token);
  return response;
}

const fetcher = (url: string) =>
  fetchWithCsrf(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    credentials: 'include', // sends httpOnly cookies
  }).then(res => res.json());

export const apiCall = async (url: string, method: string, body?: object) => {
  const res = await fetchWithCsrf(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
};

// Self-profile
export const useMyProfile = () =>
  useSWR('/api/students/me', fetcher);

// Attendance (last 30 days by default)
export const useMyAttendance = (params?: string) =>
  useSWR(`/api/attendance?${params || ''}`, fetcher);

// Exams for my class
export const useMyExams = (classId: string) =>
  useSWR(classId ? `/api/exams?classId=${classId}` : null, fetcher);

// Report card for a specific exam
export const useMyReportCard = (examId: string, studentId: string) =>
  useSWR(examId && studentId ? `/api/exams/${examId}/report-card/${studentId}` : null, fetcher);

// My invoices
export const useMyInvoices = () =>
  useSWR('/api/invoices', fetcher);

// My assignments
export const useMyAssignments = (sectionId: string) =>
  useSWR(sectionId ? `/api/assignments?sectionId=${sectionId}` : null, fetcher);

// My study materials
export const useMyStudyMaterials = (classId: string) =>
  useSWR(classId ? `/api/assignments/study-materials?classId=${classId}` : null, fetcher);

// My timetable
export const useMyTimetable = (sectionId: string) =>
  useSWR(sectionId ? `/api/timetable?sectionId=${sectionId}` : null, fetcher);

// School notices (public+auth scoped)
export const useSchoolNotices = () =>
  useSWR('/api/notices', fetcher);

// School events (public)
export const useSchoolEvents = () =>
  useSWR('/api/events', fetcher);

// Library — my issued books
export const useMyBooks = (studentId: string) =>
  useSWR(studentId ? `/api/library/issues?studentId=${studentId}` : null, fetcher);
