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

    // Helper to get local date key format YYYY-MM-DD
    const getLocalDateKey = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const dates = [];

    // Generate date range based on filter
    if (filter === "week") {
      const today = new Date(now);
      const currentDay = today.getDay();
      const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);

      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        dates.push(date);
      }
    } else if (filter === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
    }

    return dates.map((date) => {
      const dateKey = getLocalDateKey(date);
      const daySessions = sessions.filter((s) => {
        const sessionDate = getLocalDateKey(new Date(s.completedAt));
        return sessionDate === dateKey;
      });

      const totalMinutes = daySessions.reduce((acc, s) => acc + s.duration / 60, 0);
      const totalHours = totalMinutes / 60;

      const target = dailyTargets[dateKey];
      const targetMinutes = target || 0;
      const targetHours = targetMinutes / 60;

      let intensity = 0;
      let hasActivity = totalMinutes > 0;

      if (target && targetMinutes > 0) {
        if (totalMinutes >= targetMinutes) {
          intensity = Math.min(totalHours / targetHours, 2);
        } else {
          intensity = Math.max(0.3, totalMinutes / targetMinutes);
        }
      } else {
        if (totalHours >= 1) {
          intensity = Math.min(totalHours / 3, 1);
        } else if (totalMinutes > 0) {
          intensity = Math.max(0.2, totalMinutes / 60);
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
        hasActivity,
        intensity: Math.max(0.2, Math.min(intensity, 1)),
        tasks: [...new Set(daySessions.map((s) => s.taskId))].map(
          (taskId) => tasks.find((t) => t.id === taskId)?.name || "Task đã xóa"
        ),
      };
    });
  }, [sessions, tasks, filter, dailyTargets]);

  // Calculate working days stats
  const { workingDays, totalDays, streak } = useMemo(() => {
    let consecutiveDays = 0;
    let maxStreak = 0;
    let currentStreak = 0;
    const workingDaysCount = heatmapData.filter(day => day.totalMinutes > 0).length;

    for (let i = 0; i < heatmapData.length; i++) {
      if (heatmapData[i].totalMinutes > 0) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 0;
      }
    }
    maxStreak = Math.max(maxStreak, currentStreak);

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

  // Simple wireframe heatmap cell style
  const getCellStyle = (dayData) => {
    if (!dayData.hasActivity) {
      return "bg-white border-2 border-gray-300";
    }

    // Đơn giản: chỉ dùng màu xám đậm nhạt theo mức độ
    if (dayData.intensity > 0.7) {
      return "bg-gray-900 border-2 border-black";
    } else if (dayData.intensity > 0.4) {
      return "bg-gray-600 border-2 border-black";
    } else {
      return "bg-gray-300 border-2 border-black";
    }
  };

  const getCellBackground = (dayData) => {
    // Không cần background pattern phức tạp nữa
    return {};
  };

  return (
    <>
      {/* Legend - Wireframe Style */}
      <div className="flex items-center space-x-4 mb-4 text-xs">
        <span className="text-gray-600">Ít</span>
        <div className="flex space-x-1">
          <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded"></div>
          <div className="w-4 h-4 border-2 border-black rounded" style={{
            background: 'repeating-linear-gradient(45deg, transparent, transparent 7px, #1a1a1a 7px, #1a1a1a 8px)'
          }}></div>
          <div className="w-4 h-4 border-2 border-black rounded" style={{
            background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, #1a1a1a 5px, #1a1a1a 6px)'
          }}></div>
          <div className="w-4 h-4 border-2 border-black rounded" style={{
            background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, #1a1a1a 3px, #1a1a1a 4px)'
          }}></div>
          <div className="w-4 h-4 bg-black border-2 border-black rounded"></div>
        </div>
        <span className="text-gray-600">Nhiều</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-sm p-3 border-2 border-black rounded-lg bg-white">
        <div className="text-center">
          <div className="text-xs text-gray-500 uppercase">Ngày làm việc</div>
          <div className="font-bold text-lg text-gray-900">
            {workingDays} <span className="text-gray-500 font-medium">/ {totalDays}</span>
          </div>
        </div>
        <div className="text-center border-l-2 border-r-2 border-black">
          <div className="text-xs text-gray-500 uppercase">Ngày nghỉ</div>
          <div className="font-bold text-lg text-gray-900">
            {totalDays - workingDays}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 uppercase">Chuỗi dài nhất</div>
          <div className="font-bold text-lg text-gray-900">
            {streak} ngày
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      {filter === "week" ? (
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-1">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
              <div
                key={day}
                className="text-xs font-medium text-gray-500 text-center w-8 h-6 flex items-center justify-center"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {heatmapData.map((dayData) => (
              <div
                key={dayData.dateKey}
                className={`w-8 h-8 rounded cursor-pointer ${getCellStyle(dayData)} hover:ring-2 hover:ring-gray-400 transition-all flex items-center justify-center text-xs font-medium`}
                style={getCellBackground(dayData)}
                onMouseEnter={(e) => handleMouseEnter(dayData, e)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                title={`${formatDate(dayData.date)}: ${formatTime(dayData.totalMinutes)}`}
              >
                <span className={dayData.hasActivity ? "text-white mix-blend-difference" : "text-gray-500"}>
                  {dayData.date.getDate()}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-7 sm:grid-cols-10 lg:grid-cols-12 xl:grid-cols-15 gap-1">
          {heatmapData.map((dayData) => (
            <div
              key={dayData.dateKey}
              className={`w-6 h-6 rounded cursor-pointer ${getCellStyle(dayData)} hover:ring-2 hover:ring-gray-400 transition-all flex items-center justify-center text-xs font-medium`}
              style={getCellBackground(dayData)}
              onMouseEnter={(e) => handleMouseEnter(dayData, e)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              title={`${formatDate(dayData.date)}: ${formatTime(dayData.totalMinutes)}`}
            >
              <span className={dayData.hasActivity ? "text-white mix-blend-difference" : "text-gray-500"} style={{ fontSize: '10px' }}>
                {dayData.date.getDate()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tooltip - Wireframe Style */}
      {hoveredDate && (
        <div
          className="fixed z-50 bg-white text-gray-900 text-xs rounded-lg p-3 pointer-events-none max-w-xs border-2 border-black"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
            transform: "translateY(-100%)",
          }}
        >
          <div className="font-semibold mb-1 border-b border-gray-300 pb-1">
            {hoveredDate.date.toLocaleDateString("vi-VN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>

          <div className="space-y-1 mt-2">
            <div>
              ⏱️ Thời gian:{" "}
              <span className="font-semibold">
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
                <span className={`ml-1 ${hoveredDate.targetAchieved ? "text-gray-900" : "text-gray-500"}`}>
                  {hoveredDate.targetAchieved ? "✅ Đạt" : "❌ Chưa đạt"}
                </span>
              </div>
            ) : (
              <div className="text-gray-400">🎯 Không đặt mục tiêu</div>
            )}

            {hoveredDate.tasks.length > 0 && (
              <div>
                📝 Tasks:{" "}
                <span className="text-gray-700">
                  {hoveredDate.tasks.slice(0, 2).join(", ")}
                  {hoveredDate.tasks.length > 2 && ` +${hoveredDate.tasks.length - 2} khác`}
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
  allSessions = [],
}) => {
  const [viewMode, setViewMode] = useState("chart");
  const [chartTooltip, setChartTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    taskName: "",
    totalSeconds: 0,
    sessionsList: [],
  });

  React.useEffect(() => {
    if (filter === "day" && viewMode === "heatmap") {
      setViewMode("chart");
    }
  }, [filter, viewMode]);

  const { chartData, maxSessionsCount } = React.useMemo(() => {
    // 1. Organize data by task
    // Map tasks to their session arrays
    const taskDetailsMap = sessions.reduce((acc, session) => {
      const taskId = session.taskId;
      if (!acc[taskId]) acc[taskId] = [];
      acc[taskId].push(session.duration);
      return acc;
    }, {});

    const taskMap = tasks.reduce((map, task) => {
      map[task.id] = task.name;
      return map;
    }, {});

    const taskIds = Object.keys(taskDetailsMap);
    const labels = taskIds.map((taskId) => taskMap[taskId] || "Task đã xóa");

    // Find the max number of sessions any task has
    let maxSessionsCount = 0;
    taskIds.forEach((taskId) => {
      if (taskDetailsMap[taskId].length > maxSessionsCount) {
        maxSessionsCount = taskDetailsMap[taskId].length;
      }
    });

    // 2. Create stacked datasets
    const datasets = [];

    // Helper to generate a background for alternating segments
    // Since we aren't using repeating-linear-gradient in chart background color easily across all chart integrations, we use simple alternating grays
    const bgColors = ["#ffffff", "#e5e5e5", "#cfcfcf", "#b8b8b8"];

    for (let i = 0; i < maxSessionsCount; i++) {
      const dataForThisSessionIndex = taskIds.map((taskId) => {
        const sessionLengthInSeconds = taskDetailsMap[taskId][i] || 0;
        return Math.round((sessionLengthInSeconds / 3600) * 100) / 100; // Round to 2 decimals for hours
      });

      datasets.push({
        label: `Phiên ${i + 1}`,
        data: dataForThisSessionIndex,
        backgroundColor: bgColors[i % bgColors.length], // Alternating colors
        borderColor: "#1a1a1a",
        borderWidth: 2,
        borderRadius: 0,
        borderSkipped: false,
      });
    }

    // We also need to map raw full session arrays to access in the tooltip
    const rawSessionsList = taskIds.map((taskId) => taskDetailsMap[taskId]);

    // Add custom property to the first dataset to access later in tooltip
    if (datasets.length > 0) {
      datasets[0].rawSessionsList = rawSessionsList;
    }

    return {
      chartData: {
        labels,
        datasets,
      },
      maxSessionsCount
    };
  }, [sessions, tasks]);

  const chartOptions = React.useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    plugins: {
      legend: {
        display: false, // We hide the legend to keep it clean, but they are stacked
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#ffffff',
        titleColor: '#1a1a1a',
        bodyColor: '#1a1a1a',
        borderColor: '#1a1a1a',
        borderWidth: 2,
        cornerRadius: 0,
        displayColors: true,
        callbacks: {
          title: function (context) {
            return context[0].label; // Task name
          },
          label: function (context) {
            const rawHrs = context.raw;
            if (rawHrs === 0) return null; // Hide empty session segments from tooltip if Chart.js tries to render it

            // Format time
            const minutes = Math.round(rawHrs * 60);
            let timeStr = "";
            if (minutes >= 60) {
              const h = Math.floor(minutes / 60);
              const m = minutes % 60;
              timeStr = m > 0 ? `${h}h ${m}p` : `${h}h`;
            } else {
              timeStr = `${minutes}p`;
            }

            return `${context.dataset.label}: ${timeStr}`;
          },
          footer: function (context) {
            // Let's add the total at the footer
            const dataIndex = context[0].dataIndex;
            let totalHrs = 0;
            context[0].chart.data.datasets.forEach(ds => {
              totalHrs += (ds.data[dataIndex] || 0);
            });

            const totalMinutes = Math.round(totalHrs * 60);
            let timeStr = "";
            if (totalMinutes >= 60) {
              const h = Math.floor(totalMinutes / 60);
              const m = totalMinutes % 60;
              timeStr = m > 0 ? `${h}h ${m}p` : `${h}h`;
            } else {
              timeStr = `${totalMinutes}p`;
            }
            return `\nTổng cộng: ${timeStr}`;
          }
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          color: '#1a1a1a',
          font: {
            size: 12,
            weight: 'bold'
          },
          callback: function (value) {
            return value + "h";
          },
        },
        grid: {
          color: "#e5e5e5",
          lineWidth: 1,
        },
        border: {
          color: "#1a1a1a",
          width: 2,
        },
      },
      y: {
        stacked: true,
        ticks: {
          color: '#1a1a1a',
          maxRotation: 0,
          minRotation: 0,
          font: {
            size: 12,
            weight: 'bold'
          },
        },
        grid: {
          display: false,
        },
        border: {
          color: "#1a1a1a",
          width: 2,
        },
      },
    },
    elements: {
      bar: {
        borderWidth: 2,
      },
    },
  }), []);

  const getFilterText = (filter) => {
    if (filter === "day") return "hôm nay";
    if (filter === "week") return "tuần này";
    if (filter === "month") return "tháng này";
    return "";
  };

  const totalMinutes = sessions.reduce((acc, session) => acc + session.duration, 0) / 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = Math.round(totalMinutes % 60);

  const numberOfDaysWithSessions = useMemo(() => {
    if (sessions.length === 0) return 0;
    return new Set(
      sessions.map((s) => {
        const d = new Date(s.completedAt);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      })
    ).size;
  }, [sessions]);

  const formatTotalTime = () => {
    if (totalHours > 0) {
      return `${totalHours} giờ ${remainingMinutes} phút`;
    }
    return `${Math.round(totalMinutes)} phút`;
  };

  // Overview stats
  const overview = useMemo(() => {
    if (!allSessions || allSessions.length === 0) {
      return null;
    }

    const totalSecondsAll = allSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const totalMinutesAll = Math.round(totalSecondsAll / 60);
    const totalHoursAll = Math.floor(totalMinutesAll / 60);
    const remainingMinutesAll = totalMinutesAll % 60;

    const dayKey = (dateInput) => {
      const d = new Date(dateInput);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const activeDayKeys = Array.from(new Set(allSessions.map(s => dayKey(s.completedAt)))).sort();

    const firstDay = activeDayKeys[0];
    const lastDay = activeDayKeys[activeDayKeys.length - 1];

    const calendarDays = firstDay && lastDay
      ? Math.ceil((new Date(lastDay) - new Date(firstDay)) / (1000 * 60 * 60 * 24)) + 1
      : 0;

    // Longest streak
    let longestStreak = 0;
    let currentStreak = 0;
    const sortedDays = [...activeDayKeys].sort();

    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0) {
        currentStreak = 1;
      } else {
        const prevDate = new Date(sortedDays[i - 1]);
        const currDate = new Date(sortedDays[i]);
        const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
          currentStreak++;
        } else {
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak);

    const avgPerActiveDay = activeDayKeys.length > 0 ? Math.round(totalMinutesAll / activeDayKeys.length) : 0;
    const avgPerCalendarDay = calendarDays > 0 ? Math.round(totalMinutesAll / calendarDays) : 0;
    const avgPerSession = allSessions.length > 0 ? Math.round(totalMinutesAll / allSessions.length) : 0;

    // Top tasks
    const taskDurations = {};
    allSessions.forEach(s => {
      taskDurations[s.taskId] = (taskDurations[s.taskId] || 0) + s.duration;
    });

    const topTasks = Object.entries(taskDurations)
      .map(([taskId, seconds]) => ({
        taskId,
        seconds,
        minutes: Math.round(seconds / 60),
        name: tasks.find(t => t.id === Number(taskId))?.name || "Task đã xóa"
      }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 5);

    const maxTop = topTasks.length > 0 ? topTasks[0].seconds : 1;

    // Longest session
    const longestSession = allSessions.reduce((max, s) => s.duration > max.duration ? s : max, { duration: 0 });
    const longestPretty = longestSession.duration > 0 ? {
      minutes: Math.round(longestSession.duration / 60),
      task: tasks.find(t => t.id === longestSession.taskId)?.name || "Task đã xóa",
      date: new Date(longestSession.completedAt).toLocaleDateString("vi-VN")
    } : null;

    return {
      totalMinutesAll,
      totalHoursAll,
      remainingMinutesAll,
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
    <div className="wire-card p-4 mb-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {viewMode === "overview" ? "🌐 Tổng quan" : `📊 Thống kê ${getFilterText(filter)}`}
            </h2>

            {/* View Mode Toggle - Wireframe Style */}
            <div className="flex border-2 border-black rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("chart")}
                className={`px-3 py-1 text-sm font-medium transition-colors ${viewMode === "chart" ? "bg-black text-white" : "bg-white text-gray-900 hover:bg-gray-100"
                  }`}
                title="Biểu đồ cột"
              >
                📊
              </button>

              {canShowHeatmap && (
                <button
                  onClick={() => setViewMode("heatmap")}
                  className={`px-3 py-1 text-sm font-medium transition-colors border-l-2 border-black ${viewMode === "heatmap" ? "bg-black text-white" : "bg-white text-gray-900 hover:bg-gray-100"
                    }`}
                  title="Heatmap"
                >
                  🔥
                </button>
              )}

              <button
                onClick={() => setViewMode("overview")}
                className={`px-3 py-1 text-sm font-medium transition-colors border-l-2 border-black ${viewMode === "overview" ? "bg-black text-white" : "bg-white text-gray-900 hover:bg-gray-100"
                  }`}
                title="Toàn bộ dữ liệu"
              >
                🌐
              </button>
            </div>
          </div>

          {viewMode !== "overview" && sessions.length > 0 && (
            <p className="text-sm text-gray-600">
              Tổng cộng:{" "}
              <span className="font-semibold text-gray-900">
                {formatTotalTime()}
              </span>{" "}
              ({sessions.length} phiên)
            </p>
          )}

          {viewMode === "overview" && overview && (
            <p className="text-sm text-gray-600">
              Từ {new Date(overview.firstDay).toLocaleDateString("vi-VN")} đến {new Date(overview.lastDay).toLocaleDateString("vi-VN")} •{" "}
              <span className="font-semibold text-gray-900">
                {overview.totalHoursAll} giờ {overview.remainingMinutesAll} phút
              </span>{" "}
              ({overview.sessionsCount} phiên, {overview.activeDays}/{overview.calendarDays} ngày)
            </p>
          )}
        </div>

        {/* Filter Toggle - Wireframe Style */}
        {viewMode !== "overview" && (
          <div className="flex border-2 border-black rounded-lg overflow-hidden">
            {["day", "week", "month"].map((f, index) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-sm font-medium transition-colors ${index > 0 ? 'border-l-2 border-black' : ''
                  } ${filter === f ? "bg-black text-white" : "bg-white text-gray-900 hover:bg-gray-100"
                  }`}
              >
                {f === "day" ? "Hôm nay" : f === "week" ? "Tuần" : "Tháng"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Area */}
      {viewMode === "overview" ? (
        <div className="space-y-4">
          {/* Top KPIs - Wireframe Style */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="wire-stat-card-dark">
              <div className="text-sm opacity-90">Tổng thời gian</div>
              <div className="text-2xl font-bold mt-1">{overview?.totalHoursAll || 0}h {overview?.remainingMinutesAll || 0}p</div>
              <div className="text-xs mt-1 opacity-70">TB/ngày: {formatMinutes(overview?.avgPerActiveDay || 0)}</div>
            </div>
            <div className="wire-stat-card">
              <div className="text-sm text-gray-600">Phiên làm việc</div>
              <div className="text-2xl font-bold mt-1 text-gray-900">{overview?.sessionsCount || 0}</div>
              <div className="text-xs mt-1 text-gray-500">TB/phiên: {formatMinutes(overview?.avgPerSession || 0)}</div>
            </div>
            <div className="wire-stat-card">
              <div className="text-sm text-gray-600">Chuỗi dài nhất</div>
              <div className="text-2xl font-bold mt-1 text-gray-900">{overview?.longestStreak || 0} ngày</div>
              <div className="text-xs mt-1 text-gray-500">TB/ngày lịch: {formatMinutes(overview?.avgPerCalendarDay || 0)}</div>
            </div>
          </div>

          {/* Top Tasks - Wireframe Style */}
          {overview && (
            <div className="wire-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">🏆 Top Tasks</h3>
                <span className="text-xs text-gray-500">Đơn vị: phút</span>
              </div>
              <div className="space-y-2">
                {overview.topTasks.map((t) => {
                  const pct = Math.round((t.seconds / overview.maxTop) * 100);
                  return (
                    <div key={t.taskId}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-900">{t.name}</span>
                        <span className="text-gray-600">{t.minutes}p</span>
                      </div>
                      <div className="w-full h-3 rounded border-2 border-black bg-white overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${pct}%`,
                            background: 'repeating-linear-gradient(45deg, #1a1a1a, #1a1a1a 3px, #4a4a4a 3px, #4a4a4a 6px)'
                          }}
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
          )}

          {/* Longest Session */}
          {overview?.longestPretty && (
            <div className="wire-card p-4">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">⏱️</div>
                <div>
                  <div className="font-semibold text-gray-900">
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

                  {/* Quick Stats - Wireframe Style */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t-2 border-black">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Tổng thời gian</p>
                      <p className="text-lg font-bold text-gray-900">{formatTotalTime()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Tổng phiên</p>
                      <p className="text-lg font-bold text-gray-900">{sessions.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">TB / Phiên</p>
                      <p className="text-lg font-bold text-gray-900">
                        {sessions.length > 0 ? `${Math.round(totalMinutes / sessions.length)}p` : "0p"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Tasks</p>
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