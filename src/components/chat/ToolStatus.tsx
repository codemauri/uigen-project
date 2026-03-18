"use client";

import { Loader2, FilePlus, FilePen, Eye, FolderEdit, Trash2, Wrench } from "lucide-react";

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  state: string;
  result?: unknown;
}

interface ToolStatusProps {
  toolInvocation: ToolInvocation;
}

function getToolLabel(toolInvocation: ToolInvocation): { icon: React.ReactNode; label: string } {
  const { toolName, args } = toolInvocation;
  const path = args.path as string | undefined;
  const filename = path?.split("/").pop() ?? path;

  if (toolName === "str_replace_editor") {
    const command = args.command as string | undefined;

    switch (command) {
      case "create":
        return { icon: <FilePlus className="w-3.5 h-3.5" />, label: `Creating ${filename}` };
      case "str_replace":
        return { icon: <FilePen className="w-3.5 h-3.5" />, label: `Editing ${filename}` };
      case "insert":
        return { icon: <FilePen className="w-3.5 h-3.5" />, label: `Editing ${filename}` };
      case "view":
        return { icon: <Eye className="w-3.5 h-3.5" />, label: `Reading ${filename}` };
      default:
        return { icon: <Wrench className="w-3.5 h-3.5" />, label: `Modifying ${filename}` };
    }
  }

  if (toolName === "file_manager") {
    const command = args.command as string | undefined;
    const newPath = args.new_path as string | undefined;

    if (command === "rename") {
      const newName = newPath?.split("/").pop() ?? newPath;
      return { icon: <FolderEdit className="w-3.5 h-3.5" />, label: `Renaming ${filename} → ${newName}` };
    }
    if (command === "delete") {
      return { icon: <Trash2 className="w-3.5 h-3.5" />, label: `Deleting ${filename}` };
    }
  }

  return { icon: <Wrench className="w-3.5 h-3.5" />, label: toolName };
}

export function ToolStatus({ toolInvocation }: ToolStatusProps) {
  const isComplete = toolInvocation.state === "result" && toolInvocation.result != null;
  const { icon, label } = getToolLabel(toolInvocation);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isComplete ? (
        <>
          <span className="text-emerald-600">{icon}</span>
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}
