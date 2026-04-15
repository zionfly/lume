/**
 * ToolExecutor: Manages tool execution with logging, timing, and retry.
 *
 * All tool calls are logged for:
 * 1. Observability (harness stats)
 * 2. Skill evaluation (pattern detection)
 * 3. Audit trail (user can review what happened)
 */

interface ToolLog {
  name: string;
  input: Record<string, unknown>;
  output: string;
  status: "success" | "error";
  duration_ms: number;
}

type ToolHandler = (
  input: Record<string, unknown>
) => Promise<Record<string, unknown>>;

export class ToolExecutor {
  private logs: ToolLog[] = [];
  private tools = new Map<string, ToolHandler>();

  constructor() {
    this.registerBuiltinTools();
  }

  private registerBuiltinTools() {
    // File operations
    this.tools.set("read_file", async (input) => {
      const { path } = input as { path: string };
      const file = Bun.file(path);
      if (!(await file.exists())) {
        throw new Error(`File not found: ${path}`);
      }
      const content = await file.text();
      return { content, size: file.size };
    });

    this.tools.set("write_file", async (input) => {
      const { path, content } = input as { path: string; content: string };
      await Bun.write(path, content);
      return { written: true, path };
    });

    this.tools.set("list_directory", async (input) => {
      const { path } = input as { path: string };
      const glob = new Bun.Glob("*");
      const entries: string[] = [];
      for await (const entry of glob.scan({ cwd: path })) {
        entries.push(entry);
      }
      return { entries };
    });

    // Shell execution (with preview)
    this.tools.set("shell", async (input) => {
      const { command, cwd } = input as { command: string; cwd?: string };
      const proc = Bun.spawn(["sh", "-c", command], {
        cwd: cwd || process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
      });
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;
      return { stdout, stderr, exitCode };
    });

    // Web fetch
    this.tools.set("fetch_url", async (input) => {
      const { url } = input as { url: string };
      const res = await fetch(url);
      const text = await res.text();
      return { status: res.status, body: text.slice(0, 5000) };
    });
  }

  async execute(
    name: string,
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const handler = this.tools.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const start = performance.now();
    try {
      const result = await handler(input);
      const duration = Math.round(performance.now() - start);

      this.logs.push({
        name,
        input,
        output: JSON.stringify(result).slice(0, 1000),
        status: "success",
        duration_ms: duration,
      });

      return result;
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      const errorMsg = err instanceof Error ? err.message : String(err);

      this.logs.push({
        name,
        input,
        output: errorMsg,
        status: "error",
        duration_ms: duration,
      });

      throw err;
    }
  }

  getRecentLogs(limit = 15): ToolLog[] {
    return this.logs.slice(-limit);
  }
}
