"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useTransportOverview,
  useTransportVehicles,
  useTransportDrivers,
  useTransportRoutes,
  useTransportStops,
  useFaculty,
  useSchoolModules,
  apiCall,
  invalidate,
} from "@/lib/api-hooks";
import { PageHeader, StatCard, StatusBadge } from "@/components/DashboardLayout";

type TransportTab = "overview" | "vehicles" | "drivers" | "routes";

export default function TransportLogisticsPage() {
  const { data: moduleData } = useSchoolModules();
  const { data: overviewData, isLoading: overviewLoading } = useTransportOverview();
  const { data: vehiclesData, isLoading: vehiclesLoading } = useTransportVehicles();
  const { data: driversData, isLoading: driversLoading } = useTransportDrivers();
  const { data: routesData, isLoading: routesLoading } = useTransportRoutes();
  const { data: stopsData, isLoading: stopsLoading } = useTransportStops();
  const { data: facultyData } = useFaculty();

  const [activeTab, setActiveTab] = useState<TransportTab>("overview");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // Modals
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);

  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any | null>(null);
  const [driverMode, setDriverMode] = useState<"existing" | "new">("existing");

  const [isAddRouteOpen, setIsAddRouteOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any | null>(null);

  const [isAddStopOpen, setIsAddStopOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<any | null>(null);

  // Vehicle Form State
  const [vehicleForm, setVehicleForm] = useState({
    registrationNumber: "",
    vehicleType: "BUS",
    capacity: 40,
    make: "",
    model: "",
    status: "ACTIVE",
    driverId: "",
    rcDocument: "",
    insuranceDocument: "",
    fitnessCertificate: "",
    pucCertificate: "",
  });

  // Driver Form State
  const [driverForm, setDriverForm] = useState({
    existingStaffId: "",
    name: "",
    email: "",
    phone: "",
    licenseNumber: "",
    licenseClass: "HMV",
    licenseExpiry: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    assignedVehicleId: "",
    status: "ACTIVE",
  });

  // Route Form State
  const [routeForm, setRouteForm] = useState({
    name: "",
    vehicleId: "",
    description: "",
  });

  // Stop Form State
  const [stopForm, setStopForm] = useState({
    routeId: "",
    name: "",
    pickupTime: "07:30",
    dropoffTime: "15:30",
    fare: 1500,
    latitude: 12.9716,
    longitude: 77.5946,
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Entitlement Check
  const isTransportEnabled = useMemo(() => {
    if (!moduleData) return true;
    const modules = moduleData.modules ?? moduleData;
    if (Array.isArray(modules)) {
      const found = modules.find(
        (m: any) =>
          m.module?.code?.toUpperCase() === "TRANSPORT" ||
          m.module?.id?.toUpperCase() === "TRANSPORT" ||
          m.code?.toUpperCase() === "TRANSPORT" ||
          m.id?.toUpperCase() === "TRANSPORT"
      );
      return found ? Boolean(found.isEnabled ?? found.enabled) : true;
    }
    if (typeof modules === "object" && modules !== null) {
      if (modules.TRANSPORT !== undefined) return Boolean(modules.TRANSPORT);
      if (modules.transport !== undefined) return Boolean(modules.transport);
    }
    return true;
  }, [moduleData]);

  const vehicles = useMemo(() => (Array.isArray(vehiclesData) ? vehiclesData : []), [vehiclesData]);
  const drivers = useMemo(() => (Array.isArray(driversData) ? driversData : []), [driversData]);
  const routes = useMemo(() => (Array.isArray(routesData) ? routesData : []), [routesData]);
  const stops = useMemo(() => (Array.isArray(stopsData) ? stopsData : []), [stopsData]);
  const facultyList = useMemo(() => (Array.isArray(facultyData) ? facultyData : []), [facultyData]);

  // Set default selected route when routes load
  useEffect(() => {
    if (!selectedRouteId && routes.length > 0) {
      setSelectedRouteId(routes[0].id);
    }
  }, [routes, selectedRouteId]);

  const activeRouteStops = useMemo(() => {
    if (!selectedRouteId) return [];
    return stops.filter((s: any) => s.routeId === selectedRouteId);
  }, [stops, selectedRouteId]);

  // Vehicle Handlers
  const handleOpenAddVehicle = () => {
    setEditingVehicle(null);
    setVehicleForm({
      registrationNumber: "",
      vehicleType: "BUS",
      capacity: 40,
      make: "",
      model: "",
      status: "ACTIVE",
      driverId: "",
      rcDocument: "",
      insuranceDocument: "",
      fitnessCertificate: "",
      pucCertificate: "",
    });
    setActionError(null);
    setIsAddVehicleOpen(true);
  };

  const handleOpenEditVehicle = (v: any) => {
    setEditingVehicle(v);
    setVehicleForm({
      registrationNumber: v.registrationNumber || "",
      vehicleType: v.vehicleType || "BUS",
      capacity: Number(v.capacity) || 40,
      make: v.make || "",
      model: v.model || "",
      status: v.status || "ACTIVE",
      driverId: v.driverId || "",
      rcDocument: v.rcDocument || "",
      insuranceDocument: v.insuranceDocument || "",
      fitnessCertificate: v.fitnessCertificate || "",
      pucCertificate: v.pucCertificate || "",
    });
    setActionError(null);
    setIsAddVehicleOpen(true);
  };

  const handleSaveVehicle = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const payload = {
        registrationNumber: vehicleForm.registrationNumber.trim().toUpperCase(),
        vehicleType: vehicleForm.vehicleType,
        capacity: Number(vehicleForm.capacity),
        status: vehicleForm.status,
        driverId: vehicleForm.driverId ? vehicleForm.driverId : null,
        make: vehicleForm.make.trim() || null,
        model: vehicleForm.model.trim() || null,
        rcDocument: vehicleForm.rcDocument.trim() || null,
        insuranceDocument: vehicleForm.insuranceDocument.trim() || null,
        fitnessCertificate: vehicleForm.fitnessCertificate.trim() || null,
        pucCertificate: vehicleForm.pucCertificate.trim() || null,
      };

      if (editingVehicle) {
        await apiCall(`/api/v1/admin/transport/vehicles/${editingVehicle.id}`, "PUT", payload);
      } else {
        await apiCall("/api/v1/admin/transport/vehicles", "POST", payload);
      }

      invalidate("/api/v1/admin/transport/overview");
      invalidate("/api/v1/admin/transport/vehicles");
      invalidate("/api/v1/admin/transport/fleet/overview");
      setIsAddVehicleOpen(false);
      setEditingVehicle(null);
    } catch (err: any) {
      setActionError(err.message || "Failed to save vehicle");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm("Are you sure you want to remove or archive this vehicle?")) return;
    setActionLoading(true);
    try {
      await apiCall(`/api/v1/admin/transport/vehicles/${vehicleId}`, "DELETE");
      invalidate("/api/v1/admin/transport/overview");
      invalidate("/api/v1/admin/transport/vehicles");
      invalidate("/api/v1/admin/transport/fleet/overview");
    } catch (err: any) {
      alert(err.message || "Delete vehicle failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Driver Handlers
  const handleOpenAddDriver = () => {
    setEditingDriver(null);
    setDriverMode("existing");
    setDriverForm({
      existingStaffId: facultyList[0]?.userId || facultyList[0]?.id || "",
      name: "",
      email: "",
      phone: "",
      licenseNumber: "",
      licenseClass: "HMV",
      licenseExpiry: "",
      address: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      assignedVehicleId: "",
      status: "ACTIVE",
    });
    setActionError(null);
    setIsAddDriverOpen(true);
  };

  const handleOpenEditDriver = (d: any) => {
    setEditingDriver(d);
    setDriverForm({
      existingStaffId: d.id,
      name: d.name || "",
      email: d.email || "",
      phone: d.phone || "",
      licenseNumber: d.licenseNumber || "",
      licenseClass: d.licenseClass || "HMV",
      licenseExpiry: d.licenseExpiry ? d.licenseExpiry.split("T")[0] : "",
      address: d.address || "",
      emergencyContactName: d.emergencyContactName || "",
      emergencyContactPhone: d.emergencyContactPhone || "",
      assignedVehicleId: d.driverVehicles?.[0]?.id || "",
      status: d.status || "ACTIVE",
    });
    setActionError(null);
    setIsAddDriverOpen(true);
  };

  const handleSaveDriver = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      if (editingDriver) {
        await apiCall(`/api/v1/admin/transport/drivers/${editingDriver.id}`, "PUT", {
          name: driverForm.name,
          phone: driverForm.phone || null,
          licenseNumber: driverForm.licenseNumber || null,
          licenseClass: driverForm.licenseClass || null,
          licenseExpiry: driverForm.licenseExpiry || null,
          address: driverForm.address || null,
          emergencyContactName: driverForm.emergencyContactName || null,
          emergencyContactPhone: driverForm.emergencyContactPhone || null,
          assignedVehicleId: driverForm.assignedVehicleId || null,
        });
      } else {
        const payload: any = {
          licenseNumber: driverForm.licenseNumber || null,
          licenseClass: driverForm.licenseClass || null,
          licenseExpiry: driverForm.licenseExpiry || null,
          address: driverForm.address || null,
          emergencyContactName: driverForm.emergencyContactName || null,
          emergencyContactPhone: driverForm.emergencyContactPhone || null,
          assignedVehicleId: driverForm.assignedVehicleId || null,
        };

        if (driverMode === "existing") {
          payload.existingStaffId = driverForm.existingStaffId;
        } else {
          payload.name = driverForm.name;
          payload.email = driverForm.email;
          payload.phone = driverForm.phone;
        }

        await apiCall("/api/v1/admin/transport/drivers", "POST", payload);
      }

      invalidate("/api/v1/admin/transport/drivers");
      invalidate("/api/v1/admin/transport/overview");
      invalidate("/api/v1/admin/transport/vehicles");
      setIsAddDriverOpen(false);
      setEditingDriver(null);
    } catch (err: any) {
      setActionError(err.message || "Failed to save driver profile");
    } finally {
      setActionLoading(false);
    }
  };

  // Route Handlers
  const handleOpenAddRoute = () => {
    setEditingRoute(null);
    setRouteForm({
      name: "",
      vehicleId: vehicles[0]?.id || "",
      description: "",
    });
    setActionError(null);
    setIsAddRouteOpen(true);
  };

  const handleOpenEditRoute = (r: any) => {
    setEditingRoute(r);
    setRouteForm({
      name: r.name || "",
      vehicleId: r.vehicleId || "",
      description: r.description || "",
    });
    setActionError(null);
    setIsAddRouteOpen(true);
  };

  const handleSaveRoute = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const payload = {
        name: routeForm.name.trim(),
        vehicleId: routeForm.vehicleId ? routeForm.vehicleId : null,
        description: routeForm.description.trim() || null,
      };

      if (editingRoute) {
        await apiCall(`/api/v1/admin/transport/routes/${editingRoute.id}`, "PUT", payload);
      } else {
        await apiCall("/api/v1/admin/transport/routes", "POST", payload);
      }

      invalidate("/api/v1/admin/transport/routes");
      invalidate("/api/v1/admin/transport/overview");
      setIsAddRouteOpen(false);
      setEditingRoute(null);
    } catch (err: any) {
      setActionError(err.message || "Failed to save route");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm("Are you sure you want to delete this route and its stops?")) return;
    setActionLoading(true);
    try {
      await apiCall(`/api/v1/admin/transport/routes/${routeId}`, "DELETE");
      invalidate("/api/v1/admin/transport/routes");
      invalidate("/api/v1/admin/transport/stops");
      invalidate("/api/v1/admin/transport/overview");
      if (selectedRouteId === routeId) setSelectedRouteId(null);
    } catch (err: any) {
      alert(err.message || "Delete route failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Stop Handlers
  const handleOpenAddStop = (routeId: string) => {
    setEditingStop(null);
    setStopForm({
      routeId,
      name: "",
      pickupTime: "07:30",
      dropoffTime: "15:30",
      fare: 1500,
      latitude: 12.9716,
      longitude: 77.5946,
    });
    setActionError(null);
    setIsAddStopOpen(true);
  };

  const handleOpenEditStop = (s: any) => {
    setEditingStop(s);
    setStopForm({
      routeId: s.routeId,
      name: s.name || "",
      pickupTime: s.pickupTime || "07:30",
      dropoffTime: s.dropoffTime || "15:30",
      fare: Number(s.fare) || 0,
      latitude: Number(s.latitude) || 12.9716,
      longitude: Number(s.longitude) || 77.5946,
    });
    setActionError(null);
    setIsAddStopOpen(true);
  };

  const handleSaveStop = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const payload = {
        routeId: stopForm.routeId,
        name: stopForm.name.trim(),
        pickupTime: stopForm.pickupTime,
        dropoffTime: stopForm.dropoffTime,
        fare: Number(stopForm.fare),
        latitude: Number(stopForm.latitude),
        longitude: Number(stopForm.longitude),
      };

      if (editingStop) {
        await apiCall(`/api/v1/admin/transport/stops/${editingStop.id}`, "PUT", payload);
      } else {
        await apiCall("/api/v1/admin/transport/stops", "POST", payload);
      }

      invalidate("/api/v1/admin/transport/stops");
      invalidate("/api/v1/admin/transport/routes");
      setIsAddStopOpen(false);
      setEditingStop(null);
    } catch (err: any) {
      setActionError(err.message || "Failed to save stop");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStop = async (stopId: string) => {
    if (!confirm("Are you sure you want to delete this stop?")) return;
    setActionLoading(true);
    try {
      await apiCall(`/api/v1/admin/transport/stops/${stopId}`, "DELETE");
      invalidate("/api/v1/admin/transport/stops");
      invalidate("/api/v1/admin/transport/routes");
    } catch (err: any) {
      alert(err.message || "Delete stop failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (!isTransportEnabled) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-border shadow-sm max-w-xl mx-auto my-12">
        <span className="text-5xl block mb-4">🚌</span>
        <h2 className="text-xl font-bold text-text-primary mb-2">Transport Module Disabled</h2>
        <p className="text-sm text-text-secondary mb-6">
          The Transport &amp; Vehicle Management module is currently not entitled or enabled for your institution.
          Please contact your SaaS Super Administrator to activate vehicle fleet tracking and route management.
        </p>
        <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
          Entitlement: TRANSPORT (Inactive)
        </span>
      </div>
    );
  }

  const overview = overviewData || {
    totalVehicles: 0,
    activeVehicles: 0,
    maintenanceVehicles: 0,
    inactiveVehicles: 0,
    totalDrivers: 0,
    totalRoutes: 0,
    assignedVehiclesCount: 0,
    unassignedVehiclesCount: 0,
    routesWithoutVehicleCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Transport & Vehicle Management"
        subtitle="School fleet logistics, driver profiles, route schedules, and stop management."
        action={
          <div className="flex gap-2">
            {activeTab === "vehicles" && (
              <button
                onClick={handleOpenAddVehicle}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition shadow-sm"
              >
                + Add Vehicle
              </button>
            )}
            {activeTab === "drivers" && (
              <button
                onClick={handleOpenAddDriver}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition shadow-sm"
              >
                + Add Driver Profile
              </button>
            )}
            {activeTab === "routes" && (
              <div className="flex gap-2">
                {selectedRouteId && (
                  <button
                    onClick={() => handleOpenAddStop(selectedRouteId)}
                    className="px-3 py-2 bg-white border border-border text-text-primary rounded-lg text-sm font-semibold hover:bg-surface transition shadow-sm"
                  >
                    + Add Stop
                  </button>
                )}
                <button
                  onClick={handleOpenAddRoute}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition shadow-sm"
                >
                  + Add Route
                </button>
              </div>
            )}
          </div>
        }
      />

      {/* Primary Tab Navigation — Exactly 4 Active Sections */}
      <div className="flex border-b border-border bg-white px-2 rounded-t-xl pt-2">
        {[
          { key: "overview", label: "Overview", icon: "📊" },
          { key: "vehicles", label: "Vehicles", icon: "🚌" },
          { key: "drivers", label: "Drivers", icon: "👨‍✈️" },
          { key: "routes", label: "Routes & Stops", icon: "🗺️" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TransportTab)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition -mb-px ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. OVERVIEW SECTION */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              icon="🚌"
              label="Total Fleet"
              value={overviewLoading ? "..." : String(overview.totalVehicles)}
              color="#3B82F6"
            />
            <StatCard
              icon="🟢"
              label="Active Vehicles"
              value={overviewLoading ? "..." : String(overview.activeVehicles)}
              color="#10B981"
            />
            <StatCard
              icon="🔧"
              label="In Maintenance"
              value={overviewLoading ? "..." : String(overview.maintenanceVehicles)}
              color="#F59E0B"
            />
            <StatCard
              icon="👨‍✈️"
              label="Registered Drivers"
              value={overviewLoading ? "..." : String(overview.totalDrivers)}
              color="#6366F1"
            />
            <StatCard
              icon="🗺️"
              label="Configured Routes"
              value={overviewLoading ? "..." : String(overview.totalRoutes)}
              color="#8B5CF6"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Operational Distribution */}
            <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-4">
              <h3 className="text-base font-bold text-text-primary">Fleet & Route Allocation Status</h3>
              <p className="text-xs text-text-secondary">
                Overview of current bus-to-route pairings and operational capacity across campus.
              </p>

              <div className="space-y-3 pt-2 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-text-secondary">Vehicles Assigned to Routes</span>
                  <span className="font-bold text-emerald-600">
                    {overview.assignedVehiclesCount} / {overview.totalVehicles}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-text-secondary">Unassigned Idle Vehicles</span>
                  <span className="font-bold text-amber-600">{overview.unassignedVehiclesCount}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-text-secondary">Routes Awaiting Vehicle Assignment</span>
                  <span className="font-bold text-text-primary">{overview.routesWithoutVehicleCount}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-text-secondary">Inactive / Decommissioned Vehicles</span>
                  <span className="font-bold text-slate-500">{overview.inactiveVehicles}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Module Capabilities */}
            <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-4">
              <h3 className="text-base font-bold text-text-primary">Campus Commute Operations</h3>
              <p className="text-xs text-text-secondary">
                Configure your school transit ecosystem with complete administrative oversight.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <button
                  onClick={() => setActiveTab("vehicles")}
                  className="p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-surface text-left transition flex flex-col justify-between"
                >
                  <span className="text-2xl mb-2">🚌</span>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">Vehicles</h4>
                    <p className="text-xs text-text-secondary mt-1">Manage fleet & documents</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("drivers")}
                  className="p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-surface text-left transition flex flex-col justify-between"
                >
                  <span className="text-2xl mb-2">👨‍✈️</span>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">Drivers</h4>
                    <p className="text-xs text-text-secondary mt-1">Staff identity & licenses</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("routes")}
                  className="p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-surface text-left transition flex flex-col justify-between"
                >
                  <span className="text-2xl mb-2">🗺️</span>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">Routes & Stops</h4>
                    <p className="text-xs text-text-secondary mt-1">Schedules & timings</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. VEHICLES SECTION */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === "vehicles" && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between bg-surface/50">
            <div>
              <h3 className="text-base font-bold text-text-primary">Institutional Fleet Inventory</h3>
              <p className="text-xs text-text-secondary">
                Sequential fleet numbering, vehicle registration, compliance documents, and driver assignment.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary rounded-full">
              {vehicles.length} {vehicles.length === 1 ? "Vehicle" : "Vehicles"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface border-b border-border text-xs font-bold text-text-secondary uppercase tracking-wider">
                  <th className="p-4">Fleet # &amp; Reg</th>
                  <th className="p-4">Type &amp; Capacity</th>
                  <th className="p-4">Make / Model</th>
                  <th className="p-4">Assigned Driver</th>
                  <th className="p-4">Assigned Route</th>
                  <th className="p-4">Documents</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vehiclesLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-text-secondary">
                      Loading vehicle fleet...
                    </td>
                  </tr>
                ) : vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-text-secondary">
                      No vehicles found. Click &quot;+ Add Vehicle&quot; to register your first fleet bus.
                    </td>
                  </tr>
                ) : (
                  vehicles.map((v: any) => (
                    <tr key={v.id} className="hover:bg-surface/50 transition">
                      <td className="p-4 font-bold text-text-primary">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🚌</span>
                          <div>
                            <div className="text-xs font-semibold text-primary">{v.fleetNumber || "Fleet Bus"}</div>
                            <div className="font-mono text-sm">{v.registrationNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-text-primary">{v.vehicleType}</span>
                        <div className="text-xs text-text-secondary">{v.capacity} seats</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-text-primary">{v.make || "N/A"}</div>
                        <div className="text-xs text-text-secondary">{v.model || "N/A"}</div>
                      </td>
                      <td className="p-4">
                        {v.driver ? (
                          <div>
                            <span className="font-semibold text-text-primary">{v.driver.name}</span>
                            {v.driver.phone && (
                              <div className="text-xs text-text-secondary">{v.driver.phone}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs italic text-text-secondary">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4">
                        {v.routes && v.routes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {v.routes.map((r: any) => (
                              <span
                                key={r.id}
                                className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full"
                              >
                                {r.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs italic text-text-secondary">No routes</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 text-[11px] font-semibold">
                          <span
                            title={v.rcDocument ? "RC Document Registered" : "RC Pending"}
                            className={`px-1.5 py-0.5 rounded ${
                              v.rcDocument ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            RC
                          </span>
                          <span
                            title={v.insuranceDocument ? "Insurance Registered" : "Insurance Pending"}
                            className={`px-1.5 py-0.5 rounded ${
                              v.insuranceDocument ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            INS
                          </span>
                          <span
                            title={v.fitnessCertificate ? "Fitness Cert Registered" : "Fitness Pending"}
                            className={`px-1.5 py-0.5 rounded ${
                              v.fitnessCertificate ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            FIT
                          </span>
                          <span
                            title={v.pucCertificate ? "PUC Registered" : "PUC Pending"}
                            className={`px-1.5 py-0.5 rounded ${
                              v.pucCertificate ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            PUC
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditVehicle(v)}
                            className="p-1.5 text-text-secondary hover:text-primary hover:bg-surface rounded-lg transition"
                            title="Edit Vehicle"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteVehicle(v.id)}
                            className="p-1.5 text-text-secondary hover:text-red-600 hover:bg-surface rounded-lg transition"
                            title="Archive / Remove Vehicle"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. DRIVERS SECTION */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === "drivers" && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between bg-surface/50">
            <div>
              <h3 className="text-base font-bold text-text-primary">Transport Staff &amp; Driver Profiles</h3>
              <p className="text-xs text-text-secondary">
                Reusing school staff identities with commercial driving license credentials and emergency contacts.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary rounded-full">
              {drivers.length} {drivers.length === 1 ? "Driver" : "Drivers"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface border-b border-border text-xs font-bold text-text-secondary uppercase tracking-wider">
                  <th className="p-4">Driver Name</th>
                  <th className="p-4">Contact Phone</th>
                  <th className="p-4">License Number</th>
                  <th className="p-4">License Class / Expiry</th>
                  <th className="p-4">Assigned Vehicle</th>
                  <th className="p-4">Emergency Contact</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {driversLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-text-secondary">
                      Loading drivers list...
                    </td>
                  </tr>
                ) : drivers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-text-secondary">
                      No drivers registered. Click &quot;+ Add Driver Profile&quot; to assign staff to the transport team.
                    </td>
                  </tr>
                ) : (
                  drivers.map((d: any) => (
                    <tr key={d.id} className="hover:bg-surface/50 transition">
                      <td className="p-4 font-bold text-text-primary">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">👨‍✈️</span>
                          <div>
                            <div>{d.name}</div>
                            <div className="text-xs font-normal text-text-secondary">{d.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs">
                        {d.phone ? (
                          <a href={`tel:${d.phone}`} className="text-blue-600 hover:underline">
                            {d.phone}
                          </a>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="p-4 font-mono text-xs font-semibold">
                        {d.licenseNumber || "N/A"}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 text-xs font-bold rounded">
                          {d.licenseClass || "HMV"}
                        </span>
                        <div className="text-xs text-text-secondary mt-0.5">
                          {d.licenseExpiry ? new Date(d.licenseExpiry).toLocaleDateString() : "N/A"}
                        </div>
                      </td>
                      <td className="p-4">
                        {d.driverVehicles && d.driverVehicles.length > 0 ? (
                          <span className="font-semibold text-text-primary">
                            {d.driverVehicles[0].registrationNumber}
                          </span>
                        ) : (
                          <span className="text-xs italic text-text-secondary">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-xs">
                          <span className="font-medium text-text-primary">{d.emergencyContactName || "N/A"}</span>
                          {d.emergencyContactPhone && (
                            <div className="text-text-secondary font-mono">{d.emergencyContactPhone}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={d.status || "ACTIVE"} />
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleOpenEditDriver(d)}
                          className="p-1.5 text-text-secondary hover:text-primary hover:bg-surface rounded-lg transition"
                          title="Edit Driver Profile"
                        >
                          ✏️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. ROUTES & STOPS SECTION */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === "routes" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Route List Column */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface/50">
              <h3 className="text-base font-bold text-text-primary">School Routes</h3>
              <span className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                {routes.length}
              </span>
            </div>

            <div className="divide-y divide-border overflow-y-auto max-h-[600px]">
              {routesLoading ? (
                <div className="p-6 text-center text-xs text-text-secondary">Loading routes...</div>
              ) : routes.length === 0 ? (
                <div className="p-6 text-center text-xs text-text-secondary">
                  No routes configured. Click &quot;+ Add Route&quot; to create your first route.
                </div>
              ) : (
                routes.map((r: any) => {
                  const isSelected = selectedRouteId === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRouteId(r.id)}
                      className={`p-4 cursor-pointer transition flex items-start justify-between ${
                        isSelected ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-surface/50"
                      }`}
                    >
                      <div className="space-y-1">
                        <h4 className="font-bold text-text-primary text-sm">{r.name}</h4>
                        <div className="text-xs text-text-secondary flex items-center gap-2">
                          <span>🚌 {r.vehicle?.registrationNumber || "Unassigned"}</span>
                          <span>•</span>
                          <span>{r.stops?.length || 0} stops</span>
                        </div>
                        {r.description && (
                          <p className="text-xs text-text-secondary line-clamp-1">{r.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenEditRoute(r)}
                          className="p-1 text-text-secondary hover:text-primary rounded transition"
                          title="Edit Route"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteRoute(r.id)}
                          className="p-1 text-text-secondary hover:text-red-600 rounded transition"
                          title="Delete Route"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Stops Column for Selected Route */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface/50">
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  {routes.find((r: any) => r.id === selectedRouteId)?.name || "Select a Route"} — Stops &amp; Timings
                </h3>
                <p className="text-xs text-text-secondary">
                  Ordered boarding locations with morning pickup, afternoon drop-off, and fare tariffs.
                </p>
              </div>
              {selectedRouteId && (
                <button
                  onClick={() => handleOpenAddStop(selectedRouteId)}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition shadow-sm"
                >
                  + Add Stop
                </button>
              )}
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-surface border-b border-border text-xs font-bold text-text-secondary uppercase tracking-wider">
                    <th className="p-4">Stop Name</th>
                    <th className="p-4">Morning Pickup</th>
                    <th className="p-4">Afternoon Drop-off</th>
                    <th className="p-4">Monthly Fare</th>
                    <th className="p-4">Coordinates</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stopsLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-text-secondary">
                        Loading stops...
                      </td>
                    </tr>
                  ) : !selectedRouteId ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-text-secondary">
                        Please select a route from the list on the left to view stops.
                      </td>
                    </tr>
                  ) : activeRouteStops.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-text-secondary">
                        No stops configured for this route yet. Click &quot;+ Add Stop&quot; to begin.
                      </td>
                    </tr>
                  ) : (
                    activeRouteStops.map((s: any, idx: number) => (
                      <tr key={s.id} className="hover:bg-surface/50 transition">
                        <td className="p-4 font-bold text-text-primary">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-surface border border-border text-xs flex items-center justify-center font-mono">
                              {idx + 1}
                            </span>
                            <span>{s.name}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono font-semibold text-emerald-600 text-xs">
                          {s.pickupTime || "N/A"}
                        </td>
                        <td className="p-4 font-mono font-semibold text-blue-600 text-xs">
                          {s.dropoffTime || "N/A"}
                        </td>
                        <td className="p-4 font-semibold text-text-primary text-xs">
                          ₹{Number(s.fare || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="p-4 text-xs font-mono text-text-secondary">
                          {s.latitude ? `${Number(s.latitude).toFixed(4)}°, ${Number(s.longitude).toFixed(4)}°` : "N/A"}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditStop(s)}
                              className="p-1.5 text-text-secondary hover:text-primary rounded transition"
                              title="Edit Stop"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteStop(s.id)}
                              className="p-1.5 text-text-secondary hover:text-red-600 rounded transition"
                              title="Delete Stop"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD / EDIT VEHICLE */}
      {/* ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isAddVehicleOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-border overflow-hidden"
            >
              <div className="p-5 border-b border-border flex items-center justify-between bg-surface/50">
                <h3 className="font-bold text-text-primary">
                  {editingVehicle ? "Edit Vehicle" : "Add New Fleet Vehicle"}
                </h3>
                <button
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="text-text-secondary hover:text-text-primary text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveVehicle} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {actionError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                    {actionError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Registration Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. KA-01-AB-1234"
                      value={vehicleForm.registrationNumber}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Vehicle Type *
                    </label>
                    <select
                      value={vehicleForm.vehicleType}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm"
                    >
                      <option value="BUS">Bus</option>
                      <option value="MINIVAN">Minivan</option>
                      <option value="VAN">Van</option>
                      <option value="SUV">SUV</option>
                      <option value="AUTO">Auto</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Capacity (Seats) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={120}
                      value={vehicleForm.capacity}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Status
                    </label>
                    <select
                      value={vehicleForm.status}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Make (Manufacturer)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tata Motors / Ashok Leyland"
                      value={vehicleForm.make}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Model
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Starbus Ultra"
                      value={vehicleForm.model}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Assigned Driver
                  </label>
                  <select
                    value={vehicleForm.driverId}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, driverId: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm"
                  >
                    <option value="">-- No Driver Assigned --</option>
                    {drivers.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.phone ? `(${d.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Documents / Compliance section */}
                <div className="pt-2 border-t border-border space-y-3">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Compliance Documents (Optional / Stored as NULL if empty)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        RC Document URL / Ref
                      </label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={vehicleForm.rcDocument}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, rcDocument: e.target.value })}
                        className="w-full px-3 py-1.5 border border-border rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        Insurance Policy Ref
                      </label>
                      <input
                        type="text"
                        placeholder="Policy number or URL"
                        value={vehicleForm.insuranceDocument}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, insuranceDocument: e.target.value })}
                        className="w-full px-3 py-1.5 border border-border rounded-lg text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        Fitness Certificate Ref
                      </label>
                      <input
                        type="text"
                        placeholder="Fitness cert URL"
                        value={vehicleForm.fitnessCertificate}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, fitnessCertificate: e.target.value })}
                        className="w-full px-3 py-1.5 border border-border rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        PUC Certificate Ref
                      </label>
                      <input
                        type="text"
                        placeholder="PUC cert URL"
                        value={vehicleForm.pucCertificate}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, pucCertificate: e.target.value })}
                        className="w-full px-3 py-1.5 border border-border rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsAddVehicleOpen(false)}
                    className="px-4 py-2 border border-border text-text-secondary rounded-xl text-sm hover:bg-surface transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
                  >
                    {actionLoading ? "Saving..." : editingVehicle ? "Update Vehicle" : "Create Vehicle"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD / EDIT DRIVER */}
      {/* ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isAddDriverOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-border overflow-hidden"
            >
              <div className="p-5 border-b border-border flex items-center justify-between bg-surface/50">
                <h3 className="font-bold text-text-primary">
                  {editingDriver ? "Edit Driver Profile" : "Register Driver Profile"}
                </h3>
                <button
                  onClick={() => setIsAddDriverOpen(false)}
                  className="text-text-secondary hover:text-text-primary text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveDriver} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {actionError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                    {actionError}
                  </div>
                )}

                {/* Driver Creation Mode (only when creating new) */}
                {!editingDriver && (
                  <div className="flex bg-surface p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setDriverMode("existing")}
                      className={`flex-1 py-1.5 rounded-lg transition ${
                        driverMode === "existing" ? "bg-white shadow-sm text-primary" : "text-text-secondary"
                      }`}
                    >
                      Assign Existing School Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => setDriverMode("new")}
                      className={`flex-1 py-1.5 rounded-lg transition ${
                        driverMode === "new" ? "bg-white shadow-sm text-primary" : "text-text-secondary"
                      }`}
                    >
                      Register New Staff Identity
                    </button>
                  </div>
                )}

                {!editingDriver && driverMode === "existing" ? (
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Select School Staff Member *
                    </label>
                    <select
                      required
                      value={driverForm.existingStaffId}
                      onChange={(e) => setDriverForm({ ...driverForm, existingStaffId: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm"
                    >
                      {facultyList.map((f: any) => (
                        <option key={f.id || f.userId} value={f.userId || f.id}>
                          {f.name} ({f.email || f.phone || "Staff"})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1">
                        Driver Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={driverForm.name}
                        onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-xl text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-text-secondary mb-1">
                          Email Address {!editingDriver && "*"}
                        </label>
                        <input
                          type="email"
                          required={!editingDriver}
                          disabled={Boolean(editingDriver)}
                          value={driverForm.email}
                          onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
                          className="w-full px-3 py-2 border border-border rounded-xl text-sm disabled:bg-surface"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-text-secondary mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={driverForm.phone}
                          onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-border rounded-xl text-sm"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Driving License Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DL-0420110012345"
                      value={driverForm.licenseNumber}
                      onChange={(e) => setDriverForm({ ...driverForm, licenseNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      License Class
                    </label>
                    <select
                      value={driverForm.licenseClass}
                      onChange={(e) => setDriverForm({ ...driverForm, licenseClass: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm"
                    >
                      <option value="HMV">Heavy Motor Vehicle (HMV)</option>
                      <option value="LMV">Light Motor Vehicle (LMV)</option>
                      <option value="TRANS">Transport Vehicle (TRANS)</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      License Expiry Date
                    </label>
                    <input
                      type="date"
                      value={driverForm.licenseExpiry}
                      onChange={(e) => setDriverForm({ ...driverForm, licenseExpiry: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Assign Vehicle (Optional)
                    </label>
                    <select
                      value={driverForm.assignedVehicleId}
                      onChange={(e) => setDriverForm({ ...driverForm, assignedVehicleId: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm"
                    >
                      <option value="">-- No Vehicle Assigned --</option>
                      {vehicles.map((v: any) => (
                        <option key={v.id} value={v.id}>
                          {v.registrationNumber} ({v.vehicleType})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Spouse / Relative"
                      value={driverForm.emergencyContactName}
                      onChange={(e) => setDriverForm({ ...driverForm, emergencyContactName: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Emergency Contact Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+91..."
                      value={driverForm.emergencyContactPhone}
                      onChange={(e) => setDriverForm({ ...driverForm, emergencyContactPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsAddDriverOpen(false)}
                    className="px-4 py-2 border border-border text-text-secondary rounded-xl text-sm hover:bg-surface transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
                  >
                    {actionLoading ? "Saving..." : editingDriver ? "Update Profile" : "Save Driver"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD / EDIT ROUTE */}
      {/* ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isAddRouteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-border overflow-hidden"
            >
              <div className="p-5 border-b border-border flex items-center justify-between bg-surface/50">
                <h3 className="font-bold text-text-primary">
                  {editingRoute ? "Edit Route" : "Add New Route"}
                </h3>
                <button
                  onClick={() => setIsAddRouteOpen(false)}
                  className="text-text-secondary hover:text-text-primary text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveRoute} className="p-6 space-y-4">
                {actionError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                    {actionError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Route Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. North Campus Route 1"
                    value={routeForm.name}
                    onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Assigned Vehicle
                  </label>
                  <select
                    value={routeForm.vehicleId}
                    onChange={(e) => setRouteForm({ ...routeForm, vehicleId: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm"
                  >
                    <option value="">-- No Vehicle Assigned --</option>
                    {vehicles.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} ({v.vehicleType})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-text-secondary mt-1">
                    Vehicles can serve multiple routes provided their stop schedule windows do not overlap.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Route Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Primary suburbs, landmarks, and operational notes..."
                    value={routeForm.description}
                    onChange={(e) => setRouteForm({ ...routeForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsAddRouteOpen(false)}
                    className="px-4 py-2 border border-border text-text-secondary rounded-xl text-sm hover:bg-surface transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
                  >
                    {actionLoading ? "Saving..." : editingRoute ? "Update Route" : "Create Route"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD / EDIT STOP */}
      {/* ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isAddStopOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-border overflow-hidden"
            >
              <div className="p-5 border-b border-border flex items-center justify-between bg-surface/50">
                <h3 className="font-bold text-text-primary">
                  {editingStop ? "Edit Stop" : "Add Route Stop"}
                </h3>
                <button
                  onClick={() => setIsAddStopOpen(false)}
                  className="text-text-secondary hover:text-text-primary text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveStop} className="p-6 space-y-4">
                {actionError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                    {actionError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Stop Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Central Library Junction"
                    value={stopForm.name}
                    onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Morning Pickup Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={stopForm.pickupTime}
                      onChange={(e) => setStopForm({ ...stopForm, pickupTime: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Afternoon Drop-off Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={stopForm.dropoffTime}
                      onChange={(e) => setStopForm({ ...stopForm, dropoffTime: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Monthly Fare Tariff (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={50}
                    value={stopForm.fare}
                    onChange={(e) => setStopForm({ ...stopForm, fare: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={stopForm.latitude}
                      onChange={(e) => setStopForm({ ...stopForm, latitude: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={stopForm.longitude}
                      onChange={(e) => setStopForm({ ...stopForm, longitude: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsAddStopOpen(false)}
                    className="px-4 py-2 border border-border text-text-secondary rounded-xl text-sm hover:bg-surface transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
                  >
                    {actionLoading ? "Saving..." : editingStop ? "Update Stop" : "Add Stop"}
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
