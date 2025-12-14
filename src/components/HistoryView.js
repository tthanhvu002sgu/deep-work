import React, { useState, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Heatmap Component
const FocusHeatmap = ({ sessions, tasks, filter, dailyTargets = {} }) => {
  const [hoveredDate, setHoveredDate] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Calculate data for heatmap
  const heatmapData = useMemo(() => {
    const now = new Date();
    const dates = [];

    // Generate date range based on filter
    if (filter === "week") {
      // FIX: Start week from Monday instead of Sunday
      const today = new Date(now);
      const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Calculate the start of the week (Monday)
      const startOfWeek = new Date(today);
      // If today is Sunday (0), go back 6 days. Otherwise, go back (currentDay - 1) days.
      const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1;
      startOfWeek.setDate(today.getDate() - daysToSubtract);
      startOfWeek.setHours(0, 0, 0, 0);
      
      // Generate 7 days from Monday
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        dates.push(date);
      }
    } else if (filter === "month") {
      // Get all days in current month
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        dates.push(new Date(year, month, day));
      }
    }

    // Calculate focus time for each date
    return dates.map((date) => {
      const dateKey = date.toISOString().split("T")[0];
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      // Get sessions for this date
      const daySessions = sessions.filter((session) => {
        const sessionDate = new Date(session.completedAt);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      });

      const totalMinutes =
        daySessions.reduce((acc, session) => acc + session.duration, 0) / 60;
      const totalHours = totalMinutes / 60;
      const target = dailyTargets[dateKey];
      const targetMinutes = target?.targetMinutes || 0;
      const targetHours = targetMinutes / 60;

      // Determine color based on conditions
      let color = "bg-gray-100"; // Default: no activity
      let intensity = 0;

      if (target && targetMinutes > 0) {
        // Has target set
        if (totalMinutes >= targetMinutes) {
          // Target completed - green
          color = "bg-green-500";
          intensity = Math.min(totalHours / targetHours, 2); // Max intensity at 2x target
        } else {
          // Target not completed - red
          color = "bg-red-500";
          intensity = Math.max(0.3, totalMinutes / targetMinutes); // Min 30% intensity
        }
      } else {
        // No target set
        if (totalHours >= 1) {
          // >= 1h without target - blue
          color = "bg-blue-500";
          intensity = Math.min(totalHours / 3, 1); // Max intensity at 3h
        } else if (totalMinutes > 0) {
          // < 1h without target - orange-red
          color = "bg-orange-600";
          intensity = Math.max(0.2, totalMinutes / 60); // Min 20% intensity
        }
      }

      return {
        date,
        dateKey,
        totalMinutes: Math.round(totalMinutes),
        totalHours: Math.round(totalHours * 10) / 10,
        sessionCount: daySessions.length,
        target: targetMinutes,
        targetAchieved: targetMinutes > 0 && totalMinutes >= targetMinutes,
        color,
        intensity: Math.max(0.2, Math.min(intensity, 1)),
        tasks: [...new Set(daySessions.map((s) => s.taskId))].map(
          (taskId) => tasks.find((t) => t.id === taskId)?.name || "Task đã xóa"
        ),
      };
    });
  }, [sessions, tasks, filter, dailyTargets]);

  // NEW: Calculate working days stats
  const { workingDays, totalDays, streak } = useMemo(() => {
    let consecutiveDays = 0;
    let maxStreak = 0;
    let currentStreak = 0;
    const workingDaysCount = heatmapData.filter(day => day.totalMinutes > 0).length;

    // Calculate streak
    for (let i = 0; i < heatmapData.length; i++) {
      if (heatmapData[i].totalMinutes > 0) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 0;
      }
    }
    maxStreak = Math.max(maxStreak, currentStreak); // Check streak at the end

    return {
      workingDays: workingDaysCount,
      totalDays: heatmapData.length,
      streak: maxStreak,
    };
  }, [heatmapData]);

  const handleMouseEnter = (dayData, event) => {
    setHoveredDate(dayData);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseMove = (event) => {
    if (hoveredDate) {
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseLeave = () => {
    setHoveredDate(null);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const formatTime = (minutes) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}p` : `${hours}h`;
    }
    return `${minutes}p`;
  };

  return (
    <>
      {/* Legend */}
      <div className="flex items-center space-x-4 mb-4 text-xs">
        {/* <span className="text-gray-600">Ít</span>
        <div className="flex space-x-1">
          <div className="w-3 h-3 bg-gray-100 rounded border"></div>
          <div className="w-3 h-3 bg-orange-600 opacity-30 rounded"></div>
          <div className="w-3 h-3 bg-blue-500 opacity-50 rounded"></div>
          <div className="w-3 h-3 bg-green-500 opacity-70 rounded"></div>
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <div className="w-3 h-3 bg-red-500 rounded"></div>
        </div>
        <span className="text-gray-600">Nhiều</span>
        <div className="flex items-center space-x-2 ml-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded"></div>
            <span>Đạt mục tiêu</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded"></div>
            <span>Chưa đạt mục tiêu</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded"></div>
            <span>Không mục tiêu ≥1h</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-orange-600 rounded"></div>
            <span>Không mục tiêu {"<"}1h</span>
          </div>
        </div> */}
      </div>

      {/* NEW: Stats for working days */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 text-sm text-gray-700 p-3 bg-gray-50 rounded-lg border">
        <div className="text-center">
          <div className="text-xs text-gray-500 uppercase">Ngày làm việc</div>
          <div className="font-bold text-lg text-green-600">
            {workingDays} <span className="text-gray-500 font-medium">/ {totalDays}</span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 uppercase">Ngày nghỉ</div>
          <div className="font-bold text-lg text-blue-600">
            {totalDays - workingDays}
          </div>
        </div>
        <div className="text-center col-span-2 sm:col-span-1">
          <div className="text-xs text-gray-500 uppercase">Chuỗi dài nhất</div>
          <div className="font-bold text-lg text-orange-600">
            {streak} ngày
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      {filter === "week" ? (
        // Week layout - vertical structure
        <div className="space-y-2">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1">
            {/* FIX: Change order to Monday -> Sunday */}
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
              <div
                key={day}
                className="text-xs font-medium text-gray-500 text-center w-8 h-6 flex items-center justify-center"
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* Date cells - FIXED: same width as headers */}
          <div className="grid grid-cols-7 gap-1">
            {heatmapData.map((dayData) => (
              <div
                key={dayData.dateKey}
                className={`
                  w-8 h-8 rounded cursor-pointer border border-gray-200
                  ${dayData.color} hover:ring-2 hover:ring-gray-400 transition-all
                  flex items-center justify-center text-xs font-medium
                `}
                style={{
                  opacity: dayData.totalMinutes > 0 ? dayData.intensity : 0.1,
                  color: dayData.totalMinutes > 0 ? "white" : "#6b7280",
                }}
                onMouseEnter={(e) => handleMouseEnter(dayData, e)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                title={`${formatDate(dayData.date)}: ${formatTime(
                  dayData.totalMinutes
                )}`}
              >
                {dayData.date.getDate()}
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Month layout - flexible grid
        <div className="grid grid-cols-7 sm:grid-cols-10 lg:grid-cols-12 xl:grid-cols-15 gap-1">
          {heatmapData.map((dayData) => (
            <div
              key={dayData.dateKey}
              className={`
                w-6 h-6 rounded cursor-pointer border border-gray-200
                ${dayData.color} hover:ring-2 hover:ring-gray-400 transition-all
                flex items-center justify-center text-xs font-medium
              `}
              style={{
                opacity: dayData.totalMinutes > 0 ? dayData.intensity : 0.1,
                color: dayData.totalMinutes > 0 ? "white" : "#6b7280",
              }}
              onMouseEnter={(e) => handleMouseEnter(dayData, e)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              title={`${formatDate(dayData.date)}: ${formatTime(
                dayData.totalMinutes
              )}`}
            >
              {dayData.date.getDate()}
            </div>
          ))}
        </div>
      )}

      {/* Tooltip */}
      {hoveredDate && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg pointer-events-none max-w-xs"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
            transform: "translateY(-100%)",
          }}
        >
          <div className="font-semibold mb-1">
            {hoveredDate.date.toLocaleDateString("vi-VN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>

          <div className="space-y-1">
            <div>
              ⏱️ Thời gian tập trung:{" "}
              <span className="font-semibold text-blue-300">
                {formatTime(hoveredDate.totalMinutes)}
              </span>
            </div>

            <div>
              📊 Số phiên:{" "}
              <span className="font-semibold">{hoveredDate.sessionCount}</span>
            </div>

            {hoveredDate.target > 0 ? (
              <div>
                🎯 Mục tiêu:{" "}
                <span className="font-semibold">
                  {formatTime(hoveredDate.target)}
                </span>
                <span
                  className={`ml-1 ${
                    hoveredDate.targetAchieved
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {hoveredDate.targetAchieved ? "✅ Đạt" : "❌ Chưa đạt"}
                </span>
              </div>
            ) : (
              <div className="text-gray-400">🎯 Không đặt mục tiêu</div>
            )}

            {hoveredDate.tasks.length > 0 && (
              <div>
                📝 Tasks:{" "}
                <span className="text-green-300">
                  {hoveredDate.tasks.slice(0, 2).join(", ")}
                  {hoveredDate.tasks.length > 2 &&
                    ` +${hoveredDate.tasks.length - 2} khác`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const HistoryView = ({
  sessions,
  tasks,
  filter,
  setFilter,
  dailyTargets = {},
  // NEW: all sessions for global overview
  allSessions = [],
}) => {
  // State for view mode toggle
  const [viewMode, setViewMode] = useState("chart"); // "chart" or "heatmap" or "overview"

  // Auto-reset to chart mode when switching to day filter (heatmap not available for day)
  React.useEffect(() => {
    if (filter === "day" && viewMode === "heatmap") {
      setViewMode("chart");
    }
  }, [filter, viewMode]);

  // Chart data logic
  const chartData = React.useMemo(() => {
    const dataByTask = sessions.reduce((acc, session) => {
      const taskId = session.taskId;
      acc[taskId] = (acc[taskId] || 0) + session.duration;
      return acc;
    }, {});

    const taskMap = tasks.reduce((map, task) => {
      map[task.id] = task.name;
      return map;
    }, {});

    const labels = Object.keys(dataByTask).map(
      (taskId) => taskMap[taskId] || "Task đã xóa"
    );
    // CONVERT to hours with one decimal place
    const data = Object.values(dataByTask).map((totalSeconds) =>
      Math.round((totalSeconds / 3600) * 10) / 10
    );

    return {
      labels,
      datasets: [
        {
          label: "Thời gian tập trung (giờ)",
          data,
          backgroundColor: "rgba(59, 130, 246, 0.8)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    };
  }, [sessions, tasks]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            // UPDATE tooltip to show hours
            return `${context.parsed.x} giờ`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            // UPDATE axis ticks to show 'h' for hours
            return value + "h";
          },
        },
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
      },
      y: {
        ticks: {
          maxRotation: 0,
          minRotation: 0,
          font: {
            size: 12,
          },
        },
        grid: {
          display: false,
        },
      },
    },
    elements: {
      bar: {
        borderWidth: 1,
      },
    },
  };

  const getFilterText = (filter) => {
    if (filter === "day") return "hôm nay";
    if (filter === "week") return "tuần này";
    if (filter === "month") return "tháng này";
    return "";
  };

  // Calculate total focus time for current filter
  const totalMinutes =
    sessions.reduce((acc, session) => acc + session.duration, 0) / 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = Math.round(totalMinutes % 60);

  // NEW: Calculate number of unique days with sessions for average calculation
  const numberOfDaysWithSessions = useMemo(() => {
    if (sessions.length === 0) return 0;
    return new Set(
      sessions.map((s) => new Date(s.completedAt).toISOString().split("T")[0])
    ).size;
  }, [sessions]);

  const formatTotalTime = () => {
    if (totalHours > 0) {
      return `${totalHours} giờ ${remainingMinutes} phút`;
    }
    return `${Math.round(totalMinutes)} phút`;
  };

  // NEW: Global Overview stats (computed from allSessions)
  const overview = useMemo(() => {
    if (!allSessions || allSessions.length === 0) {
      return null;
    }

    // Basic aggregates
    const totalSecondsAll = allSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const totalMinutesAll = Math.round(totalSecondsAll / 60);

    // Unique active days
    const dayKey = (d) => new Date(d).toISOString().split("T")[0];
    const activeDayKeys = Array.from(new Set(allSessions.map(s => dayKey(s.completedAt)))).sort();

    // Range
    const firstDay = activeDayKeys[0];
    const lastDay = activeDayKeys[activeDayKeys.length - 1];

    // Longest streak overall
    let longestStreak = 0;
    let currentStreak = 0;
    for (let i = 0; i < activeDayKeys.length; i++) {
      if (i === 0) {
        currentStreak = 1;
        longestStreak = 1;
      } else {
        const prev = new Date(activeDayKeys[i - 1]);
        const cur = new Date(activeDayKeys[i]);
        const diffDays = Math.round((cur - prev) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak += 1;
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          currentStreak = 1;
        }
      }
    }

    // Calendar days in range
    let calendarDays = 0;
    if (firstDay && lastDay) {
      const start = new Date(firstDay);
      const end = new Date(lastDay);
      calendarDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
    }

    // Averages
    const avgPerActiveDay = activeDayKeys.length > 0 ? Math.round(totalMinutesAll / activeDayKeys.length) : 0;
    const avgPerCalendarDay = calendarDays > 0 ? Math.round(totalMinutesAll / calendarDays) : 0;
    const avgPerSession = allSessions.length > 0 ? Math.round(totalMinutesAll / allSessions.length) : 0;

    // Top tasks by total time
    const taskTotals = new Map();
    for (const s of allSessions) {
      taskTotals.set(s.taskId, (taskTotals.get(s.taskId) || 0) + (s.duration || 0));
    }
    const taskNameById = new Map(tasks.map(t => [t.id, t.name]));
    const topTasks = Array.from(taskTotals.entries())
      .map(([taskId, secs]) => ({
        taskId,
        name: taskNameById.get(taskId) || "Task đã xóa",
        seconds: secs,
        minutes: Math.round(secs / 60),
      }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 5);

    const maxTop = topTasks[0]?.seconds || 1;

    // Longest single session
    const longest = allSessions.reduce(
      (best, s) => (s.duration > (best?.duration || 0) ? s : best),
      null
    );
    const longestPretty = longest
      ? {
          minutes: Math.round(longest.duration / 60),
          task: taskNameById.get(longest.taskId) || "Task đã xóa",
          date: new Date(longest.completedAt).toLocaleString("vi-VN"),
        }
      : null;

    return {
      totalMinutesAll,
      totalHoursAll: Math.floor(totalMinutesAll / 60),
      remainingMinutesAll: totalMinutesAll % 60,
      sessionsCount: allSessions.length,
      activeDays: activeDayKeys.length,
      calendarDays,
      firstDay,
      lastDay,
      longestStreak,
      avgPerActiveDay,
      avgPerCalendarDay,
      avgPerSession,
      topTasks,
      maxTop,
      longestPretty,
    };
  }, [allSessions, tasks]);

  const formatMinutes = (m) => {
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return mm ? `${h}h ${mm}p` : `${h}h`;
    }
    return `${m}p`;
  };

  const canShowHeatmap = filter !== "day";

  return (
    <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {viewMode === "overview" ? "🌐 Tổng quan toàn bộ dữ liệu" : `📊 Thống kê ${getFilterText(filter)}`}
            </h2>

            {/* View Mode Toggle */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("chart")}
                className={`px-2 py-1 text-sm font-medium rounded-md transition-colors flex items-center space-x-1 ${
                  viewMode === "chart" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
                title="Biểu đồ cột"
              >
                <span>📊</span>
              </button>

              {canShowHeatmap && (
                <button
                  onClick={() => setViewMode("heatmap")}
                  className={`px-2 py-1 text-sm font-medium rounded-md transition-colors flex items-center space-x-1 ${
                    viewMode === "heatmap" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="Heatmap"
                >
                  <span>🔥</span>
                </button>
              )}

              {/* NEW: Overview button (always available) */}
              <button
                onClick={() => setViewMode("overview")}
                className={`px-2 py-1 text-sm font-medium rounded-md transition-colors flex items-center space-x-1 ${
                  viewMode === "overview" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
                title="Toàn bộ dữ liệu"
              >
                <span>🌐</span>
              </button>
            </div>
          </div>

          {viewMode !== "overview" && sessions.length > 0 && (
            <p className="text-sm text-gray-600">
              Tổng cộng:{" "}
              <span className="font-semibold text-blue-600">
                {formatTotalTime()}
              </span>{" "}
              ({sessions.length} phiên)
            </p>
          )}

          {viewMode === "overview" && overview && (
            <p className="text-sm text-gray-600">
              Từ {new Date(overview.firstDay).toLocaleDateString("vi-VN")} đến {new Date(overview.lastDay).toLocaleDateString("vi-VN")} •{" "}
              <span className="font-semibold text-blue-600">
                {overview.totalHoursAll} giờ {overview.remainingMinutesAll} phút
              </span>{" "}
              ({overview.sessionsCount} phiên, {overview.activeDays}/{overview.calendarDays} ngày hoạt động)
            </p>
          )}
        </div>

        {/* Filter Toggle (ẩn khi Overview để tập trung nội dung) */}
        {viewMode !== "overview" && (
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {["day", "week", "month"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  filter === f ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {f === "day" ? "Ngày" : f === "week" ? "Tuần" : "Tháng"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Area */}
      {viewMode === "overview" ? (
        // NEW: Overview Panel (special, eye-catching)
        <div className="space-y-4">
          {/* Top KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl p-4 bg-gradient-to-br from-blue-600 to-indigo-500 text-white shadow-md">
              <div className="text-sm opacity-90">Tổng thời gian</div>
              <div className="text-2xl font-bold mt-1">{overview.totalHoursAll}h {overview.remainingMinutesAll}p</div>
              <div className="text-xs mt-1 opacity-90">TB/ngày hoạt động: {formatMinutes(overview.avgPerActiveDay)}</div>
            </div>
            <div className="rounded-xl p-4 bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-md">
              <div className="text-sm opacity-90">Phiên làm việc</div>
              <div className="text-2xl font-bold mt-1">{overview.sessionsCount}</div>
              <div className="text-xs mt-1 opacity-90">TB/phiên: {formatMinutes(overview.avgPerSession)}</div>
            </div>
            <div className="rounded-xl p-4 bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-md">
              <div className="text-sm opacity-90">Chuỗi dài nhất</div>
              <div className="text-2xl font-bold mt-1">{overview.longestStreak} ngày</div>
              <div className="text-xs mt-1 opacity-90">TB/ngày lịch: {formatMinutes(overview.avgPerCalendarDay)}</div>
            </div>
          </div>

          {/* Top Tasks */}
          <div className="rounded-xl p-4 border bg-white shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">🏆 Top Tasks (toàn bộ dữ liệu)</h3>
              <span className="text-xs text-gray-500">Đơn vị: phút</span>
            </div>
            <div className="space-y-2">
              {overview.topTasks.map((t) => {
                const pct = Math.round((t.seconds / overview.maxTop) * 100);
                return (
                  <div key={t.taskId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-800">{t.name}</span>
                      <span className="text-gray-600">{t.minutes}p</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                        style={{ width: `${pct}%` }}
                        title={`${pct}%`}
                      />
                    </div>
                  </div>
                );
              })}
              {overview.topTasks.length === 0 && (
                <div className="text-sm text-gray-500">Chưa có dữ liệu.</div>
              )}
            </div>
          </div>

          {/* Longest Session */}
          {overview.longestPretty && (
            <div className="rounded-xl p-4 bg-slate-50 border shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">⏱️</div>
                <div>
                  <div className="font-semibold text-gray-800">
                    Phiên dài nhất: {overview.longestPretty.minutes} phút
                  </div>
                  <div className="text-sm text-gray-600">
                    Task: <span className="font-medium">{overview.longestPretty.task}</span> • {overview.longestPretty.date}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // OLD: chart/heatmap content remains
        <>
          {sessions.length > 0 ? (
            <>
              {viewMode === "chart" ? (
                <>
                  {/* Bar Chart */}
                  <div style={{ height: "250px" }} className="mb-4">
                    <Bar 
                      data={chartData} 
                      options={chartOptions} 
                      key={`chart-${sessions.length}-${JSON.stringify(sessions.map(s => s.id))}`} 
                    />
                  </div>
                  
                  {/* Quick Stats - UPDATED to show avg per session and per day */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Tổng phiên
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {sessions.length}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        TB / Phiên
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {sessions.length > 0
                          ? `${Math.round(totalMinutes / sessions.length)}p`
                          : "0p"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        TB / Ngày
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {numberOfDaysWithSessions > 0
                          ? `${Math.round(
                              totalMinutes / numberOfDaysWithSessions
                            )}p`
                          : "0p"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Tasks
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {new Set(sessions.map((s) => s.taskId)).size}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-2">
                  <FocusHeatmap
                    sessions={sessions}
                    tasks={tasks}
                    filter={filter}
                    dailyTargets={dailyTargets}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-5xl mb-3">
                {viewMode === "heatmap" ? "🔥" : "📈"}
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                Chưa có dữ liệu {getFilterText(filter)}
              </h3>
              <p className="text-sm">
                Bắt đầu một phiên làm việc để xem{" "}
                {viewMode === "heatmap" ? "heatmap" : "thống kê"} tại đây
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HistoryView;