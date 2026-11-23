import React from "react";
import { render, act } from "@testing-library/react";
import App from "./App";
import fileStorageService from "./services/fileStorageService";

describe("Weekly task reminder audio behavior", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    const now = new Date(2026, 10, 23, 9, 59, 55, 0); // Mon Nov 23 2026 09:59:55
    jest.setSystemTime(now);

    global.Notification = jest.fn();
    global.Notification.permission = "granted";
    global.Notification.requestPermission = jest.fn().mockResolvedValue("granted");

    jest.spyOn(fileStorageService, "ensureInitialized").mockResolvedValue(undefined);
    jest.spyOn(fileStorageService, "getTasks").mockResolvedValue([
      { id: "task-1", name: "Deep Work Task", archived: false },
    ]);
    jest.spyOn(fileStorageService, "getSessions").mockResolvedValue([]);
    jest.spyOn(fileStorageService, "getDailyTarget").mockResolvedValue({ targetMinutes: 120 });
    jest.spyOn(fileStorageService, "getArchivedTasks").mockResolvedValue([]);
    jest.spyOn(fileStorageService, "getWeeklyTasks").mockResolvedValue([
      {
        id: "w-1",
        name: "Họp tuần",
        dayOfWeek: now.getDay(),
        time: "10:00",
      },
    ]);
    jest.spyOn(fileStorageService, "getDailyTargets").mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test("uses noti.mp3 (not noti2.mp3) for weekly task reminders and deduplicates within the same day", async () => {
    const playMock = jest.fn().mockResolvedValue(undefined);
    const audioInstances = [];
    jest.spyOn(window, "Audio").mockImplementation((src) => {
      const instance = {
        src,
        play: playMock,
        volume: 1,
        preload: "auto",
        currentTime: 0,
      };
      audioInstances.push(instance);
      return instance;
    });

    await act(async () => {
      render(<App />);
    });

    // Trigger checkUpcomingTasks once at 09:59:55, then advance 10s
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    const weeklyAudioSrcs = audioInstances.map((a) => a.src);
    expect(weeklyAudioSrcs.length).toBe(1);
    expect(weeklyAudioSrcs[0]).toMatch(/noti\.mp3$/);
    expect(weeklyAudioSrcs[0]).not.toMatch(/noti2\.mp3$/);
  });
});
