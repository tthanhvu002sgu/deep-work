// src/components/Sidebar.js

import React from "react";
import { formatTime } from "../utils/formatters";
import { getDailyFocusStatus } from "../utils/scienceConfig";

const Sidebar = ({
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
  onOpenModal,
  archivedCount = 0,
  upcomingTasksCount = 0,
  todayFocusTime = 0,
  dailyTarget = 0,
}) => {
  const focusStatus = getDailyFocusStatus(todayFocusTime);
  const targetSeconds = dailyTarget > 0 ? dailyTarget : 4 * 3600; // Default to 4h limit
  const progressPercent = Math.min(100, Math.round((todayFocusTime / targetSeconds) * 100));

  const navItems = [
    {
      id: "weeklySchedule",
      label: "Thời khóa biểu",
      icon: "📅",
      badge: upcomingTasksCount > 0 ? upcomingTasksCount : null,
      badgeColor: "bg-blue-600 text-white",
      description: "Lịch trình học tập & làm việc tuần",
      onClick: () => {
        onOpenModal("weeklySchedule");
        onCloseMobile();
      },
    },
    {
      id: "manualSession",
      label: "Thêm giờ thủ công",
      icon: "⏱️",
      description: "Ghi nhận phiên tập trung offline",
      onClick: () => {
        onOpenModal("manualSession");
        onCloseMobile();
      },
    },
    {
      id: "fileManager",
      label: "Quản lý dữ liệu file",
      icon: "📁",
      description: "Sao lưu, khôi phục & import/export",
      onClick: () => {
        onOpenModal("fileManager");
        onCloseMobile();
      },
    },
    {
      id: "archivedTasks",
      label: "Tasks đã lưu trữ",
      icon: "📦",
      badge: archivedCount > 0 ? archivedCount : null,
      badgeColor: "bg-red-500 text-white",
      description: "Xem và khôi phục các task đã ẩn",
      onClick: () => {
        onOpenModal("archivedTasks");
        onCloseMobile();
      },
    },
    {
      id: "dailyTarget",
      label: "Mục tiêu hôm nay",
      icon: "🎯",
      description: "Điều chỉnh mục tiêu giờ tập trung",
      onClick: () => {
        onOpenModal("dailyTarget");
        onCloseMobile();
      },
    },
    {
      id: "settings",
      label: "Cài đặt khung giờ",
      icon: "⚙️",
      description: "Tùy chỉnh preset phiên & mục tiêu",
      onClick: () => {
        onOpenModal("settings");
        onCloseMobile();
      },
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 lg:z-10 flex flex-col bg-white border-r-2 border-black transition-all duration-300 ease-in-out select-none shrink-0 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "w-20" : "w-64 sm:w-72"}`}
      >
        {/* Top Header / Branding */}
        <div className="h-16 px-4 border-b-2 border-black flex items-center justify-between bg-gray-50">
          {!isCollapsed ? (
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
                ⚡
              </div>
              <div className="truncate">
                <span className="font-extrabold text-base tracking-tight text-gray-900 block leading-tight">
                  DeepWork
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block leading-none">
                  Focus Station
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-9 h-9 rounded-lg bg-black text-white flex items-center justify-center font-black text-lg shadow-sm">
                ⚡
              </div>
            </div>
          )}

          {/* Desktop Collapse Toggle Button */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md border border-gray-300 hover:border-black hover:bg-gray-200 text-gray-700 transition"
            title={isCollapsed ? "Mở rộng menu (Sidebar)" : "Thu gọn menu"}
            aria-label={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          >
            <span className="text-xs font-bold">{isCollapsed ? "▶" : "◀"}</span>
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md border border-black hover:bg-gray-200 text-gray-800"
            aria-label="Đóng menu"
          >
            ✕
          </button>
        </div>

        {/* Primary Action Button */}
        <div className="p-3 border-b border-gray-200">
          <button
            onClick={() => {
              onOpenModal("addTask");
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-center space-x-2 bg-black text-white border-2 border-black rounded-lg py-2.5 px-3 font-bold hover:bg-gray-800 active:scale-[0.98] transition shadow-sm ${
              isCollapsed ? "px-0" : ""
            }`}
            title="Thêm nhiệm vụ mới"
          >
            <span className="text-base leading-none">＋</span>
            {!isCollapsed && <span className="text-sm truncate">Thêm Task mới</span>}
          </button>
        </div>

        {/* Navigation / Utilities List */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1.5 custom-scrollbar">
          {!isCollapsed && (
            <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Tiện ích & Quản lý
            </div>
          )}

          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              title={isCollapsed ? `${item.label}: ${item.description}` : item.description}
              className={`w-full group flex items-center rounded-lg border border-transparent hover:border-black hover:bg-gray-100 transition-all text-left relative ${
                isCollapsed
                  ? "justify-center p-2.5"
                  : "px-3 py-2.5 justify-between"
              }`}
            >
              <div className="flex items-center space-x-3 truncate">
                <span className="text-lg leading-none shrink-0 group-hover:scale-110 transition-transform">
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <div className="truncate">
                    <div className="text-sm font-semibold text-gray-800 group-hover:text-black truncate">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {item.description}
                    </div>
                  </div>
                )}
              </div>

              {item.badge && (
                <span
                  className={`font-bold text-xs rounded-full px-2 py-0.5 shrink-0 ${
                    item.badgeColor
                  } ${isCollapsed ? "absolute -top-1 -right-1 px-1.5 text-[10px]" : ""}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Science & Daily Progress Widget */}
        <div className="p-3 border-t-2 border-black bg-gray-50">
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-700 flex items-center gap-1">
                  <span>🧠</span> Tiến độ Deep Work
                </span>
                <span className="font-bold text-gray-900">{formatTime(todayFocusTime)}</span>
              </div>

              {/* Progress bar with scientific styling */}
              <div className="w-full bg-gray-200 border border-black rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    focusStatus.level === "max"
                      ? "bg-red-600"
                      : focusStatus.level === "optimal"
                      ? "bg-amber-500"
                      : "bg-black"
                  }`}
                  style={{ width: `${Math.min(100, progressPercent)}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <span
                  className={`inline-block text-[11px] px-2 py-0.5 rounded border ${
                    focusStatus.level === "max"
                      ? "bg-red-100 text-red-800 border-red-300 font-bold"
                      : focusStatus.level === "optimal"
                      ? "bg-amber-100 text-amber-900 border-amber-300 font-semibold"
                      : "bg-gray-200 text-gray-800 border-gray-300"
                  }`}
                  title={focusStatus.warningMessage || focusStatus.label}
                >
                  {focusStatus.shortLabel}
                </span>
                <button
                  onClick={() => {
                    onOpenModal("dailyTarget");
                    onCloseMobile();
                  }}
                  className="text-[11px] font-semibold text-gray-500 hover:text-black underline"
                >
                  Đổi mục tiêu
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                onOpenModal("dailyTarget");
                onCloseMobile();
              }}
              className="w-full flex flex-col items-center justify-center p-1 rounded hover:bg-gray-200 transition"
              title={`Hôm nay: ${formatTime(todayFocusTime)} - ${focusStatus.label}`}
            >
              <span className="text-base">{focusStatus.icon}</span>
              <span className="text-[10px] font-bold text-gray-700 mt-0.5">
                {Math.round(todayFocusTime / 3600)}h
              </span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
