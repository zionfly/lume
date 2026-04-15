import { create } from "zustand";

export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls?: string;
  token_count: number;
  created_at: string;
}

export interface SkillMeta {
  name: string;
  description: string;
  trigger: string;
  version: number;
  auto_generated: boolean;
}

export interface MemoryProfile {
  user: { raw: string; char_count: number };
  env: { raw: string; char_count: number };
}

interface AppState {
  // Onboarding
  isOnboarded: boolean;
  completeOnboarding: () => void;

  // Sessions
  sessions: Session[];
  activeSessionId: string | null;
  setSessions: (sessions: Session[]) => void;
  setActiveSession: (id: string) => void;

  // Messages
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;

  // Memory
  memoryProfile: MemoryProfile | null;
  setMemoryProfile: (profile: MemoryProfile) => void;

  // Skills
  skills: SkillMeta[];
  setSkills: (skills: SkillMeta[]) => void;

  // UI state
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnboarded: localStorage.getItem("lume_onboarded") === "true",
  completeOnboarding: () => {
    localStorage.setItem("lume_onboarded", "true");
    set({ isOnboarded: true });
  },

  sessions: [],
  activeSessionId: null,
  setSessions: (sessions) => set({ sessions }),
  setActiveSession: (id) => set({ activeSessionId: id }),

  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  memoryProfile: null,
  setMemoryProfile: (profile) => set({ memoryProfile: profile }),

  skills: [],
  setSkills: (skills) => set({ skills }),

  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
}));
