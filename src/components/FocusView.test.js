import React from "react";
import { render, act } from "@testing-library/react";
import FocusView from "./FocusView";

describe("FocusView unmount cleanup", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.Notification = jest.fn();
    global.Notification.permission = "denied";
    global.Notification.requestPermission = jest.fn().mockResolvedValue("denied");
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test("does not play completion sound if unmounted during the 100ms completion delay", () => {
    const playMock = jest.fn().mockResolvedValue(undefined);
    const audioSpy = jest.spyOn(window, "Audio").mockImplementation(() => ({
      play: playMock,
      pause: jest.fn(),
      volume: 1,
      preload: "auto",
      currentTime: 0,
    }));

    const onSessionEnd = jest.fn();
    const onStop = jest.fn();

    const { unmount } = render(
      <FocusView
        session={{ task: { id: "t1", name: "Test Task" }, duration: 1 }}
        onSessionEnd={onSessionEnd}
        onStop={onStop}
      />
    );

    // Advance 1000ms so remainingSec reaches 0 and schedules the 100ms completion timeout
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Unmount immediately before the 100ms timeout fires (e.g. user stops session)
    unmount();

    // Advance past the 100ms timeout
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(playMock).not.toHaveBeenCalled();
    expect(onSessionEnd).not.toHaveBeenCalled();
    audioSpy.mockRestore();
  });
});
