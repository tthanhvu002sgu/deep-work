## AI Instructions for Project: DeepWork

## 1. Tổng quan dự án (Project Overview)

Mục đích chính: Ứng dụng quản lý thời gian và năng suất làm việc theo phương pháp Pomodoro, giúp người dùng tập trung vào các nhiệm vụ quan trọng và theo dõi tiến độ công việc thông qua timer đếm ngược và thống kê.
Công nghệ chính (Tech Stack): ReactJS 19.1.1, Tailwind CSS 3.4.17, Chart.js 4.5.0, React-Chartjs-2 5.3.0, JavaScript ES6+, HTML5, CSS3.

## 2. Cấu trúc thư mục (Project Structure)

deepwork/
├── public/
│ ├── index.html
│ ├── manifest.json
│ ├── favicon.ico
│ └── robots.txt
├── src/
│ ├── components/
│ │ ├── BreakView.js
│ │ ├── FocusView.js
│ │ ├── Header.js
│ │ ├── HistoryView.js
│ │ ├── Modals.js
│ │ ├── TaskItem.js
│ │ └── TaskList.js
│ ├── utils/
│ ├── App.js
│ ├── App.css
│ ├── index.js
│ └── index.css
├── package.json
├── tailwind.config.js
└── README.md

## 3. Diễn giải chi tiết (Detailed Breakdown)

## 3.1. Phân tích Thư mục (Folder Breakdown)

src: Chứa toàn bộ mã nguồn chính của ứng dụng React.
components: Chứa các UI component chính của ứng dụng, mỗi component đảm nhận một chức năng cụ thể trong quy trình Pomodoro.
utils: Thư mục dành cho các utility functions (hiện tại trống, có thể mở rộng cho xử lý localStorage hoặc helper functions).
public: Chứa các tài sản tĩnh và file HTML gốc, manifest cho PWA.

## 3.2. Phân tích File quan trọng (Key Files Breakdown)

- `index.js`: Điểm khởi đầu của ứng dụng React, render component App vào DOM với React StrictMode.
- `App.js`: Component gốc quản lý state toàn cục và điều hướng giữa các view chính. Xử lý localStorage cho tasks và sessions, quản lý modal states.
- `TaskList.js`: Component hiển thị danh sách nhiệm vụ với khả năng click để bắt đầu session và xóa task.
- `TaskItem.js`: Component con hiển thị từng task riêng lẻ với nút bắt đầu và xóa.
- `FocusView.js`: Component màn hình timer Pomodoro với đếm ngược thời gian, điều khiển pause/resume, progress bar và xử lý kết thúc session.
- `BreakView.js`: Component màn hình nghỉ giải lao với timer đếm ngược và các nút điều khiển.
- `HistoryView.js`: Component hiển thị thống kê và biểu đồ thời gian làm việc theo filter (ngày/tuần/tháng) sử dụng Chart.js.
- `Header.js`: Component header hiển thị tổng thời gian tập trung theo filter được chọn.
- `Modals.js`: Chứa tất cả các modal components: TaskModal (thêm task/bắt đầu session), SessionEndModal, ConfirmStopModal, ConfirmDeleteModal.
- `tailwind.config.js`: Cấu hình Tailwind CSS với font Inter và content paths.

## 4. Luồng dữ liệu và Logic chính (Core Logic and Data Flow)

## 4.1. Luồng quản lý nhiệm vụ:

Người dùng click nút "+" → Mở TaskModal với mode "addTask" → Nhập tên task và submit → handleAddTask tạo task mới với ID timestamp → Task được thêm vào state và lưu localStorage → TaskList re-render hiển thị task mới.

## 4.2. Luồng session làm việc:

Người dùng click "Bắt đầu" trên task → Mở TaskModal với mode "startTask" → Chọn thời gian và submit → handleStartSession tạo activeSession → App render FocusView với timer đếm ngược → Khi timer kết thúc hoặc user click "Dừng" → handleAddSession lưu session data vào localStorage và quay về màn hình chính.

## 4.3. Luồng thống kê và lọc dữ liệu:

HistoryView nhận filteredSessions từ App → useMemo trong App filter sessions theo ngày/tuần/tháng → HistoryView xử lý data để tạo biểu đồ Chart.js → Header tính tổng thời gian từ filteredSessions → User có thể thay đổi filter để xem stats khác nhau.

## 4.4. State Management và Persistence:

App.js quản lý state chính: tasks, sessions, activeSession, modal, filter
Sử dụng useState với lazy initialization từ localStorage
useEffect để sync state với localStorage khi thay đổi
Các component con nhận props và callback functions từ App
Không sử dụng external state management library, chỉ dựa vào React built-in hooks

<!-- Rule -->

Best Practices cho Frontend (React + API)

1. Tổ chức code & tách component
   • Mỗi component nên chỉ làm một việc (Single Responsibility).
   • Tách:
   • UI component (Button, Card, TableRow…) → chỉ render giao diện.
   • Container/logic component → gọi API, xử lý state.
   • Dùng thư mục kiểu:
   src/
   ├─ components/
   ├─ pages/
   ├─ hooks/
   ├─ services/
   └─ utils/
   ⸻
2. Quản lý logic & API call
   • Không nhét fetch thẳng vào useEffect.
   • Tạo service layer (vd: apiService.js hoặc dùng Axios instance).
   • Tách request logic ra khỏi UI:
   // services/userService.js
   import api from "./api";
   export const getUsers = () => api.get("/users");
   • UI chỉ gọi:
   useEffect(() => {
   getUsers().then(setUsers).catch(handleError);
   }, []);
   ⸻
3. Cleanup trong useEffect
   • Khi subscribe hoặc fetch, cần cleanup tránh memory leak:
   useEffect(() => {
   const controller = new AbortController();
   fetch("/api/data", { signal: controller.signal })
   .then(res => res.json())
   .then(setData)
   .catch(err => {
   if (err.name !== "AbortError") console.error(err);
   });
   return () => controller.abort();
   }, []);
   ⸻
4. Error handling & Retry
   • Luôn handle lỗi (network down, 500 server, 404 not found…).
   • Có thể dùng react-query hoặc tự implement retry logic:
   async function fetchWithRetry(url, retries = 3) {
   for (let i = 0; i < retries; i++) {
   try {
   return await fetch(url);
   } catch (e) {
   if (i === retries - 1) throw e;
   }
   }
   }
   ⸻
5. State update tối ưu
   • Không setState liên tục → gây nhiều re-render.
   • Dùng debounce/throttle khi user input (vd: search box).
   const debouncedSearch = useMemo(() => debounce(handleSearch, 500), []);
   • Với nhiều request song song, gom vào Promise.all.
   ⸻
6. Performance & UX
   • Lazy loading component bằng React.lazy + Suspense.
   • Memoization (useMemo, useCallback) để tránh re-render không cần thiết.
   • Virtualize list (vd: react-window) khi render hàng nghìn item.
   • Loading state & fallback UI để UX mượt mà.
