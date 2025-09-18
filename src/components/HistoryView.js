
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
                className="text-xs font-medium text-gray-500 text-center h-6 flex items-center justify-center"
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* Date cells */}
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
}) => {
  // State for view mode toggle
  const [viewMode, setViewMode] = useState("chart"); // "chart" or "heatmap"

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
    const data = Object.values(dataByTask).map((totalSeconds) =>
      Math.round(totalSeconds / 60)
    );

    return {
      labels,
      datasets: [
        {
          label: "Thời gian tập trung (phút)",
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
            return `${context.parsed.x} phút`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return value + "p";
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

  const formatTotalTime = () => {
    if (totalHours > 0) {
      return `${totalHours} giờ ${remainingMinutes} phút`;
    }
    return `${Math.round(totalMinutes)} phút`;
  };

  const canShowHeatmap = filter !== "day";

  return (
    <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h2 className="text-lg font-semibold text-gray-900">
              📊 Thống kê {getFilterText(filter)}
            </h2>
            
            {/* View Mode Toggle - Only show for week/month filters */}
            {canShowHeatmap && (
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("chart")}
                  className={`px-2 py-1 text-sm font-medium rounded-md transition-colors flex items-center space-x-1 ${
                    viewMode === "chart"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="Biểu đồ cột"
                >
                  <span>📊</span>
                </button>
                <button
                  onClick={() => setViewMode("heatmap")}
                  className={`px-2 py-1 text-sm font-medium rounded-md transition-colors flex items-center space-x-1 ${
                    viewMode === "heatmap"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="Heatmap"
                >
                  <span>🔥</span>
                </button>
              </div>
            )}
          </div>
          
          {sessions.length > 0 && (
            <p className="text-sm text-gray-600">
              Tổng cộng:{" "}
              <span className="font-semibold text-blue-600">
                {formatTotalTime()}
              </span>{" "}
              ({sessions.length} phiên)
            </p>
          )}
        </div>

        {/* Filter Toggle */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {["day", "week", "month"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                filter === f
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {f === "day" ? "Ngày" : f === "week" ? "Tuần" : "Tháng"}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
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
              
              {/* Quick Stats - Only show in chart mode */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Phiên
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {sessions.length}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Trung bình
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {Math.round(totalMinutes / sessions.length)}p
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
            /* Focus Heatmap */
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
        /* Empty State */
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
    </div>
  );
};

export default HistoryView;