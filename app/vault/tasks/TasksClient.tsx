"use client";

import { useState } from "react";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import { useTasks }     from "../../../hooks/vault/useTasks";
import type { VaultTask, TaskPriority, TaskCategory, TaskStatus } from "../../../hooks/vault/useTasks";

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low:    "bg-zinc-800 text-zinc-400 border-zinc-700",
  medium: "bg-blue-950 text-blue-400 border-blue-800",
  high:   "bg-amber-950 text-amber-400 border-amber-800",
  urgent: "bg-red-950 text-red-400 border-red-800",
};

const CAT_COLORS: Record<TaskCategory, string> = {
  content:    "text-purple-400",
  tech:       "text-cyan-400",
  business:   "text-green-400",
  legal:      "text-red-400",
  marketing:  "text-blue-400",
  operations: "text-zinc-400",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low", medium: "Medium", high: "High", urgent: "URGENT",
};

function TaskCard({
  task, onComplete, onReopen, onDelete, onMove,
}: {
  task:       VaultTask;
  onComplete: (id: string) => void;
  onReopen:   (id: string) => void;
  onDelete:   (id: string) => void;
  onMove:     (id: string, status: TaskStatus) => void;
}) {
  const today    = new Date().toISOString().slice(0, 10);
  const isOverdue = task.dueDate && task.dueDate < today && task.status !== "done";

  return (
    <div className={`bg-zinc-900 border rounded-xl p-3 space-y-2 ${
      isOverdue ? "border-red-900" : "border-zinc-800"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-semibold leading-snug ${
          task.status === "done" ? "text-zinc-600 line-through" : "text-white"
        }`}>
          {task.title}
        </p>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap ${PRIORITY_COLORS[task.priority]}`}>
          {PRIORITY_LABELS[task.priority]}
        </span>
      </div>

      {task.notes && (
        <p className="text-xs text-zinc-500 leading-relaxed">{task.notes}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-medium ${CAT_COLORS[task.category]}`}>
          {task.category}
        </span>
        {task.dueDate && (
          <span className={`text-xs ${isOverdue ? "text-red-400 font-semibold" : "text-zinc-600"}`}>
            {isOverdue ? "Overdue · " : ""}{task.dueDate}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        {task.status !== "done" ? (
          <>
            <button
              onClick={() => onComplete(task.id)}
              className="text-xs bg-green-900/40 text-green-400 border border-green-800 hover:bg-green-900/70 px-2 py-1 rounded-lg transition-colors"
            >
              Done
            </button>
            {task.status === "todo" && (
              <button
                onClick={() => onMove(task.id, "in_progress")}
                className="text-xs bg-blue-900/40 text-blue-400 border border-blue-800 hover:bg-blue-900/70 px-2 py-1 rounded-lg transition-colors"
              >
                Start
              </button>
            )}
            {task.status === "in_progress" && (
              <button
                onClick={() => onMove(task.id, "todo")}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-lg transition-colors"
              >
                Pause
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => onReopen(task.id)}
            className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-lg transition-colors"
          >
            Reopen
          </button>
        )}
        <button
          onClick={() => onDelete(task.id)}
          className="text-xs text-zinc-700 hover:text-red-400 ml-auto transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function Column({
  title, count, color, children,
}: {
  title: string; count: number; color: string; children: React.ReactNode;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-sm font-bold text-zinc-300">{title}</p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export default function TasksClient() {
  const { user }  = useVaultAuth();
  const uid       = user?.uid ?? null;
  const tasks     = useTasks(uid);

  const [showForm,   setShowForm]   = useState(false);
  const [title,      setTitle]      = useState("");
  const [notes,      setNotes]      = useState("");
  const [priority,   setPriority]   = useState<TaskPriority>("medium");
  const [category,   setCategory]   = useState<TaskCategory>("content");
  const [dueDate,    setDueDate]    = useState("");
  const [saving,     setSaving]     = useState(false);
  const [filterCat,  setFilterCat]  = useState<TaskCategory | "all">("all");

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    await tasks.add({
      title: title.trim(),
      notes: notes.trim() || undefined,
      priority,
      category,
      status:  "todo",
      dueDate: dueDate || undefined,
    });
    setTitle(""); setNotes(""); setDueDate(""); setPriority("medium"); setSaving(false); setShowForm(false);
  }

  function filtered(list: VaultTask[]) {
    return filterCat === "all" ? list : list.filter(t => t.category === filterCat);
  }

  const todoList  = filtered(tasks.todo);
  const inProg    = filtered(tasks.in_progress);
  const doneList  = filtered(tasks.done).slice(0, 10);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Tasks</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {tasks.overdue.length > 0
              ? <span className="text-red-400">{tasks.overdue.length} overdue · </span>
              : null}
            {tasks.todo.length} to-do · {tasks.in_progress.length} in progress · {tasks.done.length} done
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-500 hover:bg-green-400 text-black font-bold px-4 py-2 rounded-xl text-sm transition-colors whitespace-nowrap"
        >
          + New Task
        </button>
      </div>

      {/* New task form */}
      {showForm && (
        <div className="mb-6 bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-zinc-200">New Task</p>
          <input
            type="text"
            placeholder="Task title…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
          />
          <textarea
            placeholder="Notes (optional)…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500 resize-none"
          />
          <div className="grid grid-cols-3 gap-3">
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as TaskPriority)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as TaskCategory)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            >
              <option value="content">Content</option>
              <option value="tech">Tech</option>
              <option value="business">Business</option>
              <option value="legal">Legal</option>
              <option value="marketing">Marketing</option>
              <option value="operations">Operations</option>
            </select>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={submit}
              disabled={saving || !title.trim()}
              className="bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 text-black font-bold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              {saving ? "Saving…" : "Add Task"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-zinc-500 hover:text-zinc-300 text-sm px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(["all", "content", "tech", "business", "legal", "marketing", "operations"] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${
              filterCat === cat
                ? "bg-zinc-700 text-white border-zinc-600"
                : "text-zinc-500 border-zinc-800 hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Kanban */}
      {tasks.tasks.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-semibold">No tasks yet</p>
          <p className="text-sm mt-1">Click &quot;+ New Task&quot; to create your first task</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          <Column title="To-Do" count={todoList.length} color="bg-zinc-800 text-zinc-400">
            {todoList.length === 0
              ? <p className="text-zinc-700 text-xs text-center py-4">No tasks</p>
              : todoList.map(t => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onComplete={tasks.complete}
                  onReopen={tasks.reopen}
                  onDelete={tasks.remove}
                  onMove={(id, st) => tasks.update(id, { status: st })}
                />
              ))
            }
          </Column>

          <Column title="In Progress" count={inProg.length} color="bg-blue-900/50 text-blue-400">
            {inProg.length === 0
              ? <p className="text-zinc-700 text-xs text-center py-4">Nothing in progress</p>
              : inProg.map(t => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onComplete={tasks.complete}
                  onReopen={tasks.reopen}
                  onDelete={tasks.remove}
                  onMove={(id, st) => tasks.update(id, { status: st })}
                />
              ))
            }
          </Column>

          <Column title="Done" count={tasks.done.length} color="bg-green-900/50 text-green-400">
            {doneList.length === 0
              ? <p className="text-zinc-700 text-xs text-center py-4">Nothing done yet</p>
              : doneList.map(t => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onComplete={tasks.complete}
                  onReopen={tasks.reopen}
                  onDelete={tasks.remove}
                  onMove={(id, st) => tasks.update(id, { status: st })}
                />
              ))
            }
            {tasks.done.length > 10 && (
              <p className="text-zinc-700 text-xs text-center py-2">
                +{tasks.done.length - 10} more completed tasks
              </p>
            )}
          </Column>
        </div>
      )}
    </div>
  );
}
