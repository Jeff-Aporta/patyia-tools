import { getMaterialUI } from "../../core/platform.ts";
import { assigneeTheme } from "./todosKanbanShared.js";

const { Typography } = getMaterialUI();

export function TaskAssigneeLabel({ assignedTo }) {
  const theme = assigneeTheme(assignedTo);
  const empty = !String(assignedTo ?? "").trim();

  return (
    <Typography
      className={`paty-todos-card__assignee${empty ? " paty-todos-card__assignee--empty" : ""}`}
      component="div"
      variant="caption"
      style={{
        "--assignee-fg": theme.fg,
        "--assignee-bg": theme.bg,
      }}
    >
      {theme.label}
    </Typography>
  );
}
