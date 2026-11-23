# DeepWork

Ứng dụng quản lý phiên tập trung (Deep Work / Pomodoro / Free Mode), theo dõi lịch sử làm việc, lịch tuần và đồng bộ dữ liệu (LocalStorage / File / Firebase).

## Tổng quan tính năng

- Quản lý danh sách công việc (thêm, sửa, lưu trữ, xóa) và thiết lập mục tiêu tập trung theo ngày.
- Phiên tập trung (`FocusView`) hỗ trợ đếm ngược theo preset hoặc chế độ tự do (`duration === 0`), kèm màn hình nghỉ giải lao (`BreakScreen`).
- Lịch tuần (`weeklyTasks`) nhắc việc theo khung giờ trong ngày.
- Thống kê lịch sử (`HistoryView`) và đồng bộ dữ liệu qua file cục bộ / Firebase (`CloudSyncModal`, `FileManagerModal`).

## Kiến trúc hệ thống

- `src/App.js`: Điều phối trạng thái chính (`tasks`, `sessions`, `weeklyTasks`, `activeSession`, `activeBreak`), vòng lặp kiểm tra lịch tuần và các modal.
- `src/services/`: Lưu trữ cục bộ (`fileStorageService.js`), cấu hình Firebase (`firebase.js`) và đồng bộ đám mây (`firebaseSyncService.js`).
- `src/utils/`: Cấu hình chu kỳ tập trung/nghỉ (`scienceConfig.js`), định dạng dữ liệu (`formatters.js`) và quản lý focus tab (`tabFoCusManager.js`).

## Các component chính

- `FocusView` (`src/components/FocusView.js`): Bộ đếm thời gian phiên tập trung, phát âm thanh kết thúc (`noti2.mp3`) và thông báo trình duyệt.
- `BreakScreen` (`src/components/BreakScreen.jsx`): Bộ đếm thời gian nghỉ giữa phiên.
- `TaskList` / `TaskItem` (`src/components/TaskList.js`, `src/components/TaskItem.js`): Hiển thị và thao tác danh sách task.
- `HistoryView` (`src/components/HistoryView.js`): Biểu đồ và danh sách lịch sử phiên làm việc.
- `Modals` (`src/components/Modals.js`): Các hộp thoại tạo/sửa task, mục tiêu ngày, lịch tuần và xác nhận thao tác.

## Các task đã làm

- **2026-11-23 — Sửa lỗi phát nhầm âm thanh kết thúc phiên:**
  - Tách âm thanh nhắc lịch tuần trong `src/App.js` sang `noti.mp3`, chặn phát âm thanh nhắc lịch khi đang có `activeSession` hoặc `activeBreak`, thêm dedupe theo `task.id + ngày` và bắt lỗi `audio.play()` Promise.
  - Bổ sung cleanup `completeTimeoutRef` và `endTimeoutRef` khi unmount trong `src/components/FocusView.js` để tránh phát `noti2.mp3` sau khi đã dừng phiên.
  - Kết quả verify: `npm test -- --watchAll=false` pass 4/4 suites (5/5 tests, gồm `src/components/FocusView.test.js` và `src/weeklyReminder.test.js`); `npm run build` thành công.

## Các task chưa làm

- Chưa có task mới được chốt.

---

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
