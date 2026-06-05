"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useFaculty } from "@/lib/api-hooks";

const deptColors: Record<string, string> = {
  "Administration": "from-orange-500 to-orange-600",
  "Mathematics": "from-blue-500 to-blue-600",
  "English & Social Science": "from-purple-500 to-purple-600",
  "Science": "from-green-500 to-green-600",
  "Computer Science": "from-yellow-500 to-yellow-600",
  "Hindi": "from-red-500 to-red-600",
  "Default": "from-gray-500 to-gray-600"
};

type TabType = "acharya" | "acharyaa" | "support";

export function FacultySection() {
  const { data: raw, isLoading } = useFaculty();
  const [activeTab, setActiveTab] = useState<TabType>("acharya");

  const facultyList = Array.isArray(raw) ? raw : raw?.data || raw || [];

  const acharyas = facultyList.filter((f: any) => f.department === "Acharya");
  const acharyaaStaff = facultyList.filter((f: any) => f.department === "Acharyaa");
  const supportStaff = facultyList.filter((f: any) => f.department === "Sebaka/Sebika");

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const currentList = 
    activeTab === "acharya" ? acharyas :
    activeTab === "acharyaa" ? acharyaaStaff : supportStaff;

  const tabs = [
    { id: "acharya", label: "ଆଚାର୍ଯ୍ୟ (Acharya)" },
    { id: "acharyaa", label: "ଆଚାର୍ଯ୍ୟା (Acharyaa)" },
    { id: "support", label: "ସେବକ/ସେବିକା (Sebaka/Sebika)" },
  ];

  return (
    <section className="py-16 bg-[#f8f9fc]">
      <div className="max-w-[1600px] mx-auto px-[5%]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold mb-4 uppercase tracking-wider">
            Our Mentors
          </div>
          <h2 className="text-[clamp(28px,4vw,44px)] font-bold text-[#0A1628] mb-3">Meet Our Faculty</h2>
          <p className="text-gray-500 text-lg max-w-[600px] mx-auto">
            Experienced, passionate, and dedicated educators committed to shaping the future of our students.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {tabs.map((tab) => {
            const listLen = 
              tab.id === "acharya" ? acharyas.length :
              tab.id === "acharyaa" ? acharyaaStaff.length : supportStaff.length;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as TabType)}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all border-none cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25"
                    : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm"
                }`}
                style={{ border: activeTab === tab.id ? "none" : "1px solid #e5e7eb" }}
              >
                {tab.label} ({listLen})
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="text-4xl mb-4">👨‍🏫</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Faculty Found in this section</h3>
            <p className="text-gray-500">New faculty members will appear here once added from the dashboard.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
            {/* Vertical Scrolling Grid (Max 2 Rows Visible) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-8 pt-4 px-2 overflow-y-auto custom-scrollbar w-full" style={{ maxHeight: '820px' }}>
              {currentList.map((faculty: any, index: number) => {
                const bgGradient = deptColors[faculty.department] || deptColors["Default"];
                return (
                  <motion.div
                    key={faculty.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all group cursor-pointer border border-gray-100 flex flex-col items-center text-center relative overflow-hidden w-full"
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${bgGradient}`} />

                    <div className="w-32 h-32 rounded-full bg-gray-50 border-[3px] border-white shadow-md flex items-center justify-center text-5xl mb-4 relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
                      {faculty.photo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={`http://localhost:5000${faculty.photo}`} alt={faculty.name} className="w-full h-full object-cover" crossOrigin="anonymous" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '🧑‍🏫'; }} />
                      ) : (
                        "🧑‍🏫"
                      )}
                    </div>

                    <h3 className="text-[#0A1628] text-[17px] font-bold mb-1 line-clamp-1">{faculty.name}</h3>

                    <div className="flex items-center gap-2 mb-4">
                      <span className={`text-[11px] uppercase tracking-wider font-bold text-transparent bg-clip-text bg-gradient-to-r ${bgGradient}`}>
                        {faculty.designation}
                      </span>
                    </div>

                    <div className="w-full h-[1px] bg-gray-100 mb-4" />

                    <div className="flex flex-col gap-2.5 text-[13px] text-gray-600 w-full">
                      {faculty.department && (
                        <div className="flex items-center justify-start gap-3 bg-gray-50 px-3 py-2 rounded-lg">
                          <span className="text-gray-400">🏛️</span>
                          <span className="font-medium text-left line-clamp-1">{faculty.department}</span>
                        </div>
                      )}
                      {faculty.qualification && (
                        <div className="flex items-center justify-start gap-3 bg-gray-50 px-3 py-2 rounded-lg">
                          <span className="text-gray-400">🎓</span>
                          <span className="font-medium text-left line-clamp-1">{faculty.qualification}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}} />
    </section>
  );
}
