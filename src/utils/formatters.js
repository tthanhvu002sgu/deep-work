// src/utils/formatters.js

// Hàm định dạng thời gian từ giây sang giờ, phút, giây
export const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '0 giây';
  if (seconds < 60) return `${seconds} giây`;
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  
  let parts = [];
  if (h > 0) parts.push(`${h} giờ`);
  if (m > 0) parts.push(`${m} phút`);
  
  return parts.join(' ');
};

// Hàm lấy văn bản tương ứng với bộ lọc
export const getFilterText = (filter) => {
  const filterMap = {
    day: 'hôm nay',
    week: 'tuần này',
    month: 'tháng này',
  };
  return filterMap[filter] || '';
};