"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useHostelStats,
  useHostelRooms,
  useHostelRoom,
  useStudents,
  useSchoolModules,
  apiCall,
  invalidate,
} from "@/lib/api-hooks";
import { PageHeader, StatCard, StatusBadge } from "@/components/DashboardLayout";

interface HostelAllocation {
  id: string;
  studentId: string;
  roomId: string;
  startDate: string;
  endDate?: string | null;
  status: "ACTIVE" | "CHECKED_OUT" | "TRANSFERRED";
  student: {
    id: string;
    name: string;
    rollNo?: string;
    admissionNo?: string;
    gender?: string;
    avatar?: string;
    phone?: string;
    class?: { id: string; name: string };
    section?: { id: string; name: string };
    guardians?: Array<{ guardian: { name: string; phone: string; relationship: string } }>;
  };
}

interface HostelRoomItem {
  id: string;
  building: string;
  roomNumber: string;
  capacity: number;
  gender: "MALE" | "FEMALE" | "COED";
  status: "AVAILABLE" | "OCCUPIED" | "FULL" | "MAINTENANCE";
  activeCount: number;
  availableBeds: number;
  floor?: string | null;
  roomType?: string | null;
  allocations?: HostelAllocation[];
}

export default function HostelManagementPage() {
  const { data: moduleData } = useSchoolModules();
  const { data: statsData, isLoading: statsLoading } = useHostelStats();
  const { data: roomsData, isLoading: roomsLoading } = useHostelRooms();
  const { data: studentsData } = useStudents();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("ALL");
  const [selectedGender, setSelectedGender] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Modals
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<HostelRoomItem | null>(null);
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [transferAllocation, setTransferAllocation] = useState<HostelAllocation | null>(null);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);

  // Form states
  const [roomFormData, setRoomFormData] = useState({
    building: "",
    roomNumber: "",
    capacity: 4,
    gender: "COED",
    status: "AVAILABLE",
    floor: "",
    roomType: "",
  });

  const [allocateFormData, setAllocateFormData] = useState({
    studentId: "",
    roomId: "",
    startDate: new Date().toISOString().split("T")[0],
  });

  const [transferTargetRoomId, setTransferTargetRoomId] = useState("");
  const [studentFormData, setStudentFormData] = useState({
    name: "",
    phone: "",
    medicalConditions: "",
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Entitlement Check
  const isHostelEnabled = useMemo(() => {
    if (!moduleData) return true;
    const modules = moduleData.modules ?? moduleData;
    if (Array.isArray(modules)) {
      const found = modules.find(
        (m: any) =>
          m.module?.code?.toUpperCase() === "HOSTEL" ||
          m.module?.id?.toUpperCase() === "HOSTEL" ||
          m.code?.toUpperCase() === "HOSTEL" ||
          m.id?.toUpperCase() === "HOSTEL"
      );
      return found ? Boolean(found.isEnabled ?? found.enabled) : true;
    }
    if (typeof modules === "object" && modules !== null) {
      if (modules.HOSTEL !== undefined) return Boolean(modules.HOSTEL);
      if (modules.hostel !== undefined) return Boolean(modules.hostel);
    }
    return true;
  }, [moduleData]);

  const rooms: HostelRoomItem[] = useMemo(() => {
    if (!roomsData) return [];
    return Array.isArray(roomsData) ? roomsData : [];
  }, [roomsData]);

  const students = useMemo(() => {
    if (!studentsData) return [];
    return Array.isArray(studentsData) ? studentsData : [];
  }, [studentsData]);

  // Dynamic Building list
  const buildingOptions = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => {
      if (r.building) set.add(r.building);
    });
    return Array.from(set).sort();
  }, [rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (selectedBuilding !== "ALL" && r.building !== selectedBuilding) return false;
      if (selectedGender !== "ALL" && r.gender !== selectedGender) return false;
      if (selectedStatus !== "ALL" && r.status !== selectedStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRoom =
          r.roomNumber.toLowerCase().includes(q) ||
          r.building.toLowerCase().includes(q);
        const matchesStudent = r.allocations?.some((a) =>
          a.student?.name?.toLowerCase().includes(q)
        );
        if (!matchesRoom && !matchesStudent) return false;
      }
      return true;
    });
  }, [rooms, selectedBuilding, selectedGender, selectedStatus, searchQuery]);

  // Selected room details (SWR)
  const { data: activeRoomDetail, mutate: mutateActiveRoom } = useHostelRoom(selectedRoomId);

  // Handlers
  const handleSaveRoom = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const payload = {
        building: roomFormData.building.trim(),
        roomNumber: roomFormData.roomNumber.trim(),
        capacity: Number(roomFormData.capacity),
        gender: roomFormData.gender,
        status: roomFormData.status,
        floor: roomFormData.floor.trim() || null,
        roomType: roomFormData.roomType.trim() || null,
      };

      if (editingRoom) {
        await apiCall(`/api/v1/ancillary/hostel/rooms/${editingRoom.id}`, "PUT", payload);
      } else {
        await apiCall("/api/v1/ancillary/hostel/rooms", "POST", payload);
      }
      invalidate("/api/v1/ancillary/hostel/rooms");
      invalidate("/api/v1/ancillary/hostel/stats");
      setIsAddRoomOpen(false);
      setEditingRoom(null);
    } catch (err: any) {
      setActionError(err.message || "Failed to save room");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAllocateStudent = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await apiCall("/api/v1/ancillary/hostel/allocate", "POST", {
        studentId: allocateFormData.studentId,
        roomId: allocateFormData.roomId,
        startDate: allocateFormData.startDate,
      });
      invalidate("/api/v1/ancillary/hostel/rooms");
      invalidate("/api/v1/ancillary/hostel/stats");
      if (selectedRoomId) mutateActiveRoom();
      setIsAllocateOpen(false);
      setAllocateFormData({ studentId: "", roomId: "", startDate: new Date().toISOString().split("T")[0] });
    } catch (err: any) {
      setActionError(err.message || "Failed to allocate student bed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckoutStudent = async (allocationId: string) => {
    if (!confirm("Are you sure you want to check out this student from the hostel?")) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await apiCall(`/api/v1/ancillary/hostel/allocations/${allocationId}/checkout`, "PUT", {
        endDate: new Date().toISOString(),
      });
      invalidate("/api/v1/ancillary/hostel/rooms");
      invalidate("/api/v1/ancillary/hostel/stats");
      if (selectedRoomId) mutateActiveRoom();
    } catch (err: any) {
      alert(err.message || "Checkout failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferStudent = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!transferAllocation || !transferTargetRoomId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await apiCall(`/api/v1/ancillary/hostel/allocations/${transferAllocation.id}/transfer`, "PUT", {
        targetRoomId: transferTargetRoomId,
      });
      invalidate("/api/v1/ancillary/hostel/rooms");
      invalidate("/api/v1/ancillary/hostel/stats");
      if (selectedRoomId) mutateActiveRoom();
      setTransferAllocation(null);
      setTransferTargetRoomId("");
    } catch (err: any) {
      setActionError(err.message || "Room transfer failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveStudentProfile = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await apiCall(`/api/v1/students/${editingStudent.id}`, "PUT", {
        name: studentFormData.name,
        phone: studentFormData.phone,
        medicalConditions: studentFormData.medicalConditions,
      });
      invalidate(`/api/v1/students/${editingStudent.id}`);
      if (selectedRoomId) mutateActiveRoom();
      setEditingStudent(null);
    } catch (err: any) {
      setActionError(err.message || "Failed to update student profile");
    } finally {
      setActionLoading(false);
    }
  };

  if (!isHostelEnabled) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-border shadow-sm max-w-xl mx-auto my-12">
        <span className="text-5xl block mb-4">🛏️</span>
        <h2 className="text-xl font-bold text-text-primary mb-2">Hostel Module Disabled</h2>
        <p className="text-sm text-text-secondary mb-6">
          The Hostel &amp; Dormitory Management module is currently not entitled or enabled for your institution.
          Please contact your SaaS Super Administrator to activate hostel features.
        </p>
        <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
          Entitlement: HOSTEL (Inactive)
        </span>
      </div>
    );
  }

  const stats = statsData || {
    totalBuildings: 0,
    totalRooms: 0,
    totalCapacity: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    fullRooms: 0,
    maintenanceRooms: 0,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Hostel Management"
        subtitle="Manage dormitory blocks, room capacities, resident student allocations, and checkouts."
        action={
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditingRoom(null);
                setRoomFormData({
                  building: "",
                  roomNumber: "",
                  capacity: 4,
                  gender: "COED",
                  status: "AVAILABLE",
                  floor: "",
                  roomType: "",
                });
                setActionError(null);
                setIsAddRoomOpen(true);
              }}
              className="px-4 py-2 bg-white text-text-primary border border-border rounded-lg text-sm font-semibold hover:bg-surface transition shadow-sm"
            >
              + Add Room
            </button>
            <button
              onClick={() => {
                setAllocateFormData({
                  studentId: "",
                  roomId: rooms[0]?.id || "",
                  startDate: new Date().toISOString().split("T")[0],
                });
                setActionError(null);
                setIsAllocateOpen(true);
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition shadow-sm"
            >
              + Allocate Bed
            </button>
          </div>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon="🏢"
          label="Total Buildings"
          value={statsLoading ? "..." : String(stats.totalBuildings)}
          color="#3B82F6"
        />
        <StatCard
          icon="🚪"
          label="Total Rooms"
          value={statsLoading ? "..." : String(stats.totalRooms)}
          color="#6366F1"
        />
        <StatCard
          icon="🛏️"
          label="Total Capacity"
          value={statsLoading ? "..." : `${stats.totalCapacity} beds`}
          color="#10B981"
        />
        <StatCard
          icon="👤"
          label="Occupied Beds"
          value={statsLoading ? "..." : String(stats.occupiedBeds)}
          color="#F59E0B"
        />
        <StatCard
          icon="✨"
          label="Available Beds"
          value={statsLoading ? "..." : String(stats.availableBeds)}
          color="#14B8A6"
        />
        <StatCard
          icon="🛠️"
          label="In Maintenance"
          value={statsLoading ? "..." : String(stats.maintenanceRooms)}
          color="#EF4444"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full md:w-auto relative">
          <span className="absolute left-3 top-2.5 text-text-secondary text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search by room #, building, or student..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Building Filter */}
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none"
          >
            <option value="ALL">All Buildings</option>
            {buildingOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Gender Filter */}
          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none"
          >
            <option value="ALL">All Gender Policies</option>
            <option value="MALE">Boys (Male Only)</option>
            <option value="FEMALE">Girls (Female Only)</option>
            <option value="COED">Co-Ed (Open)</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none"
          >
            <option value="ALL">All Room Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Partially Occupied</option>
            <option value="FULL">Full</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Room Grid */}
      {roomsLoading ? (
        <div className="py-20 text-center text-text-secondary">Loading hostel rooms and allocations...</div>
      ) : filteredRooms.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-dashed border-border p-8">
          <span className="text-4xl block mb-2">🛏️</span>
          <h3 className="text-base font-bold text-text-primary mb-1">No Rooms Match Filters</h3>
          <p className="text-xs text-text-secondary mb-4">
            Try adjusting search terms, building selections, or create a new room.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedBuilding("ALL");
              setSelectedGender("ALL");
              setSelectedStatus("ALL");
            }}
            className="text-xs text-primary font-semibold hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            const occupancyRate = room.capacity > 0 ? (room.activeCount / room.capacity) * 100 : 0;
            const statusColor =
              room.status === "AVAILABLE"
                ? "#10B981"
                : room.status === "OCCUPIED"
                ? "#3B82F6"
                : room.status === "FULL"
                ? "#8B5CF6"
                : "#EF4444";

            return (
              <motion.div
                key={room.id}
                whileHover={{ y: -2 }}
                className="bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition p-4 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Room Number & Status */}
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                        {room.building}
                      </span>
                      <h4 className="text-base font-bold text-text-primary">Room {room.roomNumber}</h4>
                    </div>
                    <StatusBadge status={room.status} color={statusColor} />
                  </div>

                  {/* Gender Policy & Metadata Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        room.gender === "MALE"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : room.gender === "FEMALE"
                          ? "bg-pink-50 text-pink-700 border border-pink-200"
                          : "bg-purple-50 text-purple-700 border border-purple-200"
                      }`}
                    >
                      {room.gender === "MALE" ? "👦 Boys" : room.gender === "FEMALE" ? "👧 Girls" : "👥 Co-Ed"}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                      Floor: {room.floor || "N/A"}
                    </span>
                    {room.roomType && (
                      <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                        {room.roomType}
                      </span>
                    )}
                    <span className="text-[11px] text-text-secondary ml-auto">
                      {room.availableBeds} bed{room.availableBeds !== 1 ? "s" : ""} free
                    </span>
                  </div>

                  {/* Occupancy Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[11px] text-text-secondary mb-1">
                      <span>Occupancy</span>
                      <span className="font-semibold text-text-primary">
                        {room.activeCount} / {room.capacity}
                      </span>
                    </div>
                    <div className="w-full bg-surface rounded-full h-2 overflow-hidden border border-border/50">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(occupancyRate, 100)}%`,
                          background: statusColor,
                        }}
                      />
                    </div>
                  </div>

                  {/* Member Preview Avatars */}
                  <div className="mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block mb-1.5">
                      Residents
                    </span>
                    {room.allocations && room.allocations.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {room.allocations.slice(0, 4).map((alloc) => (
                          <div
                            key={alloc.id}
                            title={`${alloc.student?.name} (${alloc.student?.rollNo || "No Roll"})`}
                            className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center cursor-default"
                          >
                            {alloc.student?.name?.charAt(0).toUpperCase() || "S"}
                          </div>
                        ))}
                        {room.allocations.length > 4 && (
                          <div className="w-7 h-7 rounded-full bg-surface border border-border text-text-secondary font-bold text-[10px] flex items-center justify-center">
                            +{room.allocations.length - 4}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-text-secondary italic">No resident students allocated</span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedRoomId(room.id)}
                    className="flex-1 py-1.5 px-3 bg-surface hover:bg-surface-hover border border-border rounded-lg text-xs font-semibold text-text-primary transition"
                  >
                    View Details
                  </button>
                  {room.availableBeds > 0 && room.status !== "MAINTENANCE" && (
                    <button
                      onClick={() => {
                        setAllocateFormData({
                          studentId: "",
                          roomId: room.id,
                          startDate: new Date().toISOString().split("T")[0],
                        });
                        setActionError(null);
                        setIsAllocateOpen(true);
                      }}
                      className="py-1.5 px-3 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition"
                      title="Quick allocate student to this room"
                    >
                      + Allocate
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ROOM DETAIL MODAL */}
      <AnimatePresence>
        {selectedRoomId && activeRoomDetail && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-border"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-border flex items-center justify-between bg-surface/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                    🛏️
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">
                      {activeRoomDetail.building} — Room {activeRoomDetail.roomNumber}
                    </h3>
                    <p className="text-xs text-text-secondary">
                      Capacity: {activeRoomDetail.capacity} beds • {activeRoomDetail.gender} policy • Floor: {activeRoomDetail.floor || "N/A"} • Type: {activeRoomDetail.roomType || "Standard"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingRoom(activeRoomDetail);
                      setRoomFormData({
                        building: activeRoomDetail.building,
                        roomNumber: activeRoomDetail.roomNumber,
                        capacity: activeRoomDetail.capacity,
                        gender: activeRoomDetail.gender,
                        status: activeRoomDetail.status,
                        floor: activeRoomDetail.floor || "",
                        roomType: activeRoomDetail.roomType || "",
                      });
                      setActionError(null);
                      setIsAddRoomOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold border border-border rounded-lg text-text-primary hover:bg-white transition"
                  >
                    ✏️ Edit Room
                  </button>
                  <button
                    onClick={() => setSelectedRoomId(null)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:bg-surface hover:text-text-primary transition"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* Status overview cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-surface rounded-xl border border-border text-center">
                    <span className="text-[11px] font-bold text-text-secondary uppercase">Active Occupants</span>
                    <p className="text-lg font-bold text-text-primary mt-1">
                      {activeRoomDetail.allocations?.filter((a: any) => a.status === "ACTIVE").length || 0} /{" "}
                      {activeRoomDetail.capacity}
                    </p>
                  </div>
                  <div className="p-3 bg-surface rounded-xl border border-border text-center">
                    <span className="text-[11px] font-bold text-text-secondary uppercase">Free Beds</span>
                    <p className="text-lg font-bold text-emerald-600 mt-1">
                      {Math.max(
                        0,
                        activeRoomDetail.capacity -
                          (activeRoomDetail.allocations?.filter((a: any) => a.status === "ACTIVE").length || 0)
                      )}
                    </p>
                  </div>
                  <div className="p-3 bg-surface rounded-xl border border-border text-center">
                    <span className="text-[11px] font-bold text-text-secondary uppercase">Status</span>
                    <p className="text-sm font-bold text-text-primary mt-1.5">
                      <StatusBadge status={activeRoomDetail.status} />
                    </p>
                  </div>
                </div>

                {/* Active Residents List */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-text-primary">Current Resident Students</h4>
                    {activeRoomDetail.capacity >
                      (activeRoomDetail.allocations?.filter((a: any) => a.status === "ACTIVE").length || 0) &&
                      activeRoomDetail.status !== "MAINTENANCE" && (
                        <button
                          onClick={() => {
                            setAllocateFormData({
                              studentId: "",
                              roomId: activeRoomDetail.id,
                              startDate: new Date().toISOString().split("T")[0],
                            });
                            setActionError(null);
                            setIsAllocateOpen(true);
                          }}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          + Allocate Bed to Student
                        </button>
                      )}
                  </div>

                  {activeRoomDetail.allocations?.filter((a: any) => a.status === "ACTIVE").length === 0 ? (
                    <div className="p-8 text-center bg-surface/50 rounded-xl border border-dashed border-border text-xs text-text-secondary">
                      No active student residents allocated to this room yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                      {activeRoomDetail.allocations
                        ?.filter((a: any) => a.status === "ACTIVE")
                        .map((alloc: HostelAllocation) => (
                          <div key={alloc.id} className="p-4 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                                {alloc.student?.name?.charAt(0).toUpperCase() || "S"}
                              </div>
                              <div>
                                <h5 className="text-sm font-bold text-text-primary">{alloc.student?.name}</h5>
                                <div className="text-xs text-text-secondary flex flex-wrap gap-2 mt-0.5">
                                  <span>Roll: {alloc.student?.rollNo || "N/A"}</span>
                                  <span>•</span>
                                  {alloc.student?.class?.name ? (
                                    <span>
                                      Class: {alloc.student.class.name}
                                      {alloc.student.section?.name ? ` (${alloc.student.section.name})` : ""}
                                    </span>
                                  ) : (alloc.student as any)?.program?.name ? (
                                    <span>
                                      Program: {(alloc.student as any).program.name}
                                      {(alloc.student as any).department?.name ? ` • ${(alloc.student as any).department.name}` : ""}
                                      {(alloc.student as any).semester ? ` • Sem ${(alloc.student as any).semester}` : ""}
                                    </span>
                                  ) : (
                                    <span>Academic: N/A</span>
                                  )}
                                  <span>•</span>
                                  <span>Gender: {alloc.student?.gender || "N/A"}</span>
                                </div>
                                <div className="text-[11px] text-text-secondary mt-1">
                                  Admitted: {new Date(alloc.startDate).toLocaleDateString()}
                                  {alloc.student?.guardians?.[0] && (
                                    <>
                                      {" "}• Guardian: {alloc.student.guardians[0].guardian.name} (
                                      {alloc.student.guardians[0].guardian.phone})
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions per student */}
                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <button
                                onClick={() => {
                                  setEditingStudent(alloc.student);
                                  setStudentFormData({
                                    name: alloc.student?.name || "",
                                    phone: alloc.student?.phone || "",
                                    medicalConditions: (alloc.student as any)?.medicalConditions || "",
                                  });
                                  setActionError(null);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-text-secondary hover:text-text-primary border border-border rounded-lg hover:bg-surface transition"
                                title="Edit Student Profile"
                              >
                                ✏️ Profile
                              </button>
                              <button
                                onClick={() => {
                                  setTransferAllocation(alloc);
                                  setTransferTargetRoomId("");
                                  setActionError(null);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition"
                                title="Transfer bed to another room"
                              >
                                ⇄ Transfer
                              </button>
                              <button
                                onClick={() => handleCheckoutStudent(alloc.id)}
                                className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
                                title="Check out student"
                              >
                                Check Out
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Past Allocations History */}
                {activeRoomDetail.allocations?.some((a: any) => a.status !== "ACTIVE") && (
                  <div>
                    <h4 className="text-sm font-bold text-text-primary mb-2">Past Resident History</h4>
                    <div className="space-y-1">
                      {activeRoomDetail.allocations
                        ?.filter((a: any) => a.status !== "ACTIVE")
                        .map((past: HostelAllocation) => (
                          <div
                            key={past.id}
                            className="p-3 bg-surface/40 rounded-lg text-xs flex items-center justify-between text-text-secondary"
                          >
                            <span>
                              <strong>{past.student?.name}</strong> (Roll: {past.student?.rollNo || "N/A"})
                            </span>
                            <span>
                              {new Date(past.startDate).toLocaleDateString()} —{" "}
                              {past.endDate ? new Date(past.endDate).toLocaleDateString() : "Checked out"}{" "}
                              ({past.status})
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer with Edit Room action */}
              <div className="p-4 border-t border-border bg-surface/30 flex items-center justify-between">
                <button
                  onClick={() => {
                    setEditingRoom(activeRoomDetail);
                    setRoomFormData({
                      building: activeRoomDetail.building,
                      roomNumber: activeRoomDetail.roomNumber,
                      capacity: activeRoomDetail.capacity,
                      gender: activeRoomDetail.gender,
                      status: activeRoomDetail.status,
                      floor: activeRoomDetail.floor || "",
                      roomType: activeRoomDetail.roomType || "",
                    });
                    setActionError(null);
                    setIsAddRoomOpen(true);
                  }}
                  className="px-4 py-2 bg-white border border-border text-text-primary rounded-lg text-sm font-semibold hover:bg-surface transition flex items-center gap-2"
                >
                  <span>✏️</span>
                  <span>Edit Room</span>
                </button>
                <button
                  onClick={() => setSelectedRoomId(null)}
                  className="px-4 py-2 bg-white border border-border text-text-primary rounded-lg text-sm font-semibold hover:bg-surface transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD / EDIT ROOM MODAL */}
      <AnimatePresence>
        {isAddRoomOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-border p-6"
            >
              <h3 className="text-lg font-bold text-text-primary mb-4">
                {editingRoom ? "Edit Hostel Room" : "Add New Hostel Room"}
              </h3>

              {actionError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleSaveRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Building / Block Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Block A, Ganga Hostel"
                    value={roomFormData.building}
                    onChange={(e) => setRoomFormData({ ...roomFormData, building: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Room Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101, 204-B"
                    value={roomFormData.roomNumber}
                    onChange={(e) => setRoomFormData({ ...roomFormData, roomNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Total Capacity (Beds) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={20}
                      value={roomFormData.capacity}
                      onChange={(e) => setRoomFormData({ ...roomFormData, capacity: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Gender Policy *</label>
                    <select
                      value={roomFormData.gender}
                      onChange={(e) => setRoomFormData({ ...roomFormData, gender: e.target.value as any })}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="MALE">Boys Only</option>
                      <option value="FEMALE">Girls Only</option>
                      <option value="COED">Co-Ed (Open)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Floor (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Ground Floor, 2nd Floor"
                      value={roomFormData.floor}
                      onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Room Type (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Single, Double, Dorm"
                      value={roomFormData.roomType}
                      onChange={(e) => setRoomFormData({ ...roomFormData, roomType: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Status</label>
                  <select
                    value={roomFormData.status}
                    onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddRoomOpen(false);
                      setEditingRoom(null);
                    }}
                    className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-text-secondary hover:bg-surface transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
                  >
                    {actionLoading ? "Saving..." : editingRoom ? "Update Room" : "Create Room"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ALLOCATE STUDENT MODAL */}
      <AnimatePresence>
        {isAllocateOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-border p-6"
            >
              <h3 className="text-lg font-bold text-text-primary mb-4">Allocate Hostel Bed</h3>

              {actionError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleAllocateStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Target Room *</label>
                  <select
                    required
                    value={allocateFormData.roomId}
                    onChange={(e) => setAllocateFormData({ ...allocateFormData, roomId: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select a room...</option>
                    {rooms
                      .filter((r) => r.status !== "MAINTENANCE" && r.availableBeds > 0)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.building} — Room {r.roomNumber} ({r.availableBeds} beds free, {r.gender})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Select Student *</label>
                  <select
                    required
                    value={allocateFormData.studentId}
                    onChange={(e) => setAllocateFormData({ ...allocateFormData, studentId: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select student...</option>
                    {students.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.rollNo || "No Roll"} • {s.gender || "Gender Unspecified"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Check-in / Start Date *</label>
                  <input
                    type="date"
                    required
                    value={allocateFormData.startDate}
                    onChange={(e) => setAllocateFormData({ ...allocateFormData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAllocateOpen(false)}
                    className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-text-secondary hover:bg-surface transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
                  >
                    {actionLoading ? "Allocating..." : "Confirm Allocation"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TRANSFER STUDENT BED MODAL */}
      <AnimatePresence>
        {transferAllocation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-border p-6"
            >
              <h3 className="text-lg font-bold text-text-primary mb-1">Transfer Student Bed</h3>
              <p className="text-xs text-text-secondary mb-4">
                Transferring <strong>{transferAllocation.student?.name}</strong> to an available room.
              </p>

              {actionError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleTransferStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Destination Room *</label>
                  <select
                    required
                    value={transferTargetRoomId}
                    onChange={(e) => setTransferTargetRoomId(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select destination room...</option>
                    {rooms
                      .filter(
                        (r) =>
                          r.id !== transferAllocation.roomId &&
                          r.status !== "MAINTENANCE" &&
                          r.availableBeds > 0
                      )
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.building} — Room {r.roomNumber} ({r.availableBeds} free, {r.gender})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTransferAllocation(null)}
                    className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-text-secondary hover:bg-surface transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || !transferTargetRoomId}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {actionLoading ? "Transferring..." : "Execute Transfer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT STUDENT PROFILE MODAL */}
      <AnimatePresence>
        {editingStudent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-border p-6"
            >
              <h3 className="text-lg font-bold text-text-primary mb-1">Edit Resident Profile</h3>
              <p className="text-xs text-text-secondary mb-4">
                Updates canonical student profile record in Student API.
              </p>

              {actionError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleSaveStudentProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    value={studentFormData.name}
                    onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={studentFormData.phone}
                    onChange={(e) => setStudentFormData({ ...studentFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Medical Notes / Allergies</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Asthma, peanut allergy, regular medications"
                    value={studentFormData.medicalConditions}
                    onChange={(e) => setStudentFormData({ ...studentFormData, medicalConditions: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-text-secondary hover:bg-surface transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
                  >
                    {actionLoading ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

