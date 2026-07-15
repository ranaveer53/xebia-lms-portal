"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useApp } from "../../lib/context";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileSpreadsheet,
  Upload,
  FolderKanban,
  FileCheck,
  Calendar,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Award
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onCollapseToggle: () => void;
}

export default function Sidebar({ isOpen, onClose, collapsed, onCollapseToggle }: SidebarProps) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { currentUser, logout } = useApp();

  const userRole = currentUser?.role || "learner";

  const teacherLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Classes", href: "/classes", icon: BookOpen },
    { name: "Learners", href: "/learners", icon: Users },
    { name: "Assessments", href: "/assessments", icon: FileSpreadsheet },
    { name: "Submissions", href: "/submissions", icon: FolderKanban },
    { name: "Marks", href: "/marks", icon: FileCheck },
    { name: "Materials", href: "/materials", icon: Upload },
    { name: "Events", href: "/events", icon: Calendar },
    { name: "Deadlines", href: "/deadlines", icon: Calendar },
    { name: "Profile", href: "/profile", icon: User }
  ];

  const learnerLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Classes", href: "/classes", icon: BookOpen },
    { name: "My Assessments", href: "/assessments", icon: FileSpreadsheet },
    { name: "Events", href: "/events", icon: Calendar },
    { name: "My Certificates", href: "/certificates", icon: Award },
    { name: "Marks", href: "/marks", icon: FileCheck },
    { name: "Materials", href: "/materials", icon: Upload },
    { name: "Deadlines", href: "/deadlines", icon: Calendar },
    { name: "Profile", href: "/profile", icon: User }
  ];

  const links = (userRole === "teacher" || userRole === "admin") ? teacherLinks : learnerLinks;

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard" && pathname === "/dashboard") return true;
    if (href !== "/dashboard" && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed lg:relative top-0 bottom-0 left-0 z-40 bg-white border-r border-border flex flex-col justify-between transition-all duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "lg:w-[80px]" : "lg:w-[280px]"} w-[280px] h-screen`}
      >
        {/* Toggle Collapse Button (Desktop only) */}
        <button
          onClick={onCollapseToggle}
          className="hidden lg:flex absolute top-6 -right-3.5 z-50 bg-white border border-border w-7 h-7 rounded-full items-center justify-center text-primary shadow-xs hover:bg-[#F7F8FC]"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {/* Logo brand */}
          <div className={`flex items-center border-b border-border h-20 transition-all duration-300 ${
            collapsed ? "justify-center px-4" : "px-6"
          }`}>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/dashboard")}>
              <Image
                src="/images/xebia-logo.png"
                alt="Xebia Logo"
                width={collapsed ? 40 : 50}
                height={collapsed ? 40 : 50}
                className="object-contain rounded-xl"
                style={{ width: "auto", height: "auto" }}
                priority
              />
              {!collapsed && (
                <div className="flex flex-col animate-fadeIn">
                  <span className="font-extrabold text-sm text-primary tracking-wide leading-none">Xebia LMS</span>
                  <span className="text-[10px] text-text-muted font-bold mt-0.5 uppercase tracking-widest">Portal</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 flex flex-col gap-1.5">
            {!collapsed && (
              <span className="px-4 text-[10px] font-black text-text-muted uppercase tracking-wider block mb-2 mt-2 animate-fadeIn">
                {userRole === "admin" ? "Admin Space" : userRole === "teacher" ? "Instructor Space" : "Learner Space"}
              </span>
            )}
            {links.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <button
                  key={link.name}
                  onClick={() => {
                    router.push(link.href);
                    onClose();
                  }}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-150 text-left w-full group ${
                    active
                      ? "bg-primary text-white shadow-xs font-semibold"
                      : "text-foreground hover:bg-[#F7F8FC] hover:text-primary"
                  }`}
                >
                  <Icon size={20} className={active ? "text-white" : "text-text-muted group-hover:text-primary"} />
                  {!collapsed && <span className="text-sm font-medium animate-fadeIn">{link.name}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Area */}
        <div className="p-4 border-t border-border bg-[#F7F8FC]/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3.5 px-4 py-3 rounded-xl text-left w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all duration-150"
          >
            <LogOut size={20} className="text-rose-500" />
            {!collapsed && <span className="text-sm font-semibold animate-fadeIn">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
