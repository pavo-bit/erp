"use client";

import { useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/lib/auth-context";

// Fetcher for cookie-authenticated API
const fetcher = (url: string) =>
  fetch(url, { credentials: "include" })
    .then((r) => r.json())
    .then((d) => d.data ?? d);

export default function TransportTrackingPage() {
  const { user } = useAuth();
  const { data: moduleData } = useSWR("/api/v1/schools/me/modules", fetcher);
  const { data: allocationsData, error: allocError, isLoading } = useSWR("/api/v1/transport/allocations", fetcher);

  // Check Scenario: School does not have Transport module enabled
  const isTransportDisabled =
    moduleData?.modules?.some((m: any) => m.module?.code === "TRANSPORT" && !m.isEnabled) ||
    allocError?.code === "MODULE_DISABLED";

  const allocations = Array.isArray(allocationsData) ? allocationsData : [];
  const [selectedIndex, setSelectedIndex] = useState(0);

  const activeAllocation = allocations[selectedIndex];
  const stop = activeAllocation?.stop;
  const route = stop?.route;
  const vehicle = route?.vehicle || activeAllocation?.vehicle;
  const driver = vehicle?.driver;

  if (isTransportDisabled) {
    return (
      <div className="p-12 text-center glass-card border border-amber-200 dark:border-amber-800 rounded-3xl max-w-lg mx-auto mt-10">
        <div className="text-5xl mb-3">🚫</div>
        <h3 className="text-lg font-bold text-amber-800 dark:text-amber-200">Transport Service Not Subscribed</h3>
        <p className="text-sm text-slate-500 mt-2">
          Your school has not enabled the Transport Management module. Please contact the school administrative office for transport inquiries.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Assigned School Commute</h1>
          <p className="text-slate-500 dark:text-slate-400">
            View your student's assigned school bus route, stops, schedules, and driver details.
          </p>
        </div>

        {allocations.length > 1 && (
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-max">
            {allocations.map((alloc: any, idx: number) => (
              <button
                key={alloc.id || idx}
                onClick={() => setSelectedIndex(idx)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedIndex === idx
                    ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {alloc.student?.name || `Student ${idx + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500">Loading transport allocation...</div>
      ) : allocations.length === 0 ? (
        <div className="p-12 text-center glass-card border border-slate-200 dark:border-slate-800 rounded-3xl">
          <div className="text-5xl mb-3">🚌</div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Active Transport Allocation</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2">
            No active school bus allocation is currently mapped to your registered student profile. Contact the school transport desk to request bus allocation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Route & Assigned Vehicle */}
          <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">🚌</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {route?.name || "Assigned Route"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {vehicle?.fleetNumber || "Fleet Bus"}
                  </p>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  activeAllocation?.status === "ACTIVE"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                }`}
              >
                {activeAllocation?.status || "ACTIVE"}
              </span>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Vehicle Registration</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-xs">
                  {vehicle?.registrationNumber || activeAllocation?.vehicle?.registrationNo || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Vehicle Type</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                  {vehicle?.vehicleType || "BUS"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Vehicle Status</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                  {vehicle?.status || "ACTIVE"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Assigned Stop & Schedule */}
          <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🚏</span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {stop?.name || "Assigned Stop"}
                </h3>
                <p className="text-xs text-slate-500">Scheduled Daily Commute</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Morning Pickup</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                  {stop?.pickupTime || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Afternoon Drop-off</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono text-xs">
                  {stop?.dropoffTime || "N/A"}
                </span>
              </div>
              {stop?.fare !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs">Monthly Commute Fare</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    ₹{Number(stop.fare).toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Driver & Contact Info */}
          <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">👨‍✈️</span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {driver?.name || "Assigned Driver"}
                </h3>
                <p className="text-xs text-slate-500">Route Operator</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Driver Contact</span>
                {driver?.phone ? (
                  <a
                    href={`tel:${driver.phone}`}
                    className="font-semibold text-blue-600 hover:underline text-xs"
                  >
                    {driver.phone}
                  </a>
                ) : (
                  <span className="font-medium text-slate-500 text-xs">N/A</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Allocated Student</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  {activeAllocation?.student?.name || "N/A"}
                  {activeAllocation?.student?.rollNo ? ` (${activeAllocation.student.rollNo})` : ""}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Billing Cycle</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                  {activeAllocation?.monthCycle || "MONTHLY"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
