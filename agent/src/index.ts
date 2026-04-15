/**
 * Lume Agent Sidecar
 *
 * Runs as a separate Bun process spawned by the Tauri shell.
 * Handles LLM inference, tool execution, skill evaluation, and memory updates.
 *
 * Communication: stdio JSON-RPC with the Tauri host.
 */

import { AgentRouter } from "./router";
import { SkillEvaluator } from "./skill-evaluator";
import { ToolExecutor } from "./tools";

const router = new AgentRouter();
const evaluator = new SkillEvaluator();
const tools = new ToolExecutor();

interface RPCRequest {
  id: string;
  method: string;
  params: Record<string, unknown>;
}

interface RPCResponse {
  id: string;
  result?: unknown;
  error?: string;
}

async function handleRequest(req: RPCRequest): Promise<RPCResponse> {
  try {
    switch (req.method) {
      case "chat": {
        const { sessionId, messages, systemContext, skillsSummary } =
          req.params as {
            sessionId: string;
            messages: Array<{ role: string; content: string }>;
            systemContext: string;
            skillsSummary: string[];
          };

        const response = await router.chat({
          sessionId,
          messages,
          systemContext,
          skillsSummary,
        });

        // Check if skill evaluation should trigger
        if (evaluator.shouldEvaluate()) {
          const skillResult = await evaluator.evaluate(
            sessionId,
            messages,
            tools.getRecentLogs()
          );
          if (skillResult) {
            response.skillUpdate = skillResult;
          }
        }

        return { id: req.id, result: response };
      }

      case "execute_tool": {
        const { name, input } = req.params as {
          name: string;
          input: Record<string, unknown>;
        };
        const result = await tools.execute(name, input);
        return { id: req.id, result };
      }

      case "health":
        return { id: req.id, result: { status: "ok", uptime: process.uptime() } };

      default:
        return { id: req.id, error: `Unknown method: ${req.method}` };
    }
  } catch (err) {
    return {
      id: req.id,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// stdio JSON-RPC loop
const decoder = new TextDecoder();
const encoder = new TextEncoder();

process.stderr.write("Lume Agent sidecar started\n");

for await (const chunk of Bun.stdin.stream()) {
  const lines = decoder.decode(chunk).split("\n").filter(Boolean);
  for (const line of lines) {
    try {
      const req: RPCRequest = JSON.parse(line);
      const res = await handleRequest(req);
      process.stdout.write(encoder.encode(JSON.stringify(res) + "\n"));
    } catch {
      // Skip malformed input
    }
  }
}
