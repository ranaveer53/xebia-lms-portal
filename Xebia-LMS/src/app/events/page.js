"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "@/lib/apiService";
import useToast from "@/hooks/useToast";
import Card, { CardBody } from "@/components/common/Card";
import Button from "@/components/common/Button";
import {
  Calendar,
  MapPin,
  Users,
  Search,
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
  Globe,
  Tag,
  Building,
  CheckCircle,
  XCircle,
  FileText
} from "lucide-react";

export default function EventsPage() {
  const router = useRouter();
  const toast = useToast();

  const [currentUser, setCurrentUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming"); // upcoming, my, completed

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [modeFilter, setModeFilter] = useState("All");
  const [seatsAvailableFilter, setSeatsAvailableFilter] = useState(false);

  // Distinct filter options
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Fetch initial user and data
  useEffect(() => {
    const user = apiService.getCurrentUser();
    if (!user) {
      router.push("/signin");
      return;
    }
    setCurrentUser(user);
  }, []);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // 1. Fetch registered events for this learner to mark "Already Registered"
      let myRegs = [];
      if (currentUser.role === "learner") {
        myRegs = await apiService.getMyRegisteredEvents(currentUser.id);
        setRegisteredEventIds(new Set(myRegs.map(e => e.id)));
      }

      // 2. Fetch all eligible events based on filters
      const filters = {
        role: currentUser.role,
        batch: currentUser.batch,
        category: categoryFilter,
        department: departmentFilter,
        mode: modeFilter,
        search: searchQuery,
        seatsAvailable: seatsAvailableFilter || undefined
      };

      if (activeTab === "upcoming") {
        filters.timeFilter = "upcoming";
      } else if (activeTab === "completed") {
        filters.timeFilter = "completed";
      }

      let fetchedEvents = [];
      if (activeTab === "my" && currentUser.role === "learner") {
        fetchedEvents = myRegs;
      } else {
        fetchedEvents = await apiService.getEvents(filters);
      }

      // Filter events by batch restrictions for learners
      if (currentUser.role === "learner") {
        const studentBatch = currentUser.batch?.trim().toLowerCase();
        fetchedEvents = fetchedEvents.filter(event => {
          if (!event.batchRestrictions || event.batchRestrictions.length === 0) return true; // Open to all
          if (!studentBatch) return false; // Event is restricted but learner has no batch
          return event.batchRestrictions.some(b => b.trim().toLowerCase() === studentBatch);
        });
      }

      setEvents(fetchedEvents);

      // Collect all categories and departments dynamically for options
      const allEvts = await apiService.getEvents({ role: currentUser.role, batch: currentUser.batch });
      const cats = Array.from(new Set(allEvts.map(e => e.category).filter(Boolean)));
      const depts = Array.from(new Set(allEvts.map(e => e.department).filter(Boolean)));
      setCategories(cats);
      setDepartments(depts);

    } catch (err) {
      console.error("Error loading events:", err);
      toast.addToast("Failed to load events list.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, activeTab, categoryFilter, departmentFilter, modeFilter, seatsAvailableFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleRegister = async (eventId) => {
    try {
      const res = await apiService.registerForEvent(eventId, currentUser.id);
      toast.addToast(res.message || "Successfully registered for event!", "success");
      loadData();
    } catch (err) {
      toast.addToast(err.message || "Registration failed.", "error");
    }
  };

  const handleCancelRegistration = async (eventId) => {
    if (!confirm("Are you sure you want to cancel your registration for this event?")) return;
    try {
      const res = await apiService.cancelEventRegistration(eventId, currentUser.id);
      toast.addToast(res.message || "Registration cancelled successfully.", "success");
      loadData();
    } catch (err) {
      toast.addToast(err.message || "Cancellation failed.", "error");
    }
  };

  const isDeadlinePassed = (deadlineStr) => {
    if (!deadlineStr) return false;
    return new Date() > new Date(deadlineStr);
  };

  const formatEventDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusColorClass = (status) => {
    switch (status?.toUpperCase()) {
      case "PUBLISHED": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "CLOSED": return "bg-rose-50 text-rose-700 border-rose-200";
      case "CANCELLED": return "bg-gray-100 text-gray-600 border-gray-200";
      default: return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-primary rounded-3xl p-8 sm:p-12 text-white shadow-lg">
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-xs font-black tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
            <span>Xebia Events</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Enterprise Event Hub</h1>
          <p className="text-white/80 text-sm leading-relaxed">
            Expand your horizon. Register and participate in technical workshops, townhalls, and training camps curated by industry experts.
          </p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none hidden md:block">
          <div className="w-full h-full bg-radial-gradient from-accent/50 to-transparent"></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "upcoming"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-foreground"
          }`}
        >
          Upcoming Events
        </button>
        {currentUser.role === "learner" && (
          <button
            onClick={() => setActiveTab("my")}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === "my"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-foreground"
            }`}
          >
            My Registrations
          </button>
        )}
        <button
          onClick={() => setActiveTab("completed")}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "completed"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-foreground"
          }`}
        >
          Past Events
        </button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <form onSubmit={handleSearchSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <input
                type="text"
                placeholder="Search by title, location, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white"
              />
              <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-text-muted" />
            </div>

            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white"
              >
                <option value="All">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-border/60">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-muted">Mode:</span>
                <select
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-border rounded-lg text-xs font-bold focus:outline-none"
                >
                  <option value="All">All Modes</option>
                  <option value="ONLINE">Online</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seatsAvailableFilter}
                  onChange={(e) => setSeatsAvailableFilter(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs font-bold text-text-muted">Seats Available Only</span>
              </label>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button type="submit" variant="primary" size="sm" className="w-full sm:w-auto">
                Apply Filters
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("All");
                  setDepartmentFilter("All");
                  setModeFilter("All");
                  setSeatsAvailableFilter(false);
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Events Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-white border border-border rounded-3xl shadow-sm">
          <Calendar className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-base font-extrabold text-foreground">No events found</h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto mt-1.5 leading-relaxed">
            There are no events listed under this tab matching your filter criteria. Keep checking in later!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const isRegistered = registeredEventIds.has(event.id);
            const isFull = event.currentRegistrations >= event.maximumCapacity;
            const deadlinePassed = isDeadlinePassed(event.registrationDeadline);
            const closed = event.status?.toUpperCase() === "CLOSED";
            const cancelled = event.status?.toUpperCase() === "CANCELLED";

            return (
              <Card key={event.id} className="group hover:-translate-y-1 transition-all duration-300">
                <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
                  <img
                    src={event.bannerImage}
                    alt={event.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop";
                    }}
                  />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-2.5 py-1 bg-white/95 backdrop-blur-md rounded-lg shadow-sm text-[10px] font-black text-primary uppercase tracking-wide">
                      {event.mode}
                    </span>
                    {cancelled && (
                      <span className="px-2.5 py-1 bg-rose-500 text-white rounded-lg shadow-sm text-[10px] font-black uppercase">
                        Cancelled
                      </span>
                    )}
                  </div>
                </div>

                <CardBody className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold rounded-md uppercase">
                        {event.category}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-text-muted text-[9px] font-bold rounded-md uppercase">
                        {event.department}
                      </span>
                    </div>

                    <h3 className="text-sm font-extrabold text-foreground leading-snug line-clamp-2 min-h-[2.5rem]">
                      {event.title}
                    </h3>
                  </div>

                  <div className="space-y-2.5 text-xs text-text-muted">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-text-muted flex-shrink-0" />
                      <span className="font-medium truncate">{formatEventDate(event.startDate)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-text-muted flex-shrink-0" />
                      <span className="font-medium truncate">
                        {event.mode === "ONLINE" ? event.meetingLink || "Online Meeting" : event.location || event.venue}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold border-t border-border/60 pt-3">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-primary" />
                        <span>{event.currentRegistrations} / {event.maximumCapacity} Seats Filled</span>
                      </div>
                      <span className={isFull ? "text-rose-500" : "text-emerald-500"}>
                        {isFull ? "Sold Out" : `${event.maximumCapacity - event.currentRegistrations} Left`}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${isFull ? "bg-rose-500" : "bg-primary"}`}
                        style={{ width: `${Math.min(100, (event.currentRegistrations / event.maximumCapacity) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/events/${event.id}`)}
                    >
                      <FileText className="w-3.5 h-3.5 mr-1" />
                      <span>Details</span>
                    </Button>

                    {/* Participant Register Button */}
                    {currentUser.role === "learner" && !cancelled && (
                      isRegistered ? (
                        <Button
                          variant="danger"
                          size="sm"
                          className="flex-1"
                          disabled={deadlinePassed}
                          onClick={() => handleCancelRegistration(event.id)}
                          title={deadlinePassed ? "Cannot cancel after registration deadline" : ""}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          <span>Cancel</span>
                        </Button>
                      ) : (
                        <Button
                          variant={isFull || deadlinePassed || closed ? "outline" : "primary"}
                          size="sm"
                          className="flex-1"
                          disabled={isFull || deadlinePassed || closed}
                          onClick={() => handleRegister(event.id)}
                        >
                          {closed ? (
                            <span>Closed</span>
                          ) : deadlinePassed ? (
                            <span>Past Deadline</span>
                          ) : isFull ? (
                            <span>Full</span>
                          ) : (
                            <span>Register</span>
                          )}
                        </Button>
                      )
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
