import firebaseSyncService from './firebaseSyncService';

describe('FirebaseSyncService Smart Merge Logic', () => {
  test('merges local and remote tasks without duplication and respects latest updates', () => {
    const local = {
      tasks: [
        { id: 1, name: 'Task 1 Local', updatedAt: '2026-10-20T10:00:00Z' },
        { id: 2, name: 'Task 2 Local Only', updatedAt: '2026-10-21T10:00:00Z' }
      ],
      sessions: []
    };

    const remote = {
      tasks: [
        { id: 1, name: 'Task 1 Updated on Cloud', updatedAt: '2026-10-22T10:00:00Z' },
        { id: 3, name: 'Task 3 Cloud Only', updatedAt: '2026-10-21T12:00:00Z' }
      ],
      sessions: []
    };

    const merged = firebaseSyncService.mergeData(local, remote);

    expect(merged.tasks.length).toBe(3);
    const task1 = merged.tasks.find((t) => t.id === 1);
    expect(task1.name).toBe('Task 1 Updated on Cloud');

    const task2 = merged.tasks.find((t) => t.id === 2);
    expect(task2.name).toBe('Task 2 Local Only');

    const task3 = merged.tasks.find((t) => t.id === 3);
    expect(task3.name).toBe('Task 3 Cloud Only');
  });

  test('merges sessions as a unique set by id without losing history', () => {
    const local = {
      tasks: [],
      sessions: [
        { id: 101, taskId: 1, duration: 25, completedAt: '2026-10-20T10:30:00Z' },
        { id: 102, taskId: 1, duration: 50, completedAt: '2026-10-21T11:00:00Z' }
      ]
    };

    const remote = {
      tasks: [],
      sessions: [
        { id: 102, taskId: 1, duration: 50, completedAt: '2026-10-21T11:00:00Z' },
        { id: 103, taskId: 2, duration: 25, completedAt: '2026-10-22T09:00:00Z' }
      ]
    };

    const merged = firebaseSyncService.mergeData(local, remote);

    expect(merged.sessions.length).toBe(3);
    const ids = merged.sessions.map((s) => s.id);
    expect(ids).toContain(101);
    expect(ids).toContain(102);
    expect(ids).toContain(103);
  });
});
