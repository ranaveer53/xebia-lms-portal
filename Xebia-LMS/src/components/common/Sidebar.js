"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  BookOpen,
  Tag,
  LogOut,
  FolderKanban,
  FileCode,
  Sliders,
  Layers,
  UserPlus,
  BarChart3,
  Shield,
  Settings,
  TrendingUp,
  FileText,
  Trophy,
  Award,
  Calendar,
  Users,
  FileSpreadsheet,
  Upload,
  FileCheck,
  User
} from "lucide-react";
import SidebarLogo from "./SidebarLogo";
import SidebarToggle from "./SidebarToggle";
import NavigationItem from "./NavigationItem";

export default function Sidebar({ isOpen, onClose, collapsed, onCollapseToggle }) {
  const pathname = usePathname() || "";

  const { data: session } = useSession();
  
  const userRole = session?.user?.role || "learner";
  const userName = session?.user?.name || "Consultant";

  const learnerLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Course Catalog", href: "/courses", icon: BookOpen },
    { name: "My Courses", href: "/dashboard", icon: BookOpen },
    { name: "Learning Modules", href: "/courses", icon: FolderKanban },
    { name: "Materials", href: "/materials", icon: Upload },
    { name: "My Assessments", href: "/dashboard", icon: FileSpreadsheet },
    { name: "Events", href: "/events", icon: Calendar },
    { name: "My Certificates", href: "/certificates", icon: Award },
    { name: "Marks", href: "/marks", icon: FileCheck },
    { name: "Deadlines", href: "/deadlines", icon: Calendar },
    { name: "Profile", href: "/profile", icon: User },
  ];

  const adminLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Categories", href: "/admin/categories", icon: Tag },
    { name: "Courses", href: "/admin/courses", icon: BookOpen },
    { name: "Modules", href: "/admin/modules", icon: FolderKanban },
    { name: "Submodules", href: "/admin/submodules", icon: Sliders },
    { name: "Content", href: "/admin/content", icon: FileCode },
    { name: "Learners", href: "/admin/learners", icon: Users },
    { name: "Assessments", href: "/admin/assessments", icon: FileSpreadsheet },
    { name: "Submissions", href: "/submissions", icon: FolderKanban },
    { name: "Marks", href: "/marks", icon: FileCheck },
    { name: "Materials", href: "/materials", icon: Upload },
    { name: "Events", href: "/admin/events", icon: Calendar },
    { name: "Batches", href: "/classes", icon: Layers },
    { name: "Deadlines", href: "/deadlines", icon: Calendar },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Profile", href: "/profile", icon: User },
  ];

  const teacherLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Classes", href: "/classes", icon: BookOpen },
    { name: "Learners", href: "/admin/learners", icon: Users },
    { name: "Assessments", href: "/admin/assessments", icon: FileSpreadsheet },
    { name: "Submissions", href: "/submissions", icon: FolderKanban },
    { name: "Marks", href: "/marks", icon: FileCheck },
    { name: "Materials", href: "/materials", icon: Upload },
    { name: "Events", href: "/events", icon: Calendar },
    { name: "Deadlines", href: "/deadlines", icon: Calendar },
    { name: "Profile", href: "/profile", icon: User },
  ];

  const isActive = (href) => {
    if (href === "/dashboard" || href === "/admin" || href === "/teacher") return pathname === href;
    return pathname.startsWith(href);
  };

  const getLinks = () => {
    if (userRole === "admin") return adminLinks;
    if (userRole === "teacher") return teacherLinks;
    return learnerLinks;
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Main Sidebar Wrapper with width transition */}
      <aside
        className={`fixed lg:relative top-0 bottom-0 left-0 lg:top-auto lg:bottom-auto lg:left-auto z-40 bg-white border-r border-border flex flex-col justify-between transition-all duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "lg:w-[80px]" : "lg:w-[280px]"} w-[280px] h-screen lg:h-screen`}
      >
        {/* Toggle Button - placed outside the scroll container to prevent clipping */}
        <SidebarToggle collapsed={collapsed} onToggle={onCollapseToggle} />

        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
          
          {/* Logo Brand Header */}
          <div className="flex items-center border-b border-border h-20">
            <SidebarLogo collapsed={collapsed} onClick={onClose} />
          </div>

          {/* Navigation links block */}
          <nav className="p-4 flex flex-col gap-1 transition-all duration-300">
            <span className={`px-4 text-[10px] font-black text-text-muted uppercase tracking-wider block transition-all duration-300 overflow-hidden whitespace-nowrap ${
              collapsed ? "max-h-0 opacity-0 mb-0 mt-0" : "max-h-8 opacity-100 mb-2 mt-2"
            }`}>
              {userRole === "admin" || userRole === "teacher" ? "INSTRUCTOR SPACE" : "LEARNER SPACE"}
            </span>
            {getLinks().map((link) => (
              <NavigationItem
                key={link.name + "-" + link.href}
                name={link.name}
                href={link.href}
                icon={link.icon}
                active={isActive(link.href)}
                collapsed={collapsed}
                onClick={onClose}
              />
            ))}
          </nav>
        </div>

        {/* Footer profile area */}
        <div className="p-4 border-t border-border bg-gray-50/50 flex flex-col gap-3 flex-shrink-0 transition-all duration-300">
          <div className={`flex items-center gap-3 ${collapsed ? "justify-center px-0" : "px-2 py-1"}`}>
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-extrabold text-primary text-sm uppercase flex-shrink-0">
              {userName.substring(0, 2)}
            </div>
            <div className={`flex-1 min-w-0 transition-all duration-300 overflow-hidden whitespace-nowrap ${
              collapsed ? "max-w-0 opacity-0 pointer-events-none" : "max-w-[200px] opacity-100"
            }`}>
              <p className="text-sm font-extrabold text-foreground truncate leading-tight">{userName}</p>
              <p className="text-[10px] text-text-muted font-bold truncate capitalize mt-0.5">{userRole}</p>
            </div>
          </div>
          
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("LMS_DATA_MODE");
              }
              signOut({ callbackUrl: "/signin" });
            }}
            className={`flex items-center gap-2.5 py-2.5 border border-border text-foreground hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
              collapsed ? "px-2 justify-center border-transparent hover:bg-rose-50" : "px-4"
            } w-full`}
            title={collapsed ? "Sign Out" : ""}
          >
            <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
            <span className={`truncate transition-all duration-300 overflow-hidden whitespace-nowrap ${
              collapsed ? "max-w-0 opacity-0 pointer-events-none" : "max-w-[150px] opacity-100"
            }`}>
              Sign Out
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
