import { useState, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import ChatView from "./components/ChatView";
import MemoryPanel from "./components/MemoryPanel";
import SkillBrowser from "./components/SkillBrowser";
import WorkspacePanel from "./components/WorkspacePanel";
import OnboardingWizard from "./components/OnboardingWizard";
import Settings from "./components/Settings";
import ResizeHandle from "./components/ResizeHandle";
import { useAppStore } from "./stores/appStore";

type RightPanel = "none" | "memory" | "skills" | "workspace";

function App() {
  const { isOnboarded } = useAppStore();
  const [rightPanel, setRightPanel] = useState<RightPanel>("none");
  const [showSettings, setShowSettings] = useState(false);

  // Resizable widths
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSidebarResize = useCallback(
    (delta: number) => {
      setSidebarWidth((w) => Math.max(180, Math.min(400, w + delta)));
    },
    []
  );

  const handleRightResize = useCallback(
    (delta: number) => {
      // delta is negative when dragging left (making panel wider)
      setRightPanelWidth((w) => Math.max(240, Math.min(500, w - delta)));
    },
    []
  );

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((c) => !c);
  }, []);

  if (!isOnboarded) {
    return <OnboardingWizard />;
  }

  const effectiveSidebarWidth = sidebarCollapsed ? 0 : sidebarWidth;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      {!sidebarCollapsed && (
        <>
          <div style={{ width: effectiveSidebarWidth, minWidth: effectiveSidebarWidth }}>
            <Sidebar
              onTogglePanel={setRightPanel}
              activePanel={rightPanel}
              onOpenSettings={() => setShowSettings(true)}
              onCollapse={toggleSidebar}
            />
          </div>
          <ResizeHandle direction="horizontal" onResize={handleSidebarResize} />
        </>
      )}

      {/* Collapsed sidebar toggle */}
      {sidebarCollapsed && (
        <button
          onClick={toggleSidebar}
          className="w-10 bg-surface-1 border-r border-surface-3 flex flex-col items-center pt-3 hover:bg-surface-2 transition-colors shrink-0"
          title="Expand sidebar"
        >
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-lume-400 to-lume-700 flex items-center justify-center">
            <span className="text-white font-bold text-[10px]">L</span>
          </div>
          <span className="text-[10px] text-sand-400 mt-2 [writing-mode:vertical-lr]">
            Expand
          </span>
        </button>
      )}

      {/* Main chat area */}
      <main className="flex-1 flex min-w-0">
        <ChatView />
      </main>

      {/* Right panel */}
      {rightPanel !== "none" && (
        <>
          <ResizeHandle direction="horizontal" onResize={handleRightResize} />
          <div style={{ width: rightPanelWidth, minWidth: rightPanelWidth }} className="shrink-0">
            {rightPanel === "memory" && <MemoryPanel />}
            {rightPanel === "skills" && <SkillBrowser />}
            {rightPanel === "workspace" && <WorkspacePanel />}
          </div>
        </>
      )}

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;
