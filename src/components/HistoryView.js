import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const HistoryView = ({ sessions, tasks, filter, setFilter }) => {
  // Tổng hợp dữ liệu cho biểu đồ
  const chartData = React.useMemo(() => {
    const dataByTask = sessions.reduce((acc, session) => {
      acc[session.taskId] = (acc[session.taskId] || 0) + session.duration;
      return acc;
    }, {});

    const taskMap = tasks.reduce((map, task) => {
      map[task.id] = task.name;
      return map;
    }, {});

    const labels = Object.keys(dataByTask).map(taskId => taskMap[taskId] || 'Task đã xóa');
    const data = Object.values(dataByTask).map(totalSeconds => Math.round(totalSeconds / 60));

    return { labels, data };
  }, [sessions, tasks]);

  const data = {
    labels: chartData.labels,
    datasets: [{
      label: 'Thời gian tập trung (phút)',
      data: chartData.data,
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderRadius: 5,
    }]
  };
  
  const options = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
            x: { grid: { display: false }, ticks: { display: false } },
            y: { grid: { display: false }, ticks: { font: { size: 10 }}}
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.raw} phút`
                }
            }
        }
    };

  return (
    <div className="mb-6">
      <div className="flex justify-center bg-slate-200 p-1 rounded-lg mb-4 max-w-xs mx-auto">
        {['day', 'week', 'month'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 capitalize text-sm font-semibold py-1.5 rounded-md transition-colors ${filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
          >
            {f === 'day' ? 'Ngày' : (f === 'week' ? 'Tuần' : 'Tháng')}
          </button>
        ))}
      </div>
      <div className="h-[150px] bg-white rounded-xl shadow-sm p-3">
        {chartData.data.length > 0 ? <Bar data={data} options={options} /> : <p className="text-center text-slate-400 pt-12">Không có dữ liệu cho khoảng thời gian này.</p>}
      </div>
    </div>
  );
};

export default HistoryView;