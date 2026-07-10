import React, { useState } from "react";
import { Link } from "wouter";
import {
  useListPriceBooks, useCreatePriceBook, useUpdatePriceBook, useDeletePriceBook,
  getListPriceBooksQueryKey,
  type CreatePriceBookInput, type PriceBookWithCount,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { ListPageHeader } from "@/components/list-page-header";
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
import { BookText, MoreHorizontal, Pencil, Trash2, Lock, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PriceBookFormData {
  name: string;
  description: string;
  isActive: boolean;
}

const defaultForm: PriceBookFormData = { name: "", description: "", isActive: true };

function PriceBookFormDialog({
  open, onOpenChange, mode, initialData,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initialData?: { id: number } & PriceBookFormData;
}) {
  const [formData, setFormData] = useState<PriceBookFormData>(initialData ?? defaultForm);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreatePriceBook();
  const updateMutation = useUpdatePriceBook();
  const isPending = createMutation.isPending || updateMutation.isPending;

  React.useEffect(() => {
    if (open) setFormData(initialData ?? defaultForm);
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const payload: CreatePriceBookInput = {
      name: formData.name,
      description: formData.description || null,
      isActive: formData.isActive,
    };
    try {
      if (mode === "create") {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "Price book created", description: `${formData.name} is ready for product entries.` });
      } else if (initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, data: payload });
        toast({ title: "Price book updated" });
      }
      await queryClient.invalidateQueries({ queryKey: getListPriceBooksQueryKey() });
      onOpenChange(false);
    } catch {
      toast({ title: "Error", description: "Could not save price book.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Price Book" : "Edit Price Book"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="pb-name">Name *</Label>
            <Input id="pb-name" required className="bg-muted border-border"
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pb-desc">Description</Label>
            <Input id="pb-desc" className="bg-muted border-border"
              value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="pb-active" checked={formData.isActive}
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 accent-primary" />
            <Label htmlFor="pb-active" className="cursor-pointer">Active</Label>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-foreground">
              {isPending ? "Saving..." : mode === "create" ? "Create" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const VIEW_OPTIONS = [
  { label: "All Price Books", value: "all", pinned: true },
  { label: "Active", value: "active", pinned: true },
];

export default function PriceBooks() {
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState(VIEW_OPTIONS[0]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<({ id: number } & PriceBookFormData) | null>(null);
  const [deleting, setDeleting] = useState<PriceBookWithCount | null>(null);
  const { data, isLoading } = useListPriceBooks();
  const allBooks = data?.data ?? [];
  const books = allBooks.filter((b) => {
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeView.value === "active") return b.isActive;
    return true;
  });
  const deleteMutation = useDeletePriceBook();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync({ id: deleting.id });
      await queryClient.invalidateQueries({ queryKey: getListPriceBooksQueryKey() });
      toast({ title: "Price book deleted" });
    } catch {
      toast({ title: "Error", description: "Could not delete price book.", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-3">
        <ListPageHeader
          icon={BookText}
          title="Price Books"
          viewLabel="All Price Books"
          viewOptions={VIEW_OPTIONS}
          activeView={activeView.value}
          onViewChange={(val) => { const v = VIEW_OPTIONS.find((o) => o.value === val); if (v) setActiveView(v); }}
          search={{ value: search, onChange: setSearch, placeholder: "Search price books..." }}
          onNew={() => setIsCreateOpen(true)}
          newLabel="New Price Book"
        />

        <Card className="glass-panel border-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left [&_tbody_td]:whitespace-nowrap">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-b border-blue-800 divide-x divide-blue-500/40">
                  <th className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white">Name</th>
                  <th className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white">Description</th>
                  <th className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white text-right">Products</th>
                  <th className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white">Status</th>
                  <th className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : books.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <BookText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No price books found.
                  </td></tr>
                ) : books.map(book => (
                  <tr key={book.id} className="hover:bg-muted/50 transition-colors group">
                    <td className="px-3 py-1.5">
                      <Link href={`/price-books/${book.id}`} className="font-medium text-primary hover:underline flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <BookText className="w-4 h-4 text-primary" />
                        </div>
                        {book.name}
                        {book.isStandard && (
                          <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/5 gap-1">
                            <Lock className="w-3 h-3" /> Standard
                          </Badge>
                        )}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground max-w-xs truncate">{book.description || "-"}</td>
                    <td className="px-3 py-1.5 text-right font-semibold text-foreground">{book.entryCount}</td>
                    <td className="px-3 py-1.5">
                      <Badge variant="outline" className={book.isActive ? "border-green-500/30 text-green-600 bg-green-500/5" : "border-border text-muted-foreground"}>
                        {book.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/price-books/${book.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground">
                            Manage <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border text-foreground">
                            <DropdownMenuItem
                              disabled={book.isStandard}
                              onClick={() => setEditing({
                                id: book.id,
                                name: book.name,
                                description: book.description ?? "",
                                isActive: book.isActive,
                              })}
                              className="cursor-pointer hover:bg-muted"
                            >
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-muted" />
                            <DropdownMenuItem
                              disabled={book.isStandard}
                              onClick={() => setDeleting(book)}
                              className="cursor-pointer text-destructive hover:bg-destructive/10 focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <PriceBookFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} mode="create" />
      <PriceBookFormDialog
        open={!!editing}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        mode="edit"
        initialData={editing ?? undefined}
      />
      <AlertDialog open={deleting !== null} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Price Book?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {deleting && deleting.entryCount > 0
                ? `This price book has ${deleting.entryCount} product entr${deleting.entryCount === 1 ? "y" : "ies"} that will be removed. Existing quotes will not be affected.`
                : "This price book will be removed. Existing quotes will not be affected."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border hover:bg-muted/50">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/80">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
