'use client';

import { useState, useEffect } from 'react';
// import { Command } from 'cmdk';

/**
 * Global Search Component (Command Palette)
 * Triggered by Ctrl + K
 * Searches: Students, Teachers, Admissions, Invoices, Classes
 */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center">
          <input 
            type="text" 
            placeholder="Search students, teachers, invoices... (Esc to close)" 
            className="w-full bg-transparent border-none focus:ring-0 text-lg"
            autoFocus
          />
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {/* Mock Results Structure */}
          <div className="p-2 text-sm text-gray-500">Students</div>
          <div className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
            <span className="font-medium">John Doe</span> (Class 10-A)
          </div>
          <div className="p-2 text-sm text-gray-500 mt-2">Teachers</div>
          <div className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
            <span className="font-medium">Sarah Smith</span> (Mathematics)
          </div>
        </div>
      </div>
    </div>
  );
}
