"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { displayLabel, groupLabel, useT } from "@/lib/i18n";
import type { ListData, TaskWithRelations, StatusModel, CustomFieldWithOptions } from "@/lib/queries";
import { useUpdateTask, useCreateTask, useBulk, useLogTime } from "@/lib/hooks";
import { byUserTitle, displayLoggedTotal } from "@/lib/time";
import { useWorkspace } from "@/components/workspace-context";
import { groupTasks, type TaskGroup } from "@/lib/grouping";
import type { GroupBy } from "@/lib/view-state";
import { StatusControl } from "@/components/menus/status-control";
import { PriorityControl } from "@/components/menus/priority-control";
import { AssigneeControl } from "@/components/menus/assignee-control";
import { DateControl } from "@/components/menus/date-control";
import { EstimateControl } from "@/components/menus/estimate-control";
import { LoggedTimeControl } from "@/components/menus/logged-time-control";
import { CustomFieldCell } from "@/components/views/custom-field-cell";
import { AddFieldDialog } from "@/components/views/add-field-dialog";
import { BulkBar } from "@/components/views/bulk-bar";

const PAGE_SIZE = 50;

export function TableView({
  data,
  onOpenTask,
  groupBy = "status",
}: {
  data: ListData;
  onOpenTask: (id: string) => void;
  groupBy?: GroupBy;
}) {
  const { list, tasks } = data;
  const statuses = list.statuses;
  const customFields = list.customFields;
  const { workspace } = useWorkspace();
  const members = useMemo(() => workspace.members.map((m) => m.user), [workspace.members]);
  const update = useUpdateTask(list.id);
  const bulk = useBulk(list.id);
  const t = useT();
  const [addingField, setAddingField] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldWithOptions | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const clearSelect = () => setSelected(new Set());

  const groups = useMemo(
    () => groupTasks(tasks, groupBy, { statuses, members }),
    [tasks, groupBy, statuses, members],
  );

  // grid template: name | status | assignee | priority | estimate | logged | start | due | custom fields...
  const cols = `minmax(260px,2fr) 150px 130px 100px 90px 80px 120px 120px ${customFields.map(() => "130px").join(" ")} 40px`;

  return (
    <div className="flex-1 overflow-auto">
      <div className="inline-block min-w-full">
        {/* header */}
        <div
          className="sticky top-0 z-10 grid items-center border-b border-cu-border bg-cu-bg text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary"
          style={{ gridTemplateColumns: cols }}
        >
          <Cell className="pl-9 font-semibold">{t("col.name")}</Cell>
          <Cell>{t("col.status")}</Cell>
          <Cell>{t("col.assignee")}</Cell>
          <Cell>{t("col.priority")}</Cell>
          <Cell>{t("col.estimate")}</Cell>
          <Cell>{t("col.logged")}</Cell>
          <Cell>{t("col.startDate")}</Cell>
          <Cell>{t("col.dueDate")}</Cell>
          {customFields.map((f) => (
            <Cell key={f.id}>
              <button
                type="button"
                title={t("field.editField")}
                onClick={() => setEditingField(f)}
                className="truncate rounded px-1 text-left hover:bg-cu-hover hover:text-cu-text"
              >
                {displayLabel(t, f.name)}
              </button>
            </Cell>
          ))}
          <Cell className="justify-center">
            <button
              type="button"
              title={t("list.addColumn")}
              onClick={() => setAddingField(true)}
              className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-text"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </Cell>
        </div>

        {groups.map((group) => (
          <TableGroup
            key={group.id}
            group={group}
            statuses={statuses}
            firstStatusId={statuses[0]?.id}
            tasks={group.tasks}
            customFields={customFields}
            cols={cols}
            listId={list.id}
            selected={selected}
            onToggleSelect={toggleSelect}
            onOpenTask={onOpenTask}
            onUpdate={(taskId, patch) => update.mutate({ taskId, patch })}
          />
        ))}
      </div>

      {addingField && <AddFieldDialog listId={list.id} onClose={() => setAddingField(false)} />}
      {editingField && (
        <AddFieldDialog listId={list.id} field={editingField} onClose={() => setEditingField(null)} />
      )}
      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          statuses={statuses}
          onSetStatus={(statusId) => bulk.mutate({ ids: [...selected], patch: { statusId } })}
          onSetPriority={(priority) => bulk.mutate({ ids: [...selected], patch: { priority } })}
          onSetAssignees={(assigneeIds) => bulk.mutate({ ids: [...selected], patch: { assigneeIds } })}
          onDelete={() => {
            bulk.mutate({ ids: [...selected], delete: true });
            clearSelect();
          }}
          onClear={clearSelect}
        />
      )}
    </div>
  );
}

function TableGroup({
  group,
  statuses,
  firstStatusId,
  tasks,
  customFields,
  cols,
  listId,
  selected,
  onToggleSelect,
  onOpenTask,
  onUpdate,
}: {
  group: TaskGroup;
  statuses: StatusModel[];
  firstStatusId: string | undefined;
  tasks: TaskWithRelations[];
  customFields: CustomFieldWithOptions[];
  cols: string;
  listId: string;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpenTask: (id: string) => void;
  onUpdate: (taskId: string, patch: Record<string, unknown>) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const create = useCreateTask(listId);
  const logTime = useLogTime(listId);
  const t = useT();
  const { currentUser, workspace } = useWorkspace();
  const memberNames = useMemo(
    () => Object.fromEntries(workspace.members.map((m) => [m.user.id, m.user.name])),
    [workspace.members],
  );
  const shown = tasks.slice(0, visible);
  const hidden = tasks.length - shown.length;

  return (
    <div>
      <div className="flex items-center gap-2 bg-cu-sidebar/50 px-3 py-1.5">
        <button onClick={() => setCollapsed((c) => !c)} className="text-cu-text-tertiary hover:text-cu-text">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <span
          className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
          style={{ color: group.color, backgroundColor: `${group.color}1f` }}
        >
          {groupLabel(t, group)}
        </span>
        <span className="text-xs font-medium text-cu-text-tertiary">{tasks.length}</span>
      </div>

      {!collapsed && (
        <>
          {shown.map((task) => {
            const isSelected = selected.has(task.id);
            return (
            <div
              key={task.id}
              className={cn(
                "group/row grid cursor-pointer items-center border-b border-cu-border/60 hover:bg-cu-hover/50",
                isSelected && "bg-cu-purple-light/40",
              )}
              style={{ gridTemplateColumns: cols }}
              onClick={() => onOpenTask(task.id)}
            >
              <Cell className="gap-2 pl-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onToggleSelect(task.id)}
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 cursor-pointer accent-cu-purple",
                    !isSelected && "opacity-0 group-hover/row:opacity-100",
                  )}
                />
                <span onClick={(e) => e.stopPropagation()}>
                  <StatusControl current={task.status} statuses={statuses} onChange={(s) => onUpdate(task.id, { statusId: s })} />
                </span>
                <span className="truncate text-[13px]">{task.name}</span>
              </Cell>
              <Cell onClick={(e) => e.stopPropagation()}>
                <StatusControl current={task.status} statuses={statuses} variant="badge" onChange={(s) => onUpdate(task.id, { statusId: s })} />
              </Cell>
              <Cell onClick={(e) => e.stopPropagation()}>
                <AssigneeControl assignees={task.assignees.map((a) => a.user)} onChange={(ids) => onUpdate(task.id, { assigneeIds: ids })} />
              </Cell>
              <Cell onClick={(e) => e.stopPropagation()}>
                <PriorityControl value={task.priority} onChange={(p) => onUpdate(task.id, { priority: p })} />
              </Cell>
              <Cell className="text-[13px] text-cu-text-secondary" onClick={(e) => e.stopPropagation()}>
                <EstimateControl
                  minutes={task.timeEstimate}
                  onChange={(minutes) => onUpdate(task.id, { timeEstimate: minutes })}
                  compact
                />
              </Cell>
              <Cell className="text-[13px] text-cu-text-secondary" onClick={(e) => e.stopPropagation()}>
                <LoggedTimeControl
                  totalSeconds={displayLoggedTotal(task)}
                  entries={task.timeEntries ?? []}
                  currentUserId={currentUser.id}
                  byUserLabel={byUserTitle(task.loggedByUser, memberNames)}
                  onSet={(durationSeconds, workDate) => logTime.mutate({ taskId: task.id, durationSeconds, workDate })}
                  compact
                />
              </Cell>
              <Cell className="text-[13px] text-cu-text-secondary" onClick={(e) => e.stopPropagation()}>
                <DateControl
                  value={task.startDate}
                  onChange={(d) => onUpdate(task.id, { startDate: d ? d.toISOString() : null })}
                  placeholder=""
                />
              </Cell>
              <Cell className="text-[13px] text-cu-text-secondary" onClick={(e) => e.stopPropagation()}>
                <DateControl
                  value={task.dueDate}
                  done={task.status.type === "DONE"}
                  onChange={(d) => onUpdate(task.id, { dueDate: d ? d.toISOString() : null })}
                  placeholder=""
                />
              </Cell>
              {customFields.map((f) => (
                <Cell key={f.id} onClick={(e) => e.stopPropagation()}>
                  <CustomFieldCell field={f} values={task.customFieldValues} />
                </Cell>
              ))}
              <Cell />
            </div>
            );
          })}
          {hidden > 0 && (
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="flex w-full items-center gap-1.5 border-b border-cu-border/60 px-3 py-1.5 pl-9 text-[13px] font-medium text-cu-purple hover:bg-cu-hover/40"
            >
              {t("list.showMore", { n: Math.min(hidden, PAGE_SIZE), hidden })}
            </button>
          )}
          <button
            onClick={() =>
              create.mutate({
                listId,
                name: t("list.newTask"),
                statusId: group.statusId ?? firstStatusId,
                priority: group.defaults?.priority,
                assigneeIds: group.defaults?.assigneeIds,
              })
            }
            className="flex w-full items-center gap-1.5 border-b border-cu-border/60 px-3 py-1.5 pl-9 text-[13px] text-cu-text-tertiary hover:bg-cu-hover/40"
          >
            <Plus className="h-3.5 w-3.5" /> {t("list.addTask")}
          </button>
        </>
      )}
    </div>
  );
}

function Cell({
  children,
  className,
  onClick,
}: {
  children?: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn("flex h-9 items-center overflow-hidden border-r border-cu-border/60 px-2", className)}
    >
      {children}
    </div>
  );
}
