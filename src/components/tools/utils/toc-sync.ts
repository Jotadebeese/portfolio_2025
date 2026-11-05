import { AVAILABLE_TOOLS, ToolId } from "../types";

export type WorkbenchToolInfo = {
  id: ToolId;
  name: string;
};

let latestTools: ToolId[] | null = null;
const listeners = new Set<(tools: WorkbenchToolInfo[]) => void>();

export function getToolName(id: ToolId): string {
  const tool = AVAILABLE_TOOLS.find((t) => t.id === id);
  return tool ? tool.name : id;
}

export function notifyWorkbenchTools(toolIds: ToolId[]) {
  latestTools = toolIds;
  const toolInfos: WorkbenchToolInfo[] = toolIds.map((id) => ({
    id,
    name: getToolName(id),
  }));

  listeners.forEach((listener) => {
    try {
      listener(toolInfos);
    } catch (err) {
      console.error("Error in workbench TOC listener:", err);
    }
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("workbench:tools-changed", {
        detail: { toolIds, tools: toolInfos },
      }),
    );
  }
}

export function subscribeWorkbenchTools(
  listener: (tools: WorkbenchToolInfo[]) => void,
): () => void {
  listeners.add(listener);

  if (latestTools !== null) {
    const toolInfos: WorkbenchToolInfo[] = latestTools.map((id) => ({
      id,
      name: getToolName(id),
    }));
    listener(toolInfos);
  }

  return () => {
    listeners.delete(listener);
  };
}
