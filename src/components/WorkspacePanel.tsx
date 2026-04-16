import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
}

export default function WorkspacePanel() {
  const [workspacePath, setWorkspacePath] = useState(
    localStorage.getItem("lume_workspace") || ""
  );
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");

  useEffect(() => {
    if (workspacePath) {
      setCurrentPath(workspacePath);
      loadDir(workspacePath);
    }
  }, [workspacePath]);

  const loadDir = async (path: string) => {
    try {
      const result = await invoke<FileEntry[]>("list_workspace", { path });
      setEntries(result);
      setCurrentPath(path);
      setSelectedFile(null);
      setFileContent("");
    } catch (err) {
      console.error("Failed to list:", err);
    }
  };

  const openFile = async (path: string) => {
    try {
      const content = await invoke<string>("read_workspace_file", { path });
      setSelectedFile(path);
      setFileContent(content);
    } catch (err) {
      setFileContent(`Error: ${err}`);
    }
  };

  const pickFolder = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected && typeof selected === "string") {
        localStorage.setItem("lume_workspace", selected);
        setWorkspacePath(selected);
      }
    } catch {
      // Fallback: prompt for manual input
      const path = prompt("Enter folder path:");
      if (path) {
        localStorage.setItem("lume_workspace", path);
        setWorkspacePath(path);
      }
    }
  };

  const navigateUp = () => {
    const parent = currentPath.split("/").slice(0, -1).join("/") || "/";
    if (parent.length >= (workspacePath || "").length) {
      loadDir(parent);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!workspacePath) {
    return (
      <div className="h-full bg-surface-1 flex flex-col">
        <div className="p-4 border-b border-surface-3">
          <h3 className="font-semibold text-sm text-sand-900">Workspace</h3>
          <p className="text-xs text-sand-400 mt-1">
            Select a local folder to work with
          </p>
        </div>
        <div className="p-4 space-y-3 flex-1 flex flex-col items-center justify-center">
          <p className="text-sand-500 text-sm text-center">
            Grant Lume access to a project folder
          </p>
          <button
            onClick={pickFolder}
            className="px-5 py-2.5 bg-lume-600 hover:bg-lume-700 text-white font-medium rounded-xl text-sm transition-colors"
          >
            Choose Folder...
          </button>
          <p className="text-sand-400 text-xs text-center max-w-[200px]">
            Lume reads files in this folder to give context-aware answers
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-surface-1 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-surface-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-sand-900">Workspace</h3>
          <div className="flex gap-1">
            <button
              onClick={pickFolder}
              className="text-xs text-lume-600 hover:text-lume-700"
              title="Change folder"
            >
              Change
            </button>
            <span className="text-sand-300">|</span>
            <button
              onClick={() => {
                localStorage.removeItem("lume_workspace");
                setWorkspacePath("");
                setEntries([]);
              }}
              className="text-xs text-sand-400 hover:text-red-500"
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-1">
          {currentPath !== workspacePath && (
            <button
              onClick={navigateUp}
              className="text-xs text-lume-600 hover:text-lume-700 font-mono"
            >
              ..
            </button>
          )}
          <p className="text-[10px] text-sand-400 truncate font-mono">
            {currentPath}
          </p>
        </div>
      </div>

      {/* File list / File view */}
      <div className="flex-1 overflow-y-auto">
        {selectedFile ? (
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-sand-700 truncate font-mono">
                {selectedFile.split("/").pop()}
              </span>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setFileContent("");
                }}
                className="text-xs text-lume-600 hover:text-lume-700"
              >
                Back
              </button>
            </div>
            <pre className="text-[11px] text-sand-700 whitespace-pre-wrap font-mono bg-white rounded-lg p-3 border border-surface-3 max-h-[60vh] overflow-y-auto">
              {fileContent.slice(0, 10000)}
              {fileContent.length > 10000 && "\n\n... (truncated)"}
            </pre>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {entries.map((entry) => (
              <button
                key={entry.path}
                onClick={() =>
                  entry.is_dir ? loadDir(entry.path) : openFile(entry.path)
                }
                className="w-full text-left px-3 py-1.5 rounded-lg text-sm hover:bg-white hover:shadow-sm flex items-center gap-2 transition-colors"
              >
                <span className="text-sand-400 text-xs font-mono shrink-0">
                  {entry.is_dir ? "dir" : "   "}
                </span>
                <span className="truncate text-sand-700">{entry.name}</span>
                {!entry.is_dir && (
                  <span className="text-[10px] text-sand-400 ml-auto shrink-0">
                    {formatSize(entry.size)}
                  </span>
                )}
              </button>
            ))}
            {entries.length === 0 && (
              <p className="text-xs text-sand-400 text-center py-4">
                Empty directory
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
