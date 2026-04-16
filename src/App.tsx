import { useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatView from "./components/ChatView";
import MemoryPanel from "./components/MemoryPanel";
import SkillBrowser from "./components/SkillBrowser";
import WorkspacePanel from "./components/WorkspacePanel";
import OnboardingWizard from "./components/OnboardingWizard";
import Settings from "./components/Settings";
import { useAppStore } from "./stores/appStore";

type RightPanel = "none" | "memory" | "skills" | "workspace";

function App() {
  const { isOnboarded } = useAppStore();
  const [rightPanel, setRightPanel] = useState<RightPanel>("none");
  const [showSettings, setShowSettings] = useState(false);

  if (!isOnboarded) {
    return <OnboardingWizard />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        onTogglePanel={setRightPanel}
        activePanel={rightPanel}
        onOpenSettings={() => setShowSettings(true)}
      />
      <main className="flex-1 flex">
        <ChatView />
        {rightPanel === "memory" && <MemoryPanel />}
        {rightPanel === "skills" && <SkillBrowser />}
        {rightPanel === "workspace" && <WorkspacePanel />}
      </main>
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;
