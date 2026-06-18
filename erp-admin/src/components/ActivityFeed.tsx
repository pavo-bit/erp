"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiCall } from "@/lib/api-hooks";
import { Bell, CheckCircle, FileText, UserPlus, CreditCard, Calendar } from "lucide-react";

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  createdAt: string;
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await apiCall("/api/v1/stats/activity-feed?limit=10");
        if (res.success) {
          setActivities(res.data);
        }
      } catch (err) {
        console.error("Failed to load activity", err);
      } finally {
        setLoading(false);
      }
    }
    fetchActivity();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "ADMISSION": return <UserPlus className="h-5 w-5 text-blue-500" />;
      case "PAYMENT": return <CreditCard className="h-5 w-5 text-green-500" />;
      case "RESULT": return <FileText className="h-5 w-5 text-purple-500" />;
      case "ATTENDANCE": return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case "NOTICE": return <Bell className="h-5 w-5 text-amber-500" />;
      default: return <Calendar className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "ADMISSION": return "bg-blue-500/10 border-blue-500/20";
      case "PAYMENT": return "bg-green-500/10 border-green-500/20";
      case "RESULT": return "bg-purple-500/10 border-purple-500/20";
      case "ATTENDANCE": return "bg-emerald-500/10 border-emerald-500/20";
      case "NOTICE": return "bg-amber-500/10 border-amber-500/20";
      default: return "bg-gray-500/10 border-gray-500/20";
    }
  };

  if (loading) {
    return <div className="p-4 flex justify-center"><div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-2 bg-slate-700 rounded w-3/4"></div><div className="h-2 bg-slate-700 rounded w-5/6"></div></div></div></div>;
  }

  if (activities.length === 0) {
    return <div className="p-6 text-center text-slate-400">No recent activities</div>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, i) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`flex items-start gap-4 p-4 rounded-xl border ${getBgColor(activity.type)}`}
        >
          <div className="p-2 rounded-full bg-slate-800/50">
            {getIcon(activity.type)}
          </div>
          <div>
            <h4 className="font-medium text-slate-200">{activity.title}</h4>
            {activity.description && (
              <p className="text-sm text-slate-400 mt-1">{activity.description}</p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              {new Date(activity.createdAt).toLocaleString()}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
