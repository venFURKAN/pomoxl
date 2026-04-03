export const STORAGE_KEY = 'pomodoro_anti_data_v1';

export const defaultSettings = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlexThompson&style=circle',
  strictMode: false,
  zenMode: false,
  pushNotifications: false,
  soundEnabled: true,
  dailyGoal: 4
};

// Mode definitions
export const MODES = {
  POMODORO: 'pomodoro',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak',
};

// Initial state for overall data
const initialData = {
  settings: { ...defaultSettings },
  sessions: [], // { timestamp, duration, mode }
  tasks: [], // { id, text, completed }
  activeTaskId: null,
};

export const loadData = () => {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      return initialData;
    }
    const data = JSON.parse(rawData);
    return {
      settings: { ...defaultSettings, ...data.settings },
      sessions: data.sessions || [],
      tasks: data.tasks || [],
      activeTaskId: data.activeTaskId || null,
    };
  } catch (err) {
    console.error('Failed to load from localStorage', err);
    return initialData;
  }
};

export const saveData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
};

export const addSession = (duration, mode) => {
  const data = loadData();
  data.sessions.push({
    timestamp: new Date().toISOString(),
    duration, // in minutes (or seconds if preferred, let's use seconds actually to be precise)
    mode,
  });
  saveData(data);
};
