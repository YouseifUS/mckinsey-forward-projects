export type HabitInput = {
  name: string;
  intention: string;
  meaning: string;
  cue: string;
  routine: string;
  reward: string;
};

export type Habit = HabitInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
};

export type HabitStatistics = {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
};

export type HabitSummary = Habit &
  HabitStatistics & {
    completedToday: boolean;
  };

export type HabitDetails = Habit & {
  completionDates: string[];
  statistics: HabitStatistics;
  completedToday: boolean;
};

export type HabitDraft = HabitInput;

export const EMPTY_HABIT_DRAFT: HabitDraft = {
  name: '',
  intention: '',
  meaning: '',
  cue: '',
  routine: '',
  reward: '',
};
