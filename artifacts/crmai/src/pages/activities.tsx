import React, { useState } from "react";
import {
  useListActivities, useCreateActivity, useUpdateActivity, useDeleteActivity,
  getListActivitiesQueryKey,
  CreateActivityInputType, CreateActivityInputStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
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
import { Phone, Mail, Calendar, CheckSquare, FileText, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone, email: Mail, meeting: Calendar, task: CheckSquare, note: FileText,
};

const TYPE_COLORS: Record<string, string> = {
  call: "text-blue-400 bg-blue-500/10",
  email: "text-purple-400 bg-purple-500/10",
  meeting: "text-orange-400 bg-orange-500/10",
  task: "text-green-400 bg-green-500/10",
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

export default function Activities() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<{ id: number } & ActivityFormData | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { data, isLoading } = useListActivities({ limit: 50 });

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Activities</h1>
            <p className="text-muted-foreground mt-1 text-sm">Calls, emails, meetings, and tasks.</p>
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-2" /> Log Activity
          </Button>
        </div>

        <Card className="glass-panel border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-medium w-12"></th>
                  <th className="px-6 py-4 font-medium">Subject</th>
                  <th className="px-6 py-4 font-medium">Related To</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data?.data?.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No activities found.</td></tr>
                ) : (
                  data?.data?.map((act) => {
                    const Icon = TYPE_ICONS[act.type] ?? FileText;
                    return (
                      <tr key={act.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${TYPE_COLORS[act.type] ?? "text-gray-400 bg-gray-500/10"}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-white">{act.subject}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {act.contactName ?? act.accountName ?? "-"}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {act.dueDate ? format(new Date(act.dueDate), "MMM d, yyyy") : "-"}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant="outline"
                            className={act.status === "completed"
                              ? "border-green-500/30 text-green-400 bg-green-500/10"
                              : "border-white/10 text-muted-foreground"}
                          >
                            {act.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-white/10 text-white">
                              <DropdownMenuItem
                                onClick={() => setEditingActivity({
                                  id: act.id,
                                  type: act.type,
                                  subject: act.subject,
                                  dueDate: act.dueDate ? act.dueDate.slice(0, 16) : "",
                                  status: act.status,
                                  description: act.description ?? "",
                                })}
                                className="cursor-pointer hover:bg-white/10"
                              >
                                <Pencil className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/10" />
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
      </div>

      <ActivityFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} mode="create" />
      <ActivityFormDialog
        open={!!editingActivity}
        onOpenChange={(o) => { if (!o) setEditingActivity(null); }}
        mode="edit"
        initialData={editingActivity ?? undefined}
      />
      <AlertDialog open={deletingId !== null} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent className="bg-card border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
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
      className="bg-destructive hover:bg-destructive/90 text-white"
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
      <DialogContent className="bg-card border-white/10 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {mode === "create" ? "Log Activity" : "Edit Activity"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <select className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-white text-sm" value={formData.type} onChange={f("type")}>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="task">Task</option>
                <option value="note">Note</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-white text-sm" value={formData.status} onChange={f("status")}>
                <option value="planned">Planned</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input required className="bg-black/20 border-white/10" value={formData.subject} onChange={f("subject")} />
          </div>
          <div className="space-y-2">
            <Label>Due Date / Time</Label>
            <Input type="datetime-local" className="bg-black/20 border-white/10 text-white" value={formData.dueDate} onChange={f("dueDate")} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-white text-sm resize-none"
              rows={3}
              value={formData.description}
              onChange={f("description")}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-white/10">Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-white">
              {isPending ? "Saving..." : mode === "create" ? "Log Activity" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
