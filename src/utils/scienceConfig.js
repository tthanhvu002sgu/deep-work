// src/utils/scienceConfig.js

/**
 * Phân loại phiên làm việc theo nghiên cứu khoa học (Ultradian & Deep Work)
 */
export const getSessionScienceMeta = (durationMinutes) => {
  if (durationMinutes === 0) {
    return {
      type: 'free',
      label: 'Free Mode (Tự do)',
      badgeText: '⏱️ Tự do',
      badgeBg: 'bg-gray-100 border-gray-400 text-gray-900',
      tagColor: 'bg-gray-700 text-white',
      breakDuration: 10 * 60, // 10p
      breakMinutes: 10,
      recommendation: 'Làm việc tự do đếm thời gian xuôi không giới hạn.',
      breakMessage: '☕ Bạn đã kết thúc phiên làm việc tự do! Hãy dành 10 phút để thư giãn thả lỏng cơ thể.',
      breakIcon: '⏱️',
      scienceNote: 'Theo dõi thời gian hoàn thành task không bị ràng buộc đếm ngược.'
    };
  }

  if (durationMinutes >= 50) {
    const breakMinutes = durationMinutes >= 90 ? 20 : 15;
    return {
      type: 'deep',
      label: 'Tập trung Sâu (Deep Work)',
      badgeText: '🧠 Deep Work (Sâu)',
      badgeBg: 'bg-purple-100 border-purple-400 text-purple-900',
      tagColor: 'bg-purple-600 text-white',
      breakDuration: breakMinutes * 60,
      breakMinutes: breakMinutes,
      recommendation: 'Dành cho nghiên cứu khoa học, lập trình, tư duy chiến lược & bài toán khó.',
      breakMessage: `🔥 Tuyệt vời! Bạn vừa trải qua phiên Deep Work (${durationMinutes} phút) cường độ cao. Hãy đứng dậy đi dạo, uống nước và rời mắt khỏi màn hình hoàn toàn để não bộ phục hồi nhận thức!`,
      breakIcon: '🧠',
      scienceNote: 'Dựa trên nhịp siêu ngày Ultradian (Tối đa 90p tập trung sâu + 15-20p nghỉ phục hồi).'
    };
  } else if (durationMinutes >= 30) {
    return {
      type: 'medium',
      label: 'Tập trung Vừa (Medium)',
      badgeText: '⚡ Vừa sức (Medium)',
      badgeBg: 'bg-blue-100 border-blue-400 text-blue-900',
      tagColor: 'bg-blue-600 text-white',
      breakDuration: 10 * 60, // 10 phút
      breakMinutes: 10,
      recommendation: 'Dành cho đọc sách, làm bài tập, viết báo cáo ngắn & phân tích.',
      breakMessage: `👏 Phiên làm việc vừa sức (${durationMinutes} phút) đã hoàn thành! Hãy vươn người, giãn cơ và thư giãn mắt trong 10 phút nhé.`,
      breakIcon: '⚡',
      scienceNote: 'Tối ưu cho công việc tư duy trung bình mà không gây quá tải não bộ.'
    };
  } else {
    return {
      type: 'short',
      label: 'Tập trung Ngắn (Pomodoro)',
      badgeText: '🌱 Ngắn (Pomodoro)',
      badgeBg: 'bg-emerald-100 border-emerald-400 text-emerald-900',
      tagColor: 'bg-emerald-600 text-white',
      breakDuration: 5 * 60, // 5 phút
      breakMinutes: 5,
      recommendation: 'Dành cho công việc nhỏ, trả lời mail, kiểm tra danh sách task.',
      breakMessage: `☕ Hoàn thành phiên ngắn (${durationMinutes} phút)! Tạm nghỉ 5 phút, uống chút nước rồi tiếp tục nhé.`,
      breakIcon: '🌱',
      scienceNote: 'Phương pháp Pomodoro linh hoạt cho các công việc duy trì nhịp độ.'
    };
  }
};

/**
 * Lấy trạng thái cảnh báo năng lượng trong ngày dựa trên giới hạn 4 tiếng khoa học
 */
export const getDailyFocusStatus = (todayFocusSeconds) => {
  const hours = todayFocusSeconds / 3600;
  
  if (hours >= 4) {
    return {
      level: 'max',
      label: 'Đã đạt mức tối đa (4h/ngày)',
      shortLabel: '🔴 Đã đạt mức tối đa (4h/ngày)',
      badgeClass: 'bg-red-600 text-white border-2 border-red-800 animate-pulse font-bold shadow',
      textClass: 'text-red-600 font-bold',
      icon: '🔴',
      warningMessage: '⚠️ Theo nghiên cứu khoa học, bạn đã đạt ngưỡng giới hạn 4h Deep Work trong ngày. Hãy nghỉ ngơi để tránh mệt mỏi nhận thức!'
    };
  } else if (hours >= 3) {
    return {
      level: 'optimal',
      label: 'Đạt ngưỡng tối ưu (3-4h/ngày)',
      shortLabel: '🟡 Ngưỡng tối ưu (3-4h)',
      badgeClass: 'bg-amber-500 text-white border-2 border-amber-700 font-bold',
      textClass: 'text-amber-700 font-bold',
      icon: '🟡',
      warningMessage: '⚡ Đã đạt 3-4h tập trung sâu hôm nay. Hiệu suất tư duy đang ở trạng thái đỉnh cao!'
    };
  } else if (todayFocusSeconds > 0) {
    return {
      level: 'good',
      label: 'Trạng thái tập trung tốt',
      shortLabel: '🟢 Năng lượng tốt',
      badgeClass: 'bg-emerald-600 text-white border-2 border-emerald-800 font-semibold',
      textClass: 'text-emerald-700 font-semibold',
      icon: '🟢',
      warningMessage: null
    };
  } else {
    return {
      level: 'start',
      label: 'Sẵn sàng làm việc',
      shortLabel: '⚪ Sẵn sàng',
      badgeClass: 'bg-gray-100 text-gray-700 border-2 border-gray-400 font-medium',
      textClass: 'text-gray-600 font-medium',
      icon: '⚪',
      warningMessage: null
    };
  }
};
