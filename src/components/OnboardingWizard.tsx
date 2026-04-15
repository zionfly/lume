import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../stores/appStore";

const STEPS = [
  {
    title: "Welcome to Lume",
    subtitle: "Let's set you up in under 5 minutes",
    field: "welcome",
  },
  {
    title: "What's your role?",
    subtitle: "This helps Lume tailor responses to your context",
    field: "role",
    options: [
      "Software Engineer",
      "Product Manager",
      "Designer",
      "Data Scientist",
      "Researcher",
      "Student",
      "Other",
    ],
  },
  {
    title: "Your go-to tools?",
    subtitle: "Lume will learn your stack and adapt",
    field: "tools",
    options: [
      "VS Code",
      "Terminal/CLI",
      "Figma",
      "Notion",
      "Linear",
      "Slack",
      "Feishu/Lark",
      "Git/GitHub",
    ],
    multi: true,
  },
  {
    title: "AI Model Preference",
    subtitle: "Choose your default AI backend",
    field: "model",
    options: [
      "Claude (Anthropic) — recommended",
      "Built-in Relay (no API key needed)",
      "I'll configure later",
    ],
  },
  {
    title: "You're all set!",
    subtitle: "Lume will keep learning as you use it",
    field: "done",
  },
];

export default function OnboardingWizard() {
  const { completeOnboarding } = useAppStore();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const current = STEPS[step];

  const handleSelect = (value: string) => {
    if (current.multi) {
      const prev = (answers[current.field] as string[]) || [];
      const next = prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value];
      setAnswers({ ...answers, [current.field]: next });
    } else {
      setAnswers({ ...answers, [current.field]: value });
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      // Persist onboarding to USER.md via Tauri backend
      invoke("save_onboarding", {
        data: {
          role: answers.role || null,
          tools: answers.tools || null,
          model: answers.model || null,
        },
      }).catch(console.error);
      completeOnboarding();
    }
  };

  const isSelected = (value: string) => {
    const answer = answers[current.field];
    if (Array.isArray(answer)) return answer.includes(value);
    return answer === value;
  };

  return (
    <div className="h-screen flex items-center justify-center bg-surface-0">
      <div className="w-full max-w-md mx-auto p-8">
        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i <= step ? "bg-lume-400" : "bg-surface-3"
              }`}
            />
          ))}
        </div>

        {/* Logo */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lume-400 to-lume-600 flex items-center justify-center mb-6">
          <span className="text-black font-bold text-lg">L</span>
        </div>

        {/* Content */}
        <h1 className="text-2xl font-semibold mb-1">{current.title}</h1>
        <p className="text-sm text-gray-500 mb-6">{current.subtitle}</p>

        {/* Options */}
        {current.options && (
          <div className="space-y-2 mb-8">
            {current.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${
                  isSelected(opt)
                    ? "bg-lume-400/15 text-lume-300 ring-1 ring-lume-400/30"
                    : "bg-surface-2 text-gray-300 hover:bg-surface-3"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 px-6 py-2.5 bg-lume-500 hover:bg-lume-600 text-black font-medium rounded-xl text-sm transition-colors"
          >
            {step === STEPS.length - 1 ? "Start Using Lume" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
