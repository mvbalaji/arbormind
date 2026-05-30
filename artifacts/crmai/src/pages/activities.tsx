import React, { useState } from "react";
import { useLocation } from "wouter";
import { useColResize } from "@/hooks/use-col-resize";
import { ColResizeHandle } from "@/components/col-resize-handle";
import {
  useListActivities, useCreateActivity, useUpdateActivity, useDeleteActivity,
  getListActivitiesQueryKey,
  CreateActivityInputType, CreateActivityInputStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { AISummary } from "@/components/ai-summary";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Phone, Mail, Calendar, CheckSquare, FileText, Plus, MoreHorizontal, Pencil, Trash2, List } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { ColumnsMenu } from "@/components/columns-menu";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/table-pagination";

const ACTIVITY_TOGGLEABLE_COLS = [
  { key: "icon" as const, label: "Icon" },
  { key: "subject" as const, label: "Subject" },
  { key: "related" as const, label: "Related To" },
  { key: "date" as const, label: "Date" },
  { key: "status" as const, label: "Status" },
];

const TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone, email: Mail, meeting: Calendar, task: CheckSquare, note: FileText,
};

const TYPE_COLORS: Record<string, string> = {
  call: "text-blue-600 bg-blue-500/10",
  email: "text-purple-600 bg-purple-500/10",
  meeting: "text-orange-600 bg-orange-500/10",
  task: "text-green-600 bg-green-500/10",
  note: "text-gray-400 bg-gray-500/10",
};

interface ActivityFormData {
  type: string;
  subject: string;
  dueDate: string;
  status: string;
  description: string;
}

const defaultFormData: ActivityFormData = {
  type: "call", subject: "", dueDate: "", status: "planned", description: "",
};

function WeekCalendar({ activities }: { activities: Array<{ id: number; type: string; subject: string; dueDate: string | null; status: string; contactName?: string | null }> }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekStart((d) => addDays(d, -7))}
          className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:border-primary/20 transition-colors"
        >
          ← Prev
        </button>
        <span className="text-sm font-medium text-foreground">
          {format(days[0], "MMM d")} – {format(days[6], "MMM d, yyyy")}
        </span>
        <button
          onClick={() => setWeekStart((d) => addDays(d, 7))}
          className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:border-primary/20 transition-colors"
        >
          Next →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayActivities = activities.filter(
            (a) => a.dueDate && isSameDay(parseISO(a.dueDate), day)
          );
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()} className="min-h-32">
              <div className={`text-center py-2 rounded-t-lg mb-1 ${isToday ? "bg-primary/20 text-primary font-semibold" : "text-muted-foreground"}`}>
                <div className="text-xs uppercase tracking-wide">{format(day, "EEE")}</div>
                <div className={`text-lg font-bold leading-none mt-0.5 ${isToday ? "text-primary" : "text-foreground"}`}>{format(day, "d")}</div>
              </div>
              <div className="flex flex-col gap-1">
                {dayActivities.map((act) => {
                  const Icon = TYPE_ICONS[act.type] ?? CheckSquare;
                  return (
                    <div
                      key={act.id}
                      className={`px-2 py-1.5 rounded-md text-xs truncate cursor-default ${TYPE_COLORS[act.type] ?? "text-gray-400 bg-gray-500/10"} ${act.status === "completed" ? "opacity-50 line-through" : ""}`}
                      title={act.subject}
                    >
                      <Icon className="w-3 h-3 inline mr-1 opacity-70" />
                      {act.subject}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ACTIVITIES_COL_KEYS = ["icon","subject","related","date","status","actions"] as const;
const ACTIVITIES_COL_DEFAULTS: Record<typeof ACTIVITIES_COL_KEYS[number], number> = {"icon":48,"subject":280,"related":200,"date":130,"status":120,"actions":120};

export default function Activities() {
  const [, navigate] = useLocation();
  const { widths: colWidths, startResize: startColResize } = useColResize("col-widths:activities:v1", ACTIVITIES_COL_KEYS, ACTIVITIES_COL_DEFAULTS);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<{ id: number } & ActivityFormData | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const colVis = useColumnVisibility<"icon" | "subject" | "related" | "date" | "status">("col-visibility:activities:v1", ACTIVITY_TOGGLEABLE_COLS);
  const activityColSpan = colVis.visible.size + 1;
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const { data, isLoading } = useListActivities({ limit: 200 });
  const allActivities = data?.data ?? [];
  const activitiesPagination = usePagination("activities", allActivities);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Activities</h1>
            <p className="text-muted-foreground mt-1 text-sm">Calls, emails, meetings, and tasks.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1 text-sm flex items-center gap-1.5 transition-colors ${viewMode === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="w-4 h-4" /> List
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-3 py-1 text-sm flex items-center gap-1.5 transition-colors border-l border-border ${viewMode === "calendar" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Calendar className="w-4 h-4" /> Calendar
              </button>
            </div>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-primary text-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4 mr-2" /> Log Activity
            </Button>
          </div>
        </div>

        <AISummary entityType="activities" />

        {viewMode === "calendar" && !isLoading && (
          <Card className="glass-panel border-border p-6">
            <WeekCalendar activities={(data?.data ?? []).map((a) => ({
              id: a.id,
              type: a.type,
              subject: a.subject,
              dueDate: a.dueDate ?? null,
              status: a.status,
              contactName: (a as { contactName?: string | null }).contactName ?? null,
            }))} />
          </Card>
        )}

        {viewMode === "list" && (
        <Card className="glass-panel border-0 overflow-hidden">
          <div className="px-3 py-1 border-b border-border bg-muted/20 flex items-center justify-end">
            <TablePagination
              variant="inline"
              page={activitiesPagination.page}
              totalPages={activitiesPagination.totalPages}
              pageSize={activitiesPagination.pageSize}
              total={activitiesPagination.total}
              pageStart={activitiesPagination.pageStart}
              pageEnd={activitiesPagination.pageEnd}
              onPageChange={activitiesPagination.setPage}
              onPageSizeChange={activitiesPagination.setPageSize}
            />
            <ColumnsMenu columns={ACTIVITY_TOGGLEABLE_COLS} isVisible={colVis.isVisible} toggle={colVis.toggle} showAll={colVis.showAll} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left [&_tbody_td]:whitespace-nowrap">
              <colgroup>
                {colVis.isVisible("icon") && <col data-col="icon" style={{ width: `${colWidths.icon}px` }} />}
                {colVis.isVisible("subject") && <col data-col="subject" style={{ width: `${colWidths.subject}px` }} />}
                {colVis.isVisible("related") && <col data-col="related" style={{ width: `${colWidths.related}px` }} />}
                {colVis.isVisible("date") && <col data-col="date" style={{ width: `${colWidths.date}px` }} />}
                {colVis.isVisible("status") && <col data-col="status" style={{ width: `${colWidths.status}px` }} />}
                <col data-col="actions" style={{ width: `${colWidths.actions}px` }} />
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-b border-blue-800 divide-x divide-blue-500/40">
                  {colVis.isVisible("icon") && <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap w-12"><ColResizeHandle onMouseDown={startColResize("icon")} /></th>}
                  {colVis.isVisible("subject") && <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Subject<ColResizeHandle onMouseDown={startColResize("subject")} /></th>}
                  {colVis.isVisible("related") && <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Related To<ColResizeHandle onMouseDown={startColResize("related")} /></th>}
                  {colVis.isVisible("date") && <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Date<ColResizeHandle onMouseDown={startColResize("date")} /></th>}
                  {colVis.isVisible("status") && <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Status<ColResizeHandle onMouseDown={startColResize("status")} /></th>}
                  <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap text-right">Actions<ColResizeHandle onMouseDown={startColResize("actions")} /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={activityColSpan} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data?.data?.length === 0 ? (
                  <tr><td colSpan={activityColSpan} className="px-6 py-8 text-center text-muted-foreground">No activities found.</td></tr>
                ) : (
                  activitiesPagination.paged.map((act) => {
                    const Icon = TYPE_ICONS[act.type] ?? FileText;
                    return (
                      <tr key={act.id} className="hover:bg-muted/50 transition-colors group">
                        {colVis.isVisible("icon") && (
                          <td className="px-3 py-1">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${TYPE_COLORS[act.type] ?? "text-gray-400 bg-gray-500/10"}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                          </td>
                        )}
                        {colVis.isVisible("subject") && (
                          <td className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap text-foreground">{act.subject}</td>
                        )}
                        {colVis.isVisible("related") && (
                          <td className="px-3 py-1 text-muted-foreground">
                            {act.contactId && act.contactName ? (
                              <span className="text-primary cursor-pointer hover:underline" onClick={() => navigate(`/contacts/${act.contactId}`)}>{act.contactName}</span>
                            ) : act.accountId && act.accountName ? (
                              <span className="text-primary cursor-pointer hover:underline" onClick={() => navigate(`/accounts/${act.accountId}`)}>{act.accountName}</span>
                            ) : (act.contactName ?? act.accountName ?? "-")}
                          </td>
                        )}
                        {colVis.isVisible("date") && (
                          <td className="px-3 py-1 text-muted-foreground">
                            {act.dueDate ? format(new Date(act.dueDate), "MMM d, yyyy") : "-"}
                          </td>
                        )}
                        {colVis.isVisible("status") && (
                          <td className="px-3 py-1">
                            <Badge
                              variant="outline"
                              className={act.status === "completed"
                                ? "border-green-500/30 text-green-600 bg-green-500/10"
                                : "border-border text-muted-foreground"}
                            >
                              {act.status}
                            </Badge>
                          </td>
                        )}
                        <td className="px-3 py-1 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border text-foreground">
                              <DropdownMenuItem
                                onClick={() => setEditingActivity({
                                  id: act.id,
                                  type: act.type,
                                  subject: act.subject,
                                  dueDate: act.dueDate ? act.dueDate.slice(0, 16) : "",
                                  status: act.status,
                                  description: act.description ?? "",
                                })}
                                className="cursor-pointer hover:bg-muted"
                              >
                                <Pencil className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-muted" />
                              <DropdownMenuItem
                                onClick={() => setDeletingId(act.id)}
                                className="cursor-pointer text-destructive hover:bg-destructive/10 focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
        )}
      </div>

      <ActivityFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} mode="create" />
      <ActivityFormDialog
        open={!!editingActivity}
        onOpenChange={(o) => { if (!o) setEditingActivity(null); }}
        mode="edit"
        initialData={editingActivity ?? undefined}
      />
      <AlertDialog open={deletingId !== null} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
            <DeleteActivityAction id={deletingId} onDone={() => setDeletingId(null)} />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

function DeleteActivityAction({ id, onDone }: { id: number | null; onDone: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteActivity();
  return (
    <AlertDialogAction
      onClick={() => {
        if (id === null) return;
        deleteMutation.mutate({ id }, {
          onSuccess: () => {
            toast({ title: "Activity deleted" });
            queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
            onDone();
          },
          onError: () => toast({ title: "Error", description: "Failed to delete.", variant: "destructive" }),
        });
      }}
      className="bg-destructive hover:bg-destructive/90 text-foreground"
    >
      Delete
    </AlertDialogAction>
  );
}

function ActivityFormDialog({
  open, onOpenChange, mode, initialData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: { id: number } & ActivityFormData;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateActivity();
  const updateMutation = useUpdateActivity();
  const [formData, setFormData] = useState<ActivityFormData>(initialData ?? defaultFormData);

  React.useEffect(() => {
    if (open) setFormData(initialData ?? defaultFormData);
  }, [open, initialData]);

  const f = (field: keyof ActivityFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFormData({ ...formData, [field]: e.target.value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      type: formData.type as CreateActivityInputType,
      subject: formData.subject,
      status: formData.status as CreateActivityInputStatus,
      description: formData.description || undefined,
      dueDate: formData.dueDate || undefined,
    };
    const invalidate = () => queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
    if (mode === "create") {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: "Activity logged" }); invalidate(); onOpenChange(false); },
        onError: () => toast({ title: "Error", description: "Failed to create.", variant: "destructive" }),
      });
    } else if (initialData) {
      updateMutation.mutate({ id: initialData.id, data: payload }, {
        onSuccess: () => { toast({ title: "Activity updated" }); invalidate(); onOpenChange(false); },
        onError: () => toast({ title: "Error", description: "Failed to update.", variant: "destructive" }),
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {mode === "create" ? "Log Activity" : "Edit Activity"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <select className="w-full bg-muted border border-border rounded-md px-3 py-1 text-foreground text-sm" value={formData.type} onChange={f("type")}>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="task">Task</option>
                <option value="note">Note</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="w-full bg-muted border border-border rounded-md px-3 py-1 text-foreground text-sm" value={formData.status} onChange={f("status")}>
                <option value="planned">Planned</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input required className="bg-muted border-border" value={formData.subject} onChange={f("subject")} />
          </div>
          <div className="space-y-2">
            <Label>Due Date / Time</Label>
            <Input type="datetime-local" className="bg-muted border-border text-foreground" value={formData.dueDate} onChange={f("dueDate")} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              className="w-full bg-muted border border-border rounded-md px-3 py-1 text-foreground text-sm resize-none"
              rows={3}
              value={formData.description}
              onChange={f("description")}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-foreground">
              {isPending ? "Saving..." : mode === "create" ? "Log Activity" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
