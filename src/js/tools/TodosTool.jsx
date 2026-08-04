import { getReact, getMaterialUI, toastError } from "../core/platform.ts";
import { useTodosTool } from "./todos/useTodosTool.ts";
import { TodosKanban } from "./todos/TodosKanban.jsx";
import { TaskDetailDialog } from "./todos/TaskDetailDialog.jsx";
import { NewBoardDialog } from "./todos/NewBoardDialog.jsx";
import { PublicScrumBoard } from "./todos/PublicScrumBoard.jsx";
import { BoardsHome, BoardsHomeToolbar } from "./todos/BoardsHome.jsx";
import { BoardSettingsDialog } from "./todos/BoardSettingsDialog.jsx";
import { TodosBoardToolbar } from "./todos/TodosShellParts.jsx";
import { TodosPublicHome } from "./todos/TodosPublicHome.jsx";

const { useState } = getReact();
const { Box, Alert } = getMaterialUI();

export function TodosTool({ bootTodos, onNeedLogin }) {
  if (bootTodos?.publicSlug) {
    return <PublicScrumBoard publicSlug={String(bootTodos.publicSlug)} />;
  }

  const todos = useTodosTool({ bootTodos });
  const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);

  if (!todos.loggedIn) {
    return <TodosPublicHome />;
  }

  const boardTitle = todos.boardData?.board?.title ?? "";

  return (
    <Box className="paty-todos-shell">
      {todos.inBoardView ? (
        <TodosBoardToolbar
          boardTitle={boardTitle}
          boardMeta={todos.boardData?.board}
          loadingBoard={todos.loadingBoard}
          onHome={todos.goHome}
          onNewBoard={() => todos.setNewBoardOpen(true)}
          onRefresh={() => todos.reload()}
          onOpenSettings={() => setBoardSettingsOpen(true)}
        />
      ) : (
        <BoardsHomeToolbar
          loading={todos.loadingBoards}
          onNewBoard={() => todos.setNewBoardOpen(true)}
          onRefresh={() => todos.reloadBoards()}
        />
      )}

      {todos.error ? (
        <Alert severity="error" sx={{ m: 2 }} onClose={() => {}}>{todos.error}</Alert>
      ) : null}

      {todos.inBoardView ? (
        <>
          <TodosKanban
            boardData={todos.boardData}
            readOnly={!todos.canEdit}
            onOpenTask={todos.openTask}
            onQuickAdd={(colId, title) => {
              todos.onQuickAddTask(colId, title).catch((e) => {
                toastError(e instanceof Error ? e.message : String(e));
              });
            }}
            onDragStart={todos.onDragStart}
            onDropColumn={todos.onDropColumn}
          />
        </>
      ) : (
        <BoardsHome
          boards={todos.boards}
          boardPreviews={todos.boardPreviews}
          loadingPreviews={todos.loadingPreviews}
          loading={todos.loadingBoards}
          onOpenBoard={todos.selectBoard}
          onOpenTask={todos.openTaskFromPreview}
          onPreviewDragStart={todos.onPreviewDragStart}
          onPreviewDropColumn={todos.onPreviewDropColumn}
          onNewBoard={() => todos.setNewBoardOpen(true)}
          onDeleteBoard={async (id) => {
            try { await todos.onDeleteBoard(id); }
            catch (e) { toastError(e instanceof Error ? e.message : String(e)); }
          }}
        />
      )}

      <BoardSettingsDialog
        open={boardSettingsOpen}
        onClose={() => setBoardSettingsOpen(false)}
        boardId={todos.boardId}
        board={todos.boardData?.board}
        readOnly={!todos.canEdit}
        saving={todos.loadingBoard}
        onSave={async (patch) => {
          if (!todos.boardId) return;
          try { await todos.onUpdateBoard(todos.boardId, patch); }
          catch (e) { toastError(e instanceof Error ? e.message : String(e)); }
        }}
        onMembersChange={todos.syncBoardMembers}
      />

      <NewBoardDialog
        open={todos.newBoardOpen}
        onClose={() => todos.setNewBoardOpen(false)}
        busy={false}
        onCreate={async (payload) => {
          try { await todos.onCreateBoard(payload); }
          catch (e) { toastError(e instanceof Error ? e.message : String(e)); }
        }}
      />

      <TaskDetailDialog
        open={!!todos.selectedTask || todos.taskLoading}
        task={todos.selectedTask}
        loading={todos.taskLoading}
        readOnly={!todos.canEdit}
        onClose={todos.closeTask}
        onSave={async (patch) => {
          try { await todos.saveTask(patch); }
          catch (e) { toastError(e instanceof Error ? e.message : String(e)); }
        }}
        onSaveSubtask={async (id, patch) => {
          try { await todos.saveSubtask(id, patch); }
          catch (e) { toastError(e instanceof Error ? e.message : String(e)); }
        }}
        onDeleteSubtask={async (id) => {
          try { await todos.deleteSubtask(id); }
          catch (e) { toastError(e instanceof Error ? e.message : String(e)); }
        }}
        onAddSubtask={async (title) => {
          try { await todos.addSubtask(title); }
          catch (e) { toastError(e instanceof Error ? e.message : String(e)); }
        }}
        onSaveMilestone={async (id, patch) => {
          try { await todos.saveMilestone(id, patch); }
          catch (e) { toastError(e instanceof Error ? e.message : String(e)); }
        }}
        onDeleteMilestone={async (id) => {
          try { await todos.deleteMilestone(id); }
          catch (e) { toastError(e instanceof Error ? e.message : String(e)); }
        }}
        onAddMilestone={async (title, dueDate) => {
          try { await todos.addMilestone(title, dueDate); }
          catch (e) { toastError(e instanceof Error ? e.message : String(e)); }
        }}
        onToggleMilestone={async (id, completed) => {
          try { await todos.toggleMilestone(id, completed); }
          catch (e) { toastError(e instanceof Error ? e.message : String(e)); }
        }}
        onComment={async (body) => {
          try { await todos.postComment(body); }
          catch (e) { toastError(e instanceof Error ? e.message : String(e)); }
        }}
      />
    </Box>
  );
}
