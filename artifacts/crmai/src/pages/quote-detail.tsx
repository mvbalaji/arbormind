import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetQuote, useUpdateQuote, useCreateQuoteVersion, useSendQuote, useDeleteQuote,
  useListProducts,
  useListOpportunities, useListContacts, useListAccounts,
  useListPriceBooks, useListActivePriceBookEntries,
  useGetActiveContractPricing, useListContracts,
  useCreateContract, useListUsers,
  getGetQuoteQueryKey, getListQuotesQueryKey, getListActivePriceBookEntriesQueryKey, getListContractsQueryKey,
  getGetActiveContractPricingQueryKey,
  CreateQuoteInputStatus, UpdateQuoteInputStatus,
} from "@workspace/api-client-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StagePipeline } from "@/components/stage-pipeline";
import {
  ArrowLeft, Download, Send, Copy, CheckCircle, XCircle, Clock, Check,
  FileText, FileSignature, Calendar, Package, Building2, User, History, Pencil, Plus, X, Save, Trash2, FilePlus, Layers,
  PhoneCall, Mail, ListTodo, CalendarPlus, RotateCw, Paperclip, Upload, Trash, Search, ChevronRight, ChevronDown, Cpu,
  Users, UserPlus, ChevronDown as ChevronDownIcon,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useCurrency } from "@/context/currency";
import { useToast } from "@/hooks/use-toast";
import { EntityApprovals } from "@/components/entity-approvals";
import { ApprovalWarning } from "@/components/approval-warning";
import { useAuth } from "@/context/auth";
import { useCpqEnabled } from "@/context/cpq-feature";

const STATUS_COLORS: Record<string, string> = {
  draft: "border-border text-muted-foreground",
  proposal: "border-purple-500/30 text-purple-600 bg-purple-500/5",
  sent: "border-blue-500/30 text-blue-600 bg-blue-500/5",
  accepted: "border-green-500/30 text-green-600 bg-green-500/5",
  rejected: "border-red-500/30 text-red-600 bg-red-500/5",
  expired: "border-orange-500/30 text-orange-600 bg-orange-500/5",
};

interface EditableItem {
  productId: number | null;
  priceBookEntryId: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  costPrice: number | null;
  bundleId?: number | null;
  bundleName?: string | null;
}

function lineMarginPct(item: { unitPrice: number; discount: number; costPrice: number | null }): number | null {
  if (!item.costPrice || item.costPrice <= 0) return null;
  const effective = item.unitPrice * (1 - (item.discount ?? 0) / 100);
  if (effective <= 0) return null;
  return ((effective - item.costPrice) / effective) * 100;
}

function marginColor(pct: number | null) {
  if (pct == null) return "text-muted-foreground";
  if (pct >= 30) return "text-green-600";
  if (pct >= 15) return "text-amber-600";
  return "text-red-600";
}

export default function QuoteDetail() {
  const [, params] = useRoute("/quotes/:id");
  const [, navigate] = useLocation();
  const quoteId = parseInt(params?.id ?? "0");
  const { data: quote, isLoading, error } = useGetQuote(quoteId, { query: { enabled: quoteId > 0, queryKey: getGetQuoteQueryKey(quoteId) } });
  const updateMutation = useUpdateQuote();
  const versionMutation = useCreateQuoteVersion();
  const sendMutation = useSendQuote();
  const deleteMutation = useDeleteQuote();
  const createContractMutation = useCreateContract();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { data: productsData } = useListProducts({ limit: 200 });
  const products = productsData?.data ?? [];
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { format: fmtMoney } = useCurrency();
  const { data: oppsData } = useListOpportunities({ limit: 200 });
  const opportunities = oppsData?.data ?? [];
  const { data: contactsData } = useListContacts({ limit: 200 });
  const contacts = contactsData?.data ?? [];
  const { data: accountsData } = useListAccounts({ limit: 200 });
  const accounts = accountsData?.data ?? [];
  const { data: usersData } = useListUsers({ limit: 100 });
  const users: any[] = (usersData as any)?.users ?? (usersData as any)?.data ?? [];

  // Quote team
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamLoaded, setTeamLoaded] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberUserId, setAddMemberUserId] = useState<string>("");
  const [addMemberRole, setAddMemberRole] = useState("Quote Specialist");
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [editingMemberRole, setEditingMemberRole] = useState<string>("");

  const TEAM_ROLES = ["Quote Owner", "Quote Specialist", "Solution Engineer", "Pricing Analyst", "Sales Manager", "Account Executive", "Technical Advisor", "Legal / Contracts"];

  const ROLE_COLORS: Record<string, string> = {
    "Quote Owner": "bg-blue-500/15 text-blue-600",
    "Sales Manager": "bg-violet-500/15 text-violet-600",
    "Account Executive": "bg-emerald-500/15 text-emerald-600",
    "Solution Engineer": "bg-amber-500/15 text-amber-600",
    "Pricing Analyst": "bg-cyan-500/15 text-cyan-600",
    "Quote Specialist": "bg-indigo-500/15 text-indigo-600",
    "Technical Advisor": "bg-orange-500/15 text-orange-600",
    "Legal / Contracts": "bg-rose-500/15 text-rose-600",
  };

  useEffect(() => {
    if (!quoteId || quoteId <= 0) return;
    fetch(`/api/quotes/${quoteId}/team`)
      .then(r => r.json())
      .then(data => { setTeamMembers(Array.isArray(data) ? data : []); setTeamLoaded(true); })
      .catch(() => setTeamLoaded(true));
  }, [quoteId]);

  async function addTeamMember() {
    if (!addMemberUserId) return;
    const r = await fetch(`/api/quotes/${quoteId}/team`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: parseInt(addMemberUserId), role: addMemberRole }),
    });
    if (r.ok) {
      const member = await r.json();
      setTeamMembers(prev => {
        const without = prev.filter(m => m.user_id !== member.user_id);
        return [...without, member];
      });
      setShowAddMember(false);
      setAddMemberUserId("");
      setAddMemberRole("Quote Specialist");
    }
  }

  async function saveEditMemberRole(memberId: number) {
    await fetch(`/api/quotes/${quoteId}/team/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: editingMemberRole }),
    });
    setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: editingMemberRole } : m));
    setEditingMemberId(null);
  }

  async function removeTeamMember(memberId: number) {
    await fetch(`/api/quotes/${quoteId}/team/${memberId}`, { method: "DELETE" });
    setTeamMembers(prev => prev.filter(m => m.id !== memberId));
    if (editingMemberId === memberId) setEditingMemberId(null);
  }

  const [activeTab, setActiveTab] = useState<"details" | "approvals" | "contracts">("details");
  const { data: quoteContractsData } = useListContracts(
    { opportunityId: quote?.opportunityId ?? undefined, limit: 100 },
    { query: { enabled: !!quote?.opportunityId, queryKey: getListContractsQueryKey({ opportunityId: quote?.opportunityId ?? undefined, limit: 100 }) } },
  );
  const quoteContracts = quoteContractsData?.data ?? [];
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { cpqEnabled } = useCpqEnabled();
  const canSeeMargin = ["super_admin", "admin", "md", "vp", "sales_director", "sales_rep"].includes(user?.role ?? "");
  type EditSection = "header" | "parties" | "items" | "notes";
  const [editingSection, setEditingSection] = useState<EditSection | null>(null);
  const startEdit = (s: EditSection) => setEditingSection(s);
  const cancelEdit = () => setEditingSection(null);
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editValidUntil, setEditValidUntil] = useState("");
  const [editDiscount, setEditDiscount] = useState("0");
  const [editTax, setEditTax] = useState("0");
  const [editNotes, setEditNotes] = useState("");
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  const [editOpportunityId, setEditOpportunityId] = useState<number | null>(null);
  const [editContactId, setEditContactId] = useState<number | null>(null);
  const [editAccountId, setEditAccountId] = useState<number | null>(null);
  const [editPriceBookId, setEditPriceBookId] = useState<number | null>(null);
  const [bundlePickerOpen, setBundlePickerOpen] = useState(false);
  const [bundleSearch, setBundleSearch] = useState("");

  // CPQ Product Configurator
  const [cpqOpen, setCpqOpen] = useState(false);
  const [cpqLaunchOpen, setCpqLaunchOpen] = useState(
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("cpqPrompt") === "1"
  );
  const [cpqStep, setCpqStep] = useState<1 | 2>(1);
  const [cpqSearch, setCpqSearch] = useState("");
  const [cpqCategory, setCpqCategory] = useState("");
  const [cpqSelectedIds, setCpqSelectedIds] = useState<Set<number>>(new Set());
  type CpqItem = { productId: number; priceBookEntryId: number | null; productName: string; quantity: number; unitPrice: number; discount: number; costPrice: number | null };
  const [cpqItems, setCpqItems] = useState<CpqItem[]>([]);

  const openCpq = () => {
    setCpqStep(1);
    setCpqSearch("");
    setCpqCategory("");
    setCpqSelectedIds(new Set());
    setCpqItems([]);
    setCpqOpen(true);
    if (editingSection !== "items") startEdit("items");
  };

  const cpqNext = () => {
    const configured = Array.from(cpqSelectedIds).map(pid => {
      const prod = products.find(p => p.id === pid)!;
      const entry = entryByProduct.get(pid);
      const contractPrice = contractPriceFor(pid);
      const basePrice = entry ? entry.listPrice : prod.unitPrice;
      return {
        productId: pid,
        priceBookEntryId: entry?.id ?? null,
        productName: prod.name,
        quantity: 1,
        unitPrice: contractPrice ? contractPrice.unitPrice : (basePrice ?? 0),
        discount: 0,
        costPrice: (prod as any).costPrice ?? null,
      } as CpqItem;
    });
    setCpqItems(configured);
    setCpqStep(2);
  };

  const cpqAddToQuote = () => {
    setEditItems(prev => [...prev, ...cpqItems.map(i => ({
      productId: i.productId,
      priceBookEntryId: i.priceBookEntryId,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount,
      costPrice: i.costPrice,
      bundleId: null,
      bundleName: null,
    }))]);
    setCpqOpen(false);
  };
  const [collapsedBundles, setCollapsedBundles] = useState<Set<number>>(new Set());
  const toggleBundle = (bId: number) => setCollapsedBundles(prev => { const s = new Set(prev); s.has(bId) ? s.delete(bId) : s.add(bId); return s; });
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const toggleSelectItem = (id: number) => setSelectedItems(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const [selectedEditIdxs, setSelectedEditIdxs] = useState<Set<number>>(new Set());
  const toggleSelectEditIdx = (idx: number) => setSelectedEditIdxs(prev => { const s = new Set(prev); s.has(idx) ? s.delete(idx) : s.add(idx); return s; });
  const { data: bundlesData = [] } = useQuery<any[]>({ queryKey: ["product-bundles"], queryFn: () => fetch("/api/product-bundles").then((r) => r.json()) });

  // Activities
  const [activitySubTab, setActivitySubTab] = useState<"call" | "email" | "task" | "event">("call");
  const [activityText, setActivityText] = useState("");
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const opportunityId = quote?.opportunityId ?? null;
  const { data: activitiesData, refetch: refetchActivities } = useQuery<{ data: any[] }>({
    queryKey: ["quote-activities", quoteId, opportunityId],
    queryFn: async () => {
      if (!opportunityId) return { data: [] };
      const res = await fetch(`/api/activities?opportunityId=${opportunityId}&limit=50`, { credentials: "include" });
      return res.ok ? res.json() : { data: [] };
    },
    enabled: quoteId > 0 && !!opportunityId,
  });
  const activities = activitiesData?.data ?? [];

  // Attachments
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { data: attachmentsData, refetch: refetchAttachments } = useQuery<{ data: any[] }>({
    queryKey: ["quote-attachments", quoteId],
    queryFn: async () => {
      const res = await fetch(`/api/quotes/${quoteId}/attachments`, { credentials: "include" });
      return res.ok ? res.json() : { data: [] };
    },
    enabled: quoteId > 0,
  });
  const attachments = attachmentsData?.data ?? [];

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`/api/quotes/${quoteId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fileName: file.name, fileSize: file.size, fileType: file.type, fileData: base64 }),
      });
      if (!res.ok) throw new Error("Upload failed");
      void refetchAttachments();
      toast({ title: "File uploaded", description: file.name });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload file.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const deleteAttachment = async (id: number) => {
    await fetch(`/api/quotes/${quoteId}/attachments/${id}`, { method: "DELETE", credentials: "include" });
    void refetchAttachments();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const { data: priceBooksData } = useListPriceBooks();
  const priceBooks = (priceBooksData?.data ?? []).filter(pb => pb.isActive);
  const { data: activeEntriesData } = useListActivePriceBookEntries(editPriceBookId ?? 0, {
    query: { enabled: (editPriceBookId ?? 0) > 0, queryKey: getListActivePriceBookEntriesQueryKey(editPriceBookId ?? 0) },
  });
  const entryByProduct = new Map((activeEntriesData?.data ?? []).map(e => [e.productId, e]));
  const priceBookName = (id: number | null | undefined) => priceBooks.find(pb => pb.id === id)?.name;

  const pricingAccountId = editAccountId ?? quote?.accountId ?? 0;
  const { data: contractPricingData } = useGetActiveContractPricing(pricingAccountId, {
    query: { enabled: pricingAccountId > 0, queryKey: getGetActiveContractPricingQueryKey(pricingAccountId) },
  });
  const contractPricing = contractPricingData?.pricing ?? {};
  const contractPriceFor = (productId: number) => contractPricing[String(productId)] ?? null;

  useEffect(() => {
    if (quote && editingSection) {
      setEditName(quote.name);
      setEditStatus(quote.status);
      setEditValidUntil(quote.validUntil ? quote.validUntil.split("T")[0] : "");
      setEditDiscount(String(quote.discount ?? 0));
      setEditTax(String(quote.tax ?? 0));
      setEditNotes(quote.notes ?? "");
      setEditOpportunityId(quote.opportunityId ?? null);
      setEditContactId(quote.contactId ?? null);
      setEditAccountId(quote.accountId ?? null);
      setEditPriceBookId(quote.priceBookId ?? null);
      // Split same-bundleId items into separate instances by detecting repeating product cycles
      const bundleSeenProducts = new Map<number, Set<number | null>>();
      const bundleInstanceIds = new Map<number, number>();
      let instanceCounter = 0;
      setEditItems(quote.items.map(it => {
        const rawBundleId = (it as any).bundleId as number | null ?? null;
        const bundleName = (it as any).bundleName ?? null;
        if (!rawBundleId) return {
          productId: it.productId ?? null, priceBookEntryId: it.priceBookEntryId ?? null,
          productName: it.productName, quantity: it.quantity, unitPrice: it.unitPrice,
          discount: it.discount ?? 0, costPrice: (it as any).costPrice ?? null,
          bundleId: null, bundleName: null,
        };
        if (!bundleSeenProducts.has(rawBundleId)) {
          bundleSeenProducts.set(rawBundleId, new Set());
          bundleInstanceIds.set(rawBundleId, ++instanceCounter * 100000 + rawBundleId);
        }
        const seen = bundleSeenProducts.get(rawBundleId)!;
        // If this product already appeared in this group, it's a new bundle instance
        if (seen.has(it.productId ?? null)) {
          bundleSeenProducts.set(rawBundleId, new Set());
          bundleInstanceIds.set(rawBundleId, ++instanceCounter * 100000 + rawBundleId);
        }
        seen.add(it.productId ?? null);
        return {
          productId: it.productId ?? null, priceBookEntryId: it.priceBookEntryId ?? null,
          productName: it.productName, quantity: it.quantity, unitPrice: it.unitPrice,
          discount: it.discount ?? 0, costPrice: (it as any).costPrice ?? null,
          bundleId: bundleInstanceIds.get(rawBundleId)!, bundleName,
        };
      }));
    }
  }, [editingSection, quote]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: getGetQuoteQueryKey(quoteId) });
    void queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateMutation.mutateAsync({ id: quoteId, data: { status: newStatus as UpdateQuoteInputStatus } });
      toast({ title: "Status updated", description: `Quote status changed to ${newStatus}` });
      invalidate();
    } catch {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        id: quoteId,
        data: {
          name: editName,
          status: editStatus as CreateQuoteInputStatus,
          validUntil: editValidUntil || null,
          discount: parseFloat(editDiscount) || 0,
          tax: parseFloat(editTax) || 0,
          notes: editNotes || null,
          opportunityId: editOpportunityId,
          contactId: editContactId,
          accountId: editAccountId,
          priceBookId: editPriceBookId,
          items: editItems.filter(it => it.productName).map(it => ({
            productId: it.productId,
            priceBookEntryId: it.priceBookEntryId,
            productName: it.productName,
            quantity: it.quantity || 1,
            unitPrice: it.unitPrice || 0,
            discount: it.discount || 0,
            bundleId: it.bundleId ?? null,
            bundleName: it.bundleName ?? null,
          })),
        },
      });
      toast({ title: "Quote updated" });
      setEditingSection(null);
      invalidate();
    } catch (err: any) {
      console.error("Quote save error:", err);
      const msg = err?.data?.error ?? err?.message ?? "Could not save quote.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleCreateVersion = async () => {
    try {
      const newQuote = await versionMutation.mutateAsync({ id: quoteId });
      toast({ title: "New version created", description: `Version ${newQuote.version} created as draft.` });
      invalidate();
      navigate(`/quotes/${newQuote.id}`);
    } catch {
      toast({ title: "Error", description: "Could not create version.", variant: "destructive" });
    }
  };

  const handleSend = async () => {
    try {
      const result = await sendMutation.mutateAsync({ id: quoteId });
      toast({ title: "Quote sent", description: result.message });
      invalidate();
    } catch {
      toast({ title: "Error", description: "Could not send quote.", variant: "destructive" });
    }
  };

  const handleCreateContract = async () => {
    try {
      const items = (quote.items ?? []).map((it: any) => ({
        productId: (it.productId as number | null) ?? null,
        productName: it.productName as string,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        discount: Number(it.discount) || 0,
        listPrice: Number(it.listPrice ?? it.unitPrice) || 0,
      }));
      const contract = await createContractMutation.mutateAsync({ data: {
        name: `Contract — ${quote.name}`,
        accountId: quote.accountId ?? null,
        contactId: quote.contactId ?? null,
        opportunityId: quote.opportunityId ?? null,
        priceBookId: quote.priceBookId ?? null,
        status: "draft" as const,
        endDate: quote.validUntil ? String(quote.validUntil).slice(0, 10) : null,
        description: quote.notes ?? null,
        discount: 0,
        tax: 0,
        autoRenew: false,
        items,
      } });
      toast({ title: "Contract created", description: `${contract.contractNumber} created from quote. Add more details below.` });
      navigate(`/contracts/${contract.id}`);
    } catch {
      toast({ title: "Error", description: "Could not create contract from quote.", variant: "destructive" });
    }
  };

  const handleDownloadPdf = () => {
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
    window.open(`${baseUrl}/api/quotes/${quoteId}/pdf`, "_blank");
  };

  const lineTotal = (item: EditableItem) => item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100);
  const editSubtotal = editItems.reduce((sum, item) => sum + lineTotal(item), 0);
  const editDiscountAmt = editSubtotal * (parseFloat(editDiscount) || 0) / 100;
  const editTaxAmt = (editSubtotal - editDiscountAmt) * (parseFloat(editTax) || 0) / 100;
  const editTotal = editSubtotal - editDiscountAmt + editTaxAmt;

  const editTotalCost = editItems.reduce((s, i) => s + (i.costPrice != null ? i.quantity * i.costPrice : 0), 0);
  const editBlendedMargin = editSubtotal > 0 && editItems.some(i => i.costPrice != null && i.costPrice > 0)
    ? ((editSubtotal - editTotalCost) / editSubtotal) * 100 : null;

  const addItem = () => setEditItems(prev => [...prev, { productId: null, priceBookEntryId: null, productName: "", quantity: 1, unitPrice: 0, discount: 0, costPrice: null }]);

  const addBundle = (bundle: any) => {
    // Unique instance ID per addition so the same bundle can be added multiple times
    const instanceId = Date.now() % 2000000000;
    const newItems = (bundle.items ?? []).map((it: any) => {
      const effectivePrice = it.unit_price_override != null ? Number(it.unit_price_override) : Number(it.default_unit_price ?? 0);
      const itemDisc = Math.max(0, Number(it.discount_pct) || 0);
      const bundleDisc = Math.max(0, Number(bundle.bundle_discount_pct) || 0);
      const combinedDisc = Math.min(99.99, itemDisc + bundleDisc);
      return {
        productId: Number(it.product_id) || null,
        priceBookEntryId: null,
        productName: String(it.product_name || ""),
        quantity: Number(it.quantity) || 1,
        unitPrice: isFinite(effectivePrice) ? effectivePrice : 0,
        discount: combinedDisc,
        costPrice: null as number | null,
        bundleId: instanceId,
        bundleName: bundle.name as string,
      };
    });
    setEditItems(prev => [...prev, ...newItems]);
    setBundlePickerOpen(false);
    setBundleSearch("");
  };
  const removeItem = (idx: number) => setEditItems(prev => prev.filter((_, i) => i !== idx));

  const deleteViewItem = async (itemId: number) => {
    if (!quote) return;
    const remaining = quote.items.filter((i: any) => i.id !== itemId);
    await updateMutation.mutateAsync({ id: quoteId, data: { items: remaining.map((i: any) => ({
      productId: i.productId ?? null, priceBookEntryId: i.priceBookEntryId ?? null,
      productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice,
      discount: i.discount ?? 0, bundleId: (i as any).bundleId ?? null, bundleName: (i as any).bundleName ?? null,
    })) } as any });
    invalidate();
  };

  const deleteViewBundle = async (instanceBId: number, rawItems: any[]) => {
    if (!quote) return;
    const remaining = rawItems.filter((i: any) => (i as any)._instanceBId !== instanceBId);
    await updateMutation.mutateAsync({ id: quoteId, data: { items: remaining.map((i: any) => ({
      productId: i.productId ?? null, priceBookEntryId: i.priceBookEntryId ?? null,
      productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice,
      discount: i.discount ?? 0, bundleId: (i as any).bundleId ?? null, bundleName: (i as any).bundleName ?? null,
    })) } as any });
    invalidate();
  };
  const deleteSelectedViewItems = async () => {
    if (!quote || selectedItems.size === 0) return;
    const remaining = quote.items.filter((i: any) => !selectedItems.has(i.id));
    await updateMutation.mutateAsync({ id: quoteId, data: { items: remaining.map((i: any) => ({
      productId: i.productId ?? null, priceBookEntryId: i.priceBookEntryId ?? null,
      productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice,
      discount: i.discount ?? 0, bundleId: (i as any).bundleId ?? null, bundleName: (i as any).bundleName ?? null,
    })) } as any });
    setSelectedItems(new Set());
    invalidate();
  };

  const updateItem = (idx: number, changes: Partial<EditableItem>) =>
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, ...changes } : item));
  const pickProduct = (idx: number, productId: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    const entry = entryByProduct.get(productId);
    const contractPrice = contractPriceFor(productId);
    const basePrice = entry ? entry.listPrice : prod.unitPrice;
    updateItem(idx, {
      productId: prod.id,
      productName: prod.name,
      priceBookEntryId: entry?.id ?? null,
      unitPrice: contractPrice ? contractPrice.unitPrice : basePrice,
      discount: 0,
      costPrice: (prod as any).costPrice ?? null,
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !quote) {
    return (
      <Layout>
        <div className="text-center py-20">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Quote Not Found</h2>
          <Button variant="outline" onClick={() => navigate("/quotes")} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Quotes
          </Button>
        </div>
      </Layout>
    );
  }

  const canEdit = quote.isLatestVersion !== false && (quote.status === "draft" || quote.status === "proposal" || quote.status === "sent");
  const hasContact = !!(quote.contactId || quote.contactName);

  const quoteItems = quote.items ?? [];
  const showCpqGuide = cpqEnabled && canEdit && quoteItems.length === 0;

  return (
    <Layout>
      {/* CPQ process guide banner — shown when CPQ is enabled and quote has no line items */}
      {showCpqGuide && (
        <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-5 py-3.5 mb-4 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Cpu className="w-5 h-5 text-blue-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Next step: Configure your quote line items</p>
              <p className="text-xs text-blue-700 mt-0.5">Use CPQ to add products, apply pricing rules, and configure bundles — then return here to send to the customer.</p>
            </div>
          </div>
          <button
            onClick={() => setCpqLaunchOpen(true)}
            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors whitespace-nowrap"
          >
            Configure with CPQ →
          </button>
        </div>
      )}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/quotes")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              {editingSection === "header" ? (
                <>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="max-w-xs bg-muted border-border text-lg font-bold" />
                  <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-foreground h-8">
                    <Save className="w-3.5 h-3.5 mr-1" /> Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelEdit} className="border-border h-8">
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">{quote.name}</h1>
                  {canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => startEdit("header")} className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Edit name">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </>
              )}
              <Badge variant="outline" className={`capitalize ${STATUS_COLORS[quote.status] ?? ""}`}>
                {quote.status}
              </Badge>
              <span className="text-sm text-muted-foreground font-mono">{quote.quoteNumber}</span>
              <Badge variant="secondary" className="text-xs">v{quote.version}</Badge>
              {canSeeMargin && (() => {
                const itemsWithCost = (quote.items ?? []).filter((i: any) => i.costPrice != null && i.costPrice > 0);
                if (itemsWithCost.length === 0 || !quote.subtotal) return null;
                const revenue = Number(quote.subtotal);
                const totalCost = (quote.items ?? []).reduce((s: number, i: any) => s + (i.costPrice != null ? Number(i.quantity) * Number(i.costPrice) : 0), 0);
                const grossProfit = revenue - totalCost;
                const bm = (grossProfit / revenue) * 100;
                const colors = bm >= 30 ? "border-green-500/40 text-green-600 bg-green-500/10" : bm >= 15 ? "border-amber-500/40 text-amber-600 bg-amber-500/10" : "border-red-500/40 text-red-600 bg-red-500/10";
                const tooltip = [
                  `Blended Margin = (Revenue − Cost) ÷ Revenue`,
                  ``,
                  `Revenue (subtotal):  ${fmtMoney(revenue)}`,
                  `Total cost:          ${fmtMoney(totalCost)}`,
                  `Gross profit:        ${fmtMoney(grossProfit)}`,
                  ``,
                  `= ${fmtMoney(grossProfit)} ÷ ${fmtMoney(revenue)} = ${bm.toFixed(2)}%`,
                  ``,
                  `Items with cost data: ${itemsWithCost.length} / ${(quote.items ?? []).length}`,
                ].join("\n");
                return (
                  <Badge variant="outline" className={`text-xs font-semibold cursor-help ${colors}`} title={tooltip}>
                    Margin {bm.toFixed(1)}%
                  </Badge>
                );
              })()}
              {quote.total != null && Number(quote.total) > 0 && (
                <Badge variant="outline" className="text-sm font-bold border-primary/40 text-primary bg-primary/5 px-2.5 py-0.5 flex items-center gap-1">
                  <span className="text-xs font-normal text-muted-foreground">
                    {quote.tax > 0 ? "Total (inc. tax)" : "Total (ex. tax)"}
                  </span>
                  {fmtMoney(Number(quote.total))}
                </Badge>
              )}
              {quote.isLatestVersion === false && (
                <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-600 bg-orange-500/5">older version</Badge>
              )}
              {quote.clonedFromQuoteId && (
                <a
                  href={`/quotes/${quote.clonedFromQuoteId}`}
                  className="inline-flex items-center"
                  title={quote.clonedFromQuoteName ?? undefined}
                >
                  <Badge
                    variant="outline"
                    className="text-xs border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 cursor-pointer gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Cloned from {quote.clonedFromQuoteNumber ?? `#${quote.clonedFromQuoteId}`}
                  </Badge>
                </a>
              )}
            </div>
            {(quote.createdByName || quote.createdAt) && (
              <div className="mt-1 text-xs text-muted-foreground">
                Created by <span className="font-medium text-foreground">{quote.createdByName ?? "System"}</span>
                {quote.createdAt && (
                  <> on {format(new Date(quote.createdAt), "MMM d, yyyy 'at' h:mm a")}</>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="border-border">
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
          {cpqEnabled && (
            <Button variant="outline" size="sm" className="border-blue-400 text-blue-600 hover:bg-blue-50 gap-2" onClick={() => setCpqLaunchOpen(true)}>
              <Cpu className="w-4 h-4" /> Configure with CPQ
            </Button>
          )}
          {quote.status === "draft" && (
            <Button
              size="sm"
              onClick={() => {
                if (!hasContact) {
                  toast({ title: "Contact required", description: "Please add a contact before moving to Proposal.", variant: "destructive" });
                  return;
                }
                handleStatusChange("proposal");
              }}
              disabled={updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" /> Move to Proposal
            </Button>
          )}
          {quote.status === "proposal" && (
            <Button size="sm" onClick={handleSend} disabled={sendMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Send className="w-4 h-4 mr-2" /> Send to Customer
            </Button>
          )}
          {quote.status === "sent" && (
            <>
              <Button size="sm" onClick={() => handleStatusChange("accepted")} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle className="w-4 h-4 mr-2" /> Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("rejected")} className="border-red-500/30 text-red-600 hover:bg-red-500/10">
                <XCircle className="w-4 h-4 mr-2" /> Reject
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("expired")} className="border-orange-500/30 text-orange-600 hover:bg-orange-500/10">
                <Clock className="w-4 h-4 mr-2" /> Mark Expired
              </Button>
            </>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={handleCreateVersion} disabled={versionMutation.isPending} className="border-border">
              <Copy className="w-4 h-4 mr-2" /> Revise Quote
            </Button>
          )}
          {quote.status === "accepted" && (
            <>
              <Button size="sm" onClick={() => navigate(`/orders?fromQuote=${quoteId}`)} className="bg-primary hover:bg-primary/90 text-foreground">
                <Package className="w-4 h-4 mr-2" /> Convert to Order
              </Button>
              <Button
                size="sm"
                onClick={handleCreateContract}
                disabled={createContractMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <FilePlus className="w-4 h-4 mr-2" />
                {createContractMutation.isPending ? "Creating…" : "Create Contract"}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteOpen(true)}
            className="border-red-500/30 text-red-600 hover:bg-red-500/10 ml-auto"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
        </div>

        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent className="bg-card border-border text-foreground">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Quote?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This will permanently delete <span className="font-medium text-foreground">{quote.quoteNumber}</span>
                {quote.name ? <> — <span className="font-medium text-foreground">{quote.name}</span></> : null}.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteMutation.isPending}
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    await deleteMutation.mutateAsync({ id: quoteId });
                    await queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
                    toast({ title: "Quote deleted", description: `${quote.quoteNumber} has been removed.` });
                    setIsDeleteOpen(false);
                    navigate("/quotes");
                  } catch {
                    toast({ title: "Delete failed", description: "Could not delete quote.", variant: "destructive" });
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Tabs */}
        <div className="inline-flex items-center gap-1 rounded-lg bg-muted/70 border border-border p-1">
          {(["details", "contracts", "approvals"] as const).map((t) => {
            const isActive = activeTab === t;
            const label = t === "details" ? "Quote Details" : t === "contracts" ? "Contracts" : "Approvals";
            return (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all capitalize flex items-center gap-1.5 ${
                  isActive
                    ? "bg-primary text-white font-semibold shadow-md ring-1 ring-primary/40"
                    : "bg-sky-100 text-sky-700 hover:bg-sky-200"
                }`}
              >
                {label}
                {t === "contracts" && quoteContracts.length > 0 && (
                  <span className={`text-xs rounded-full px-1.5 py-0.5 ${isActive ? "bg-white/20 text-white" : "bg-muted text-foreground"}`}>{quoteContracts.length}</span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === "approvals" && (
          <EntityApprovals
            entity="quote"
            record={quote as unknown as Record<string, unknown>}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === "contracts" && (
          <div className="flex flex-col gap-3">
            {quote.opportunityId && quote.status === "accepted" && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Contracts generated from this accepted quote</p>
                <Button
                  size="sm"
                  onClick={handleCreateContract}
                  disabled={createContractMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <FilePlus className="w-4 h-4 mr-2" />
                  {createContractMutation.isPending ? "Creating…" : "New Contract"}
                </Button>
              </div>
            )}
            {!quote.opportunityId ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileSignature className="w-10 h-8 mx-auto mb-3 opacity-30" />
                Link this quote to an opportunity to see its contracts.
              </div>
            ) : quoteContracts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileSignature className="w-10 h-8 mx-auto mb-3 opacity-30" />
                No contracts for this deal yet.
                {quote.status === "accepted" && (
                  <div className="mt-4">
                    <Button
                      size="sm"
                      onClick={handleCreateContract}
                      disabled={createContractMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <FilePlus className="w-4 h-4 mr-2" />
                      {createContractMutation.isPending ? "Creating…" : "Create Contract from this Quote"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              quoteContracts.map((c) => (
                <Card key={c.id} className="glass-panel border-border hover:border-primary/30 transition-all p-4 cursor-pointer" onClick={() => navigate(`/contracts/${c.id}`)}>
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileSignature className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{c.name}</p>
                        <Badge variant="outline" className="text-xs capitalize shrink-0">
                          {c.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>#{c.contractNumber}</span>
                        {c.startDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(c.startDate), "MMM d, yyyy")}
                            {c.endDate ? ` → ${format(new Date(c.endDate), "MMM d, yyyy")}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-foreground">{fmtMoney(Number(c.total))}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "details" && (<>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* ── Left column: main quote content ── */}
        <div className="flex flex-col gap-3 min-w-0">
        {/* Status Workflow Bar — Salesforce-style chevrons */}
        <Card className="glass-panel border-border p-4">
          {(() => {
            // Map legacy statuses to new pipeline stages
            const statusAlias: Record<string, string> = {
              proposal: "needs_review", sent: "presented",
            };
            const currentStatus = statusAlias[quote.status] ?? quote.status;
            const stages = [
              { id: "draft", label: "Draft" },
              { id: "needs_review", label: "Needs Review" },
              { id: "in_review", label: "In Review" },
              { id: "approved", label: "Approved" },
              { id: "rejected", label: "Rejected" },
              { id: "presented", label: "Presented" },
              { id: "accepted", label: "Accepted" },
              { id: "denied", label: "Denied" },
            ];
            const idx = stages.findIndex((s) => s.id === currentStatus);
            const currentTone =
              currentStatus === "rejected" || currentStatus === "denied" ? "red" as const :
              currentStatus === "accepted" ? "emerald" as const :
              "blue" as const;
            const stageDate = (stageId: string): Date | null =>
              stageId === "draft" && quote.createdAt ? new Date(quote.createdAt) : null;
            const nextStageMap: Record<string, string> = {
              draft: "needs_review", needs_review: "in_review", in_review: "approved",
              approved: "presented", presented: "accepted",
            };
            const nextStage = nextStageMap[currentStatus];
            const advance = nextStage
              ? {
                  label: "Mark Status as Complete",
                  icon: CheckCircle,
                  onClick: () => void handleStatusChange(nextStage as any),
                  disabled: updateMutation.isPending,
                  tone: "blue" as const,
                }
              : null;
            return (
              <StagePipeline
                ariaLabel="Quote status"
                stages={stages.map((s) => ({ ...s, enteredAt: stageDate(s.id) }))}
                currentId={currentStatus}
                currentTone={currentTone}
                advance={advance}
              />
            );
          })()}
        </Card>

        {editingSection === "parties" ? (
          /* Edit mode — clean labeled grid */
          <Card className="glass-panel border-border">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <span className="text-xs font-semibold text-foreground">Edit Customer Details</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-foreground h-7 text-xs px-3">
                  <Save className="w-3 h-3 mr-1" />Save
                </Button>
                <Button variant="outline" size="sm" onClick={cancelEdit} className="h-7 text-xs px-3">Cancel</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 px-4 py-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">Price Book</label>
                <select className="h-8 px-2 rounded-md bg-muted border border-border text-foreground text-sm"
                  value={editPriceBookId ?? ""}
                  onChange={e => setEditPriceBookId(e.target.value ? parseInt(e.target.value) : null)}>
                  <option value="">None</option>
                  {priceBooks.map(pb => <option key={pb.id} value={pb.id}>{pb.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">Opportunity</label>
                <select className="h-8 px-2 rounded-md bg-muted border border-border text-foreground text-sm"
                  value={editOpportunityId ?? ""}
                  onChange={e => setEditOpportunityId(e.target.value ? parseInt(e.target.value) : null)}>
                  <option value="">None</option>
                  {opportunities.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">Account</label>
                <select className="h-8 px-2 rounded-md bg-muted border border-border text-foreground text-sm"
                  value={editAccountId ?? ""}
                  onChange={e => setEditAccountId(e.target.value ? parseInt(e.target.value) : null)}>
                  <option value="">None</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">Contact</label>
                <select className="h-8 px-2 rounded-md bg-muted border border-border text-foreground text-sm"
                  value={editContactId ?? ""}
                  onChange={e => setEditContactId(e.target.value ? parseInt(e.target.value) : null)}>
                  <option value="">None</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">Valid Until</label>
                <Input type="date" value={editValidUntil} onChange={e => setEditValidUntil(e.target.value)} className="bg-muted border-border h-8 text-sm" />
              </div>
            </div>
          </Card>
        ) : (
          /* Read mode — slim info bar */
          <div className="flex items-center gap-0 rounded-lg border border-border bg-card overflow-hidden text-sm">
            <div className="flex items-center gap-4 px-4 py-2.5 flex-1 flex-wrap divide-x divide-border">
              <div className="flex items-center gap-1.5 pr-4">
                <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">Price Book</span>
                <span className="font-medium text-foreground text-xs">{priceBookName(quote.priceBookId) ?? "—"}</span>
              </div>
              <div className="flex items-center gap-1.5 px-4">
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">Opportunity</span>
                {quote.opportunityId
                  ? <button className="font-medium text-primary hover:underline text-xs" onClick={() => navigate(`/opportunities/${quote.opportunityId}`)}>{quote.opportunityName ?? `#${quote.opportunityId}`}</button>
                  : <span className="font-medium text-foreground text-xs">—</span>}
              </div>
              <div className="flex items-center gap-1.5 px-4">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">Account</span>
                {quote.accountId && quote.accountName
                  ? <button className="font-medium text-primary hover:underline text-xs" onClick={() => navigate(`/accounts/${quote.accountId}`)}>{quote.accountName}</button>
                  : <span className="font-medium text-foreground text-xs">{quote.accountName ?? "—"}</span>}
              </div>
              <div className="flex items-center gap-1.5 px-4">
                <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">Contact</span>
                {quote.contactId && quote.contactName
                  ? <button className="font-medium text-primary hover:underline text-xs" onClick={() => navigate(`/contacts/${quote.contactId}`)}>{quote.contactName}</button>
                  : <span className="font-medium text-foreground text-xs">{quote.contactName ?? "—"}</span>}
                {quote.contactEmail && <span className="text-xs text-muted-foreground">· {quote.contactEmail}</span>}
              </div>
              <div className="flex items-center gap-1.5 px-4">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">Valid Until</span>
                <span className="font-medium text-foreground text-xs">{quote.validUntil ? format(new Date(quote.validUntil), "MMM d, yyyy") : "—"}</span>
              </div>
            </div>
            {canEdit && (
              <button onClick={() => startEdit("parties")} className="flex items-center gap-1 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 border-l border-border transition-colors shrink-0 h-full">
                <Pencil className="w-3 h-3" />Edit
              </button>
            )}
          </div>
        )}

        {/* Line Items */}
        <Card className="glass-panel border-border overflow-visible">
          <div className="p-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-foreground">Line Items & Totals</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {canEdit && (
                <Button type="button" variant="outline" size="sm"
                  onClick={openCpq}
                  className="border-border text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Add Item
                </Button>
              )}
              {canEdit && !cpqEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { if (editingSection !== "items") startEdit("items"); setBundlePickerOpen(true); }}
                  className="border-primary/40 text-primary text-xs hover:bg-primary/5"
                >
                  <Layers className="w-3 h-3 mr-1" /> Add Bundle
                </Button>
              )}
              {canEdit && editingSection !== "items" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={selectedItems.size === 0}
                  onClick={() => void deleteSelectedViewItems()}
                  className={`text-xs ${selectedItems.size > 0 ? "border-red-400/60 text-red-600 hover:bg-red-50" : "border-border text-muted-foreground opacity-50"}`}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  {selectedItems.size > 0 ? `Delete Selected (${selectedItems.size})` : "Delete Selected"}
                </Button>
              )}
              {editingSection === "items" ? (
                <>
                  <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-foreground h-8">
                    <Save className="w-3.5 h-3.5 mr-1" /> Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelEdit} className="border-border h-8">
                    Cancel
                  </Button>
                </>
              ) : canEdit ? (
                <Button variant="ghost" size="sm" onClick={() => startEdit("items")} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
              ) : null}
            </div>
          </div>
          {editingSection === "items" ? (
            <div className="overflow-y-auto max-h-[280px]" style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--muted-foreground) / 0.4) hsl(var(--muted))" }}>
              {selectedEditIdxs.size > 0 && (
                <div className="flex items-center gap-3 px-3 py-2 bg-primary/5 border-b border-primary/20">
                  <span className="text-xs font-medium text-primary">{selectedEditIdxs.size} selected</span>
                  <Button type="button" size="sm" variant="outline"
                    className="h-6 text-xs border-red-400/50 text-red-600 hover:bg-red-50 px-2"
                    onClick={() => { setEditItems(prev => prev.filter((_, i) => !selectedEditIdxs.has(i))); setSelectedEditIdxs(new Set()); }}>
                    <Trash2 className="w-3 h-3 mr-1" /> Delete Selected
                  </Button>
                  <button type="button" className="text-xs text-muted-foreground hover:text-foreground ml-auto"
                    onClick={() => setSelectedEditIdxs(new Set())}>Clear</button>
                </div>
              )}
              {editItems.length === 0 ? (
                <div className="m-4 border border-dashed border-border rounded-lg p-6 text-center text-muted-foreground text-sm cursor-pointer hover:border-primary/30 transition-colors" onClick={addItem}>
                  <Package className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  Click to add products
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-b border-blue-800 divide-x divide-blue-500/40">
                      <th className="px-2 py-1 text-center font-semibold text-white tracking-wide w-16">
                        <div className="flex items-center justify-center gap-1.5">
                          <input type="checkbox" className="rounded"
                            checked={editItems.length > 0 && editItems.every((_, i) => selectedEditIdxs.has(i))}
                            onChange={e => {
                              if (e.target.checked) setSelectedEditIdxs(new Set(editItems.map((_, i) => i)));
                              else setSelectedEditIdxs(new Set());
                            }} />
                          <span>#</span>
                        </div>
                      </th>
                      <th className="px-2 py-1 text-left font-semibold text-white tracking-wide">Product</th>
                      <th className="px-2 py-1 text-right font-semibold text-white tracking-wide w-16">Qty</th>
                      <th className="px-2 py-1 text-right font-semibold text-white tracking-wide w-28">Unit Price</th>
                      <th className="px-2 py-1 text-right font-semibold text-white tracking-wide w-16">Disc %</th>
                      {canSeeMargin && <th className="px-2 py-1 text-right font-semibold text-white tracking-wide w-20">Margin %</th>}
                      <th className="px-2 py-1 text-right font-semibold text-white tracking-wide w-24">Total</th>
                      <th className="px-2 py-1 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(() => {
                      const nodes: React.ReactNode[] = [];
                      const seenBundleHeaders = new Set<number>();
                      let lineNum = 0;
                      for (let idx = 0; idx < editItems.length; idx++) {
                        const item = editItems[idx];
                        const bId = item.bundleId;
                        const bName = item.bundleName;
                        const isCollapsed = bId ? collapsedBundles.has(bId) : false;
                        // Bundle header row
                        if (bId && bName && !seenBundleHeaders.has(bId)) {
                          seenBundleHeaders.add(bId);
                          lineNum++;
                          const bundleItems = editItems.filter(i => i.bundleId === bId);
                          const bundleTotal = bundleItems.reduce((s, i) => s + lineTotal(i), 0);
                          const collapsed = collapsedBundles.has(bId);
                          nodes.push(
                            <tr key={`bh-${bId}`} className="bg-blue-50/60 dark:bg-blue-950/20 border-t border-blue-200/50">
                              <td className="px-2 py-2 text-center w-16"><div className="flex items-center justify-center gap-1.5">
                                <input type="checkbox" className="rounded"
                                  checked={editItems.every((it, i) => it.bundleId !== bId || selectedEditIdxs.has(i))}
                                  onChange={e => {
                                    const bundleIdxs = editItems.map((it, i) => it.bundleId === bId ? i : -1).filter(i => i >= 0);
                                    setSelectedEditIdxs(prev => { const s = new Set(prev); bundleIdxs.forEach(i => e.target.checked ? s.add(i) : s.delete(i)); return s; });
                                  }} />
                                <span className="text-muted-foreground text-xs">{lineNum}</span></div></td>
                              <td className="px-2 py-2" colSpan={5}>
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => toggleBundle(bId)} className="flex items-center gap-1.5 text-left group">
                                    {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-primary shrink-0" />}
                                    <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span className="text-sm font-semibold text-primary group-hover:underline">{bName}</span>
                                  </button>
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{bundleItems.length} item{bundleItems.length !== 1 ? "s" : ""}</span>
                                </div>
                              </td>
                              <td className="px-2 py-2 text-right text-sm font-bold text-primary">{fmtMoney(bundleTotal)}</td>
                              <td className="px-2 py-2 text-center">
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                                  title="Remove entire bundle"
                                  onClick={() => setEditItems(prev => prev.filter(i => i.bundleId !== bId))}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </td>
                            </tr>
                          );
                        }
                        if (isCollapsed) continue;
                        if (!bId) lineNum++;
                        nodes.push(
                          <tr key={idx} className={`${selectedEditIdxs.has(idx) ? "bg-primary/5" : bId ? "bg-muted/10" : "hover:bg-muted/20"} transition-colors`}>
                            <td className="px-2 py-1.5 text-center w-16"><div className="flex items-center justify-center gap-1.5">
                              <input type="checkbox" className="rounded" checked={selectedEditIdxs.has(idx)} onChange={() => toggleSelectEditIdx(idx)} />
                              <span className="text-muted-foreground text-xs">{!bId ? lineNum : ""}</span></div></td>
                            <td className={`px-2 py-1.5 ${bId ? "pl-8" : ""}`}>
                              <select
                                className="w-full h-8 px-2 rounded-md bg-muted border border-border text-foreground text-sm"
                                value={item.productId ?? ""}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val === "") updateItem(idx, { productId: null, productName: "", unitPrice: 0, costPrice: null });
                                  else pickProduct(idx, parseInt(val));
                                }}
                              >
                                <option value="">Custom / No product</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                              {!item.productId && (
                                <Input className="mt-1 h-7 text-xs bg-muted border-border" placeholder="Product name..."
                                  value={item.productName} onChange={e => updateItem(idx, { productName: e.target.value })} />
                              )}
                              {item.productId != null && contractPriceFor(item.productId) && (
                                <p className="mt-1 text-[10px] text-green-600">Contract price applied ({contractPriceFor(item.productId)!.contractNumber})</p>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <Input type="number" min="1" className="h-8 bg-muted border-border text-right text-sm w-full"
                                value={item.quantity} onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) || 1 })} />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input type="number" min="0" step="0.01" className="h-8 bg-muted border-border text-right text-sm w-full"
                                value={item.unitPrice} onChange={e => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })} />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input type="number" min="0" max="100" className="h-8 bg-muted border-border text-right text-sm w-full"
                                value={item.discount} onChange={e => updateItem(idx, { discount: parseFloat(e.target.value) || 0 })} />
                            </td>
                            {canSeeMargin && (
                              <td className="px-2 py-1.5 text-right text-xs font-semibold">
                                {(() => { const m = lineMarginPct(item); return m != null ? <span className={marginColor(m)}>{m.toFixed(1)}%</span> : <span className="text-muted-foreground">—</span>; })()}
                              </td>
                            )}
                            <td className="px-2 py-1.5 text-right text-sm font-medium text-foreground">{fmtMoney(lineTotal(item))}</td>
                            <td className="px-2 py-1.5 text-center">
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                onClick={() => removeItem(idx)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        );
                      }
                      return nodes;
                    })()}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[280px]" style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--muted-foreground) / 0.4) hsl(var(--muted))" }}>
              <table className="w-full text-sm">
                <thead className="text-xs uppercase sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-b border-blue-800 divide-x divide-blue-500/40">
                    <th className="px-2 py-1 text-center font-semibold text-white tracking-wide w-16">
                      <div className="flex items-center justify-center gap-1.5">
                        {canEdit && (
                          <input type="checkbox" className="rounded"
                            checked={quote.items.length > 0 && quote.items.every((i: any) => selectedItems.has(i.id))}
                            onChange={e => {
                              if (e.target.checked) setSelectedItems(new Set(quote.items.map((i: any) => i.id)));
                              else setSelectedItems(new Set());
                            }} />
                        )}
                        <span>#</span>
                      </div>
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-white tracking-wide">Product</th>
                    <th className="px-2 py-1 text-right font-semibold text-white tracking-wide w-16">Qty</th>
                    <th className="px-2 py-1 text-right font-semibold text-white tracking-wide w-28">Unit Price</th>
                    <th className="px-2 py-1 text-right font-semibold text-white tracking-wide w-16">Disc %</th>
                    <th className="px-2 py-1 text-right font-semibold text-white tracking-wide w-20">Margin %</th>
                    <th className="px-2 py-1 text-right font-semibold text-white tracking-wide w-24">Total</th>
                    {canEdit && <th className="px-2 py-1 w-8"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {quote.items.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No line items</td></tr>
                  ) : (() => {
                    // Pre-process: split items with same bundleId into separate instances by cycle detection
                    const vSeenProducts = new Map<number, Set<number | null>>();
                    const vInstanceIds = new Map<number, number>();
                    let vCounter = 0;
                    const viewItems = quote.items.map((item: any) => {
                      const rawBId = item.bundleId as number | null ?? null;
                      if (!rawBId) return { ...item, _instanceBId: null };
                      if (!vSeenProducts.has(rawBId)) { vSeenProducts.set(rawBId, new Set()); vInstanceIds.set(rawBId, ++vCounter * 100000 + rawBId); }
                      const seen = vSeenProducts.get(rawBId)!;
                      if (seen.has(item.productId ?? null)) { vSeenProducts.set(rawBId, new Set()); vInstanceIds.set(rawBId, ++vCounter * 100000 + rawBId); }
                      seen.add(item.productId ?? null);
                      const instId = vInstanceIds.get(rawBId)!;
                      return { ...item, bundleId: instId, _instanceBId: instId };
                    });
                    const rows: React.ReactNode[] = [];
                    const seenBundles = new Set<number>();
                    let lineNum = 0;
                    for (const item of viewItems) {
                      const bId = (item as any).bundleId as number | null | undefined;
                      const bName = (item as any).bundleName as string | null | undefined;
                      const isCollapsed = bId ? collapsedBundles.has(bId) : false;

                      // Bundle header row (numbered, collapsible)
                      if (bId && bName && !seenBundles.has(bId)) {
                        seenBundles.add(bId);
                        lineNum++;
                        const bundleItems = viewItems.filter((i: any) => i.bundleId === bId);
                        const bundleTotal = bundleItems.reduce((s, i) => s + Number(i.total), 0);
                        const collapsed = collapsedBundles.has(bId);
                        rows.push(
                          <tr key={`bh-${bId}`} className="bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors border-t border-blue-200/50">
                            <td className="px-2 py-2 text-center w-16"><div className="flex items-center justify-center gap-1.5">
                              {canEdit && (
                                <input type="checkbox" className="rounded"
                                  checked={bundleItems.every((i: any) => selectedItems.has(i.id))}
                                  onChange={e => {
                                    const ids = bundleItems.map((i: any) => i.id);
                                    setSelectedItems(prev => { const s = new Set(prev); ids.forEach((id: number) => e.target.checked ? s.add(id) : s.delete(id)); return s; });
                                  }} />
                              )}
                              <span className="text-muted-foreground text-xs">{lineNum}</span></div></td>
                            <td className="px-2 py-2" colSpan={5}>
                              <button
                                type="button"
                                onClick={() => toggleBundle(bId)}
                                className="flex items-center gap-2 text-left w-full group"
                              >
                                {collapsed
                                  ? <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0" />
                                  : <ChevronDown className="w-3.5 h-3.5 text-primary shrink-0" />
                                }
                                <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="text-sm font-semibold text-primary group-hover:underline">{bName}</span>
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full ml-1">{bundleItems.length} item{bundleItems.length !== 1 ? "s" : ""}</span>
                              </button>
                            </td>
                            <td className="px-2 py-2 text-right text-sm font-bold text-primary">{fmtMoney(bundleTotal)}</td>
                            {canEdit && (
                              <td className="px-2 py-2 text-center">
                                <button type="button" title="Remove bundle"
                                  onClick={() => deleteViewBundle(bId, viewItems)}
                                  className="text-muted-foreground hover:text-red-500 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      }

                      // Skip child rows if bundle is collapsed
                      if (isCollapsed) continue;

                      // Regular item or bundle child row
                      if (!bId) lineNum++;
                      const m = lineMarginPct({ unitPrice: item.unitPrice, discount: item.discount ?? 0, costPrice: (item as any).costPrice ?? null });
                      rows.push(
                        <tr key={item.id} className={`transition-colors group ${selectedItems.has(item.id) ? "bg-primary/5" : bId ? "bg-muted/5 hover:bg-muted/20" : "hover:bg-muted/30"}`}>
                          <td className="px-2 py-2 text-center w-16"><div className="flex items-center justify-center gap-1.5">
                            {canEdit && <input type="checkbox" className="rounded" checked={selectedItems.has(item.id)} onChange={() => toggleSelectItem(item.id)} />}
                            <span className="text-muted-foreground text-xs">{!bId ? lineNum : ""}</span></div></td>
                          <td className={`px-2 py-2 text-foreground font-medium ${bId ? "pl-8" : ""}`}>
                            {item.productName}
                          </td>
                          <td className="px-2 py-2 text-right text-muted-foreground text-sm">{item.quantity}</td>
                          <td className="px-2 py-2 text-right text-muted-foreground text-sm">{fmtMoney(item.unitPrice)}</td>
                          <td className="px-2 py-2 text-right text-muted-foreground text-sm">{item.discount}%</td>
                          {canSeeMargin && <td className={`px-2 py-2 text-right font-semibold text-xs ${marginColor(m)}`}>{m != null ? `${m.toFixed(1)}%` : "—"}</td>}
                          <td className="px-2 py-2 text-right font-semibold text-foreground text-sm">{fmtMoney(item.total)}</td>
                          {canEdit && (
                            <td className="px-2 py-2 text-center">
                              <button type="button" title="Delete item"
                                onClick={() => void deleteViewItem(item.id)}
                                className="text-muted-foreground hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    }
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="p-4 border-t border-border space-y-2">
            {editingSection === "items" ? (
              <>
                <div className="grid grid-cols-2 gap-3 max-w-xs ml-auto">
                  <div>
                    <Label className="text-xs text-muted-foreground">Discount %</Label>
                    <Input type="number" min="0" max="100" className="h-8 bg-muted border-border text-sm"
                      value={editDiscount} onChange={e => setEditDiscount(e.target.value)} />
                    <ApprovalWarning
                      entity="quote"
                      className="mt-2"
                      snapshot={{ discountPercent: parseFloat(editDiscount) || 0, total: editTotal }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tax %</Label>
                    <Input type="number" min="0" className="h-8 bg-muted border-border text-sm"
                      value={editTax} onChange={e => setEditTax(e.target.value)} />
                  </div>
                </div>
                <div className="border-t border-border pt-2 mt-2 space-y-1 text-sm max-w-xs ml-auto">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span><span>{fmtMoney(editSubtotal)}</span>
                  </div>
                  {editDiscountAmt > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Discount ({editDiscount}%)</span><span>-{fmtMoney(editDiscountAmt)}</span>
                    </div>
                  )}
                  {editTaxAmt > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax ({editTax}%)</span><span>{fmtMoney(editTaxAmt)}</span>
                    </div>
                  )}
                  {canSeeMargin && editBlendedMargin != null && (
                    <div className={`flex justify-between items-center px-2 py-1 rounded text-sm font-semibold ${editBlendedMargin >= 30 ? "bg-green-500/10" : editBlendedMargin >= 15 ? "bg-amber-500/10" : "bg-red-500/10"}`}>
                      <span className="text-muted-foreground font-normal">Blended Margin</span>
                      <span className={marginColor(editBlendedMargin)}>{editBlendedMargin.toFixed(1)}%</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-foreground text-lg border-t border-border pt-1 mt-1">
                    <span>Total</span><span>{fmtMoney(editTotal)}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span><span>{fmtMoney(quote.subtotal)}</span>
                </div>
                {quote.discount > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Discount ({quote.discount}%)</span><span>-{fmtMoney(quote.subtotal * quote.discount / 100)}</span>
                  </div>
                )}
                {quote.tax > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tax ({quote.tax}%)</span><span>{fmtMoney(quote.subtotal * (1 - quote.discount / 100) * quote.tax / 100)}</span>
                  </div>
                )}
                {canSeeMargin && (() => {
                  const itemsWithCost = quote.items.filter((i: any) => i.costPrice != null && i.costPrice > 0);
                  if (itemsWithCost.length === 0 || quote.subtotal <= 0) return null;
                  const totalCost = quote.items.reduce((s: number, i: any) => s + (i.costPrice != null ? i.quantity * i.costPrice : 0), 0);
                  const bm = ((quote.subtotal - totalCost) / quote.subtotal) * 100;
                  return (
                    <div className={`flex justify-between items-center px-2 py-1 rounded text-sm font-semibold ${bm >= 30 ? "bg-green-500/10" : bm >= 15 ? "bg-amber-500/10" : "bg-red-500/10"}`}>
                      <span className="text-muted-foreground font-normal">Blended Margin</span>
                      <span className={marginColor(bm)}>{bm.toFixed(1)}%</span>
                    </div>
                  );
                })()}
                <div className="flex justify-between font-bold text-foreground text-lg border-t border-border pt-2 mt-2">
                  <span>Total</span><span>{fmtMoney(quote.total)}</span>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Notes */}
        {(canEdit || quote.notes) && (
          <Card className="glass-panel border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">Notes & Terms</h3>
              {editingSection === "notes" ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-foreground h-8">
                    <Save className="w-3.5 h-3.5 mr-1" /> Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelEdit} className="border-border h-8">
                    Cancel
                  </Button>
                </div>
              ) : canEdit ? (
                <Button variant="ghost" size="sm" onClick={() => startEdit("notes")} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
              ) : null}
            </div>
            {editingSection === "notes" ? (
              <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                className="bg-muted border-border min-h-[100px]" placeholder="Internal notes or terms..." />
            ) : quote.notes ? (
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">{quote.notes}</p>
            ) : (
              <p className="text-muted-foreground text-sm italic">No notes yet.</p>
            )}
          </Card>
        )}

        {/* Version History */}
        {quote.versions && quote.versions.length > 1 && (
          <Card className="glass-panel border-border">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Version History</h3>
            </div>
            <div className="divide-y divide-border">
              {quote.versions.map((v) => (
                <div
                  key={v.id}
                  className={`px-2 py-1 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors ${v.id === quote.id ? "bg-primary/5" : ""}`}
                  onClick={() => { if (v.id !== quote.id) navigate(`/quotes/${v.id}`); }}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">v{v.version}</Badge>
                    <span className="text-sm font-mono text-muted-foreground">{v.quoteNumber}</span>
                    <Badge variant="outline" className={`capitalize text-xs ${STATUS_COLORS[v.status] ?? ""}`}>
                      {v.status}
                    </Badge>
                    {v.id === quote.id && (
                      <span className="text-xs text-primary font-medium">(current)</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(v.createdAt), "MMM d, yyyy")}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
        </div>{/* end left column */}

        {/* ── Right column: Activities + Attachments ── */}
        <div className="flex flex-col gap-3">

          {/* Activities Panel */}
          <Card className="border-border overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Activities</span>
              <button onClick={() => void refetchActivities()} className="text-muted-foreground hover:text-foreground">
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Activity composer */}
            <div className="border-b border-border bg-muted/20">
              <div className="flex gap-1 p-1.5 border-b border-border">
                {([
                  { id: "call" as const, icon: PhoneCall, label: "Call" },
                  { id: "email" as const, icon: Mail, label: "Email" },
                  { id: "task" as const, icon: ListTodo, label: "Task" },
                  { id: "event" as const, icon: CalendarPlus, label: "Event" },
                ]).map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setActivitySubTab(id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${activitySubTab === id ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background"}`}
                  >
                    <Icon className="w-3 h-3" /> {label}
                  </button>
                ))}
              </div>
              <div className="p-2 flex gap-2">
                <input
                  value={activityText}
                  onChange={e => setActivityText(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === "Enter" && activityText.trim()) {
                      e.preventDefault();
                      setIsAddingActivity(true);
                      try {
                        const statusMap = { call: "completed", email: "completed", task: "pending", event: "pending" };
                        await fetch("/api/activities", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({
                            type: activitySubTab,
                            subject: activityText.slice(0, 80),
                            notes: activityText,
                            status: statusMap[activitySubTab],
                            opportunityId: quote.opportunityId ?? null,
                          }),
                        });
                        setActivityText("");
                        void refetchActivities();
                        toast({ title: "Activity logged" });
                      } catch { toast({ title: "Failed to log activity", variant: "destructive" }); }
                      finally { setIsAddingActivity(false); }
                    }
                  }}
                  placeholder={activitySubTab === "call" ? "Recap the call…" : activitySubTab === "email" ? "Email summary…" : activitySubTab === "task" ? "Describe the task…" : "Describe the event…"}
                  className="flex-1 text-sm bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <Button
                  size="sm"
                  disabled={!activityText.trim() || isAddingActivity}
                  onClick={async () => {
                    if (!activityText.trim()) return;
                    setIsAddingActivity(true);
                    try {
                      const statusMap = { call: "completed", email: "completed", task: "pending", event: "pending" };
                      await fetch("/api/activities", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          type: activitySubTab,
                          subject: activityText.slice(0, 80),
                          notes: activityText,
                          status: statusMap[activitySubTab],
                          opportunityId: quote.opportunityId ?? null,
                        }),
                      });
                      setActivityText("");
                      void refetchActivities();
                      toast({ title: "Activity logged" });
                    } catch { toast({ title: "Failed", variant: "destructive" }); }
                    finally { setIsAddingActivity(false); }
                  }}
                  className="bg-primary hover:bg-primary/90 text-white h-7 px-3 text-xs"
                >
                  {isAddingActivity ? "…" : "Add"}
                </Button>
              </div>
            </div>
            {/* Timeline */}
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {activities.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs">
                  {quote.opportunityId ? "No activities yet. Log one above." : "Link an opportunity to track activities."}
                </div>
              ) : activities.map((a: any) => {
                const iconMap: Record<string, any> = { call: PhoneCall, email: Mail, task: ListTodo, event: CalendarPlus };
                const Icon = iconMap[a.type] ?? FileText;
                const isPending = a.status === "pending";
                return (
                  <div key={a.id} className="px-3 py-2 flex gap-2.5 hover:bg-muted/30">
                    <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isPending ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"}`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{a.subject}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {a.type} · {a.status} · {a.createdAt ? format(new Date(a.createdAt), "MMM d, h:mm a") : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Quote Team */}
          <Card className="border-border overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-muted-foreground" /> Quote Team
              </span>
              <button
                className="text-muted-foreground hover:text-primary transition-colors"
                title="Add team member"
                onClick={() => setShowAddMember(v => !v)}
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Add member panel */}
            {showAddMember && (
              <div className="px-3 py-2.5 border-b border-border bg-muted/30 space-y-2">
                <p className="text-[11px] font-medium text-foreground">Add Internal Team Member</p>
                <select
                  className="w-full text-xs border border-border rounded px-2 py-1.5 bg-background text-foreground"
                  value={addMemberUserId}
                  onChange={e => setAddMemberUserId(e.target.value)}
                >
                  <option value="">— Select employee —</option>
                  {users
                    .filter((u: any) => !teamMembers.some(m => m.user_id === u.id))
                    .map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}{u.team ? ` (${u.team})` : ""}</option>
                    ))
                  }
                </select>
                <select
                  className="w-full text-xs border border-border rounded px-2 py-1.5 bg-background text-foreground"
                  value={addMemberRole}
                  onChange={e => setAddMemberRole(e.target.value)}
                >
                  {TEAM_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={addTeamMember}
                    disabled={!addMemberUserId}
                    className="flex-1 text-xs bg-primary text-primary-foreground rounded px-2 py-1 disabled:opacity-40"
                  >Add</button>
                  <button
                    onClick={() => { setShowAddMember(false); setAddMemberUserId(""); }}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                  >Cancel</button>
                </div>
              </div>
            )}

            <div className="divide-y divide-border">
              {teamLoaded && teamMembers.length === 0 && !showAddMember && (
                <div className="px-3 py-5 text-center">
                  <Users className="w-6 h-6 text-muted-foreground/40 mx-auto mb-1.5" />
                  <p className="text-xs text-muted-foreground">No team members yet</p>
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="mt-1.5 text-[11px] text-primary hover:underline"
                  >Add first member</button>
                </div>
              )}
              {teamMembers.map((member: any) => {
                const name = member.name ?? "Unknown";
                const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                const colorClass = ROLE_COLORS[member.role] ?? "bg-slate-500/15 text-slate-600";
                const isEditing = editingMemberId === member.id;
                return (
                  <div key={member.id} className="px-3 py-2.5 group">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${colorClass}`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{name}</p>
                        {!isEditing && (
                          <p className="text-[10px] text-muted-foreground">{member.role}</p>
                        )}
                        {member.email && !isEditing && (
                          <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {member.email && !isEditing && (
                          <a href={`mailto:${member.email}`} className="text-muted-foreground hover:text-primary" title="Send email">
                            <Mail className="w-3 h-3" />
                          </a>
                        )}
                        {!isEditing && (
                          <button
                            onClick={() => { setEditingMemberId(member.id); setEditingMemberRole(member.role); }}
                            className="text-muted-foreground hover:text-primary"
                            title="Edit role"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => removeTeamMember(member.id)}
                          className="text-muted-foreground hover:text-destructive"
                          title="Remove from team"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {/* Inline role editor */}
                    {isEditing && (
                      <div className="mt-2 ml-9 flex gap-1.5 items-center">
                        <select
                          className="flex-1 text-xs border border-border rounded px-2 py-1 bg-background text-foreground"
                          value={editingMemberRole}
                          onChange={e => setEditingMemberRole(e.target.value)}
                          autoFocus
                        >
                          {TEAM_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button
                          onClick={() => saveEditMemberRole(member.id)}
                          className="text-[10px] bg-primary text-primary-foreground rounded px-2 py-1 whitespace-nowrap"
                        >Save</button>
                        <button
                          onClick={() => setEditingMemberId(null)}
                          className="text-[10px] text-muted-foreground hover:text-foreground px-1"
                        >✕</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Attachments Panel */}
          <Card className="border-border overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-muted-foreground" /> Attachments
                {attachments.length > 0 && <span className="text-xs text-muted-foreground">({attachments.length})</span>}
              </span>
            </div>
            {/* Drop zone */}
            <div
              className={`m-2 border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={async e => {
                e.preventDefault();
                setIsDragOver(false);
                const files = Array.from(e.dataTransfer.files);
                for (const f of files) await uploadFile(f);
              }}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.multiple = true;
                input.onchange = async () => {
                  const files = Array.from(input.files ?? []);
                  for (const f of files) await uploadFile(f);
                };
                input.click();
              }}
            >
              <Upload className={`w-5 h-5 mx-auto mb-1 ${isDragOver ? "text-primary" : "text-muted-foreground"}`} />
              <p className="text-xs text-muted-foreground">
                {isUploading ? "Uploading…" : "Drag & drop or click to upload"}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">PDF, Word, Excel, images</p>
            </div>
            {/* File list */}
            {attachments.length > 0 && (
              <div className="divide-y divide-border mx-2 mb-2 border border-border rounded-lg overflow-hidden">
                {attachments.map((att: any) => (
                  <div key={att.id} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/30 group">
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <a
                        href={`/api/quotes/${quoteId}/attachments/${att.id}/download`}
                        className="text-xs font-medium text-primary hover:underline truncate block"
                        download={att.file_name}
                      >
                        {att.file_name}
                      </a>
                      <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(att.file_size)} · {att.uploaded_by_name ?? "Unknown"} · {att.created_at ? format(new Date(att.created_at), "MMM d") : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => void deleteAttachment(att.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>{/* end right column */}
        </div>{/* end grid */}
        </>)}
      </div>

      {/* Bundle Picker Dialog */}
      <Dialog open={bundlePickerOpen} onOpenChange={(o) => { setBundlePickerOpen(o); if (!o) setBundleSearch(""); }}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 border-b border-border">
            <DialogTitle>Add Product Bundle</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Select a bundle to add all its products as line items</p>
          </DialogHeader>
          {/* Search */}
          <div className="px-3 pt-3 pb-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-8 h-8 bg-muted border-border text-sm"
                placeholder="Search bundles..."
                value={bundleSearch}
                onChange={e => setBundleSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-3 space-y-2">
            {(() => {
              const filtered = bundlesData.filter((b: any) => b.is_active && (!bundleSearch || b.name.toLowerCase().includes(bundleSearch.toLowerCase()) || (b.description ?? "").toLowerCase().includes(bundleSearch.toLowerCase())));
              if (bundlesData.filter((b: any) => b.is_active).length === 0) return (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No active bundles. Create bundles in Product Bundles page.
                </div>
              );
              if (filtered.length === 0) return (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No bundles match "{bundleSearch}"
                </div>
              );
              return filtered.map((bundle: any) => (
                <button
                  key={bundle.id}
                  onClick={() => addBundle(bundle)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <Layers className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{bundle.name}</p>
                        {bundle.description && <p className="text-xs text-muted-foreground truncate">{bundle.description}</p>}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(bundle.items ?? []).map((it: any) => (
                            <span key={it.id} className="text-[10px] bg-primary/5 border border-primary/20 px-1.5 py-0.5 rounded text-primary">
                              {it.product_name} &times;{it.quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {Number(bundle.bundle_discount_pct) > 0 && (
                        <span className="text-[10px] text-green-600 font-medium block">{bundle.bundle_discount_pct}% off</span>
                      )}
                      <p className="text-xs text-primary font-semibold mt-0.5 group-hover:underline">Add →</p>
                    </div>
                  </div>
                </button>
              ));
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* CPQ Product Configurator Dialog */}
      <Dialog open={cpqOpen} onOpenChange={o => { if (!o) setCpqOpen(false); }}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
          {/* Header */}
          <DialogHeader className="p-4 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <DialogTitle className="flex-1">
                {cpqStep === 1 ? "Select Products" : "Configure Products"}
              </DialogTitle>
              {/* Step indicator */}
              <div className="flex items-center gap-2 text-xs">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${cpqStep === 1 ? "bg-primary text-white" : "bg-green-500/10 text-green-600 border border-green-500/30"}`}>
                  {cpqStep > 1 ? <Check className="w-3 h-3" /> : <span>1</span>}
                  <span>Select</span>
                </div>
                <div className="w-6 h-px bg-border" />
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${cpqStep === 2 ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                  <span>2</span>
                  <span>Configure</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {cpqStep === 1
                ? `Select one or more products to add — ${cpqSelectedIds.size} selected`
                : `Set quantity, price and discount for each product before adding to the quote`}
            </p>
          </DialogHeader>

          {cpqStep === 1 && (
            <>
              {/* Search + filter bar */}
              <div className="px-3 pt-3 pb-2 border-b border-border flex gap-2 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input className="pl-8 h-8 bg-muted border-border text-sm" placeholder="Search products by name or SKU…"
                    value={cpqSearch} onChange={e => setCpqSearch(e.target.value)} autoFocus />
                </div>
                <select className="h-8 px-2 rounded-md bg-muted border border-border text-foreground text-sm min-w-[130px]"
                  value={cpqCategory} onChange={e => setCpqCategory(e.target.value)}>
                  <option value="">All Categories</option>
                  {Array.from(new Set(products.map((p: any) => p.category).filter(Boolean))).map(cat => (
                    <option key={cat as string} value={cat as string}>{cat as string}</option>
                  ))}
                </select>
              </div>

              {/* Select-all bar */}
              <div className="px-3 py-1.5 border-b border-border bg-muted/30 flex items-center gap-3 shrink-0">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox"
                    checked={cpqSelectedIds.size > 0 && (() => {
                      const filtered = products.filter((p: any) => (!cpqSearch || p.name.toLowerCase().includes(cpqSearch.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(cpqSearch.toLowerCase())) && (!cpqCategory || p.category === cpqCategory));
                      return filtered.length > 0 && filtered.every(p => cpqSelectedIds.has(p.id));
                    })()}
                    onChange={e => {
                      const filtered = products.filter((p: any) => (!cpqSearch || p.name.toLowerCase().includes(cpqSearch.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(cpqSearch.toLowerCase())) && (!cpqCategory || p.category === cpqCategory));
                      setCpqSelectedIds(prev => {
                        const s = new Set(prev);
                        filtered.forEach(p => e.target.checked ? s.add(p.id) : s.delete(p.id));
                        return s;
                      });
                    }}
                    className="rounded"
                  />
                  Select all visible
                </label>
                {cpqSelectedIds.size > 0 && (
                  <span className="text-xs font-medium text-primary">{cpqSelectedIds.size} product{cpqSelectedIds.size !== 1 ? "s" : ""} selected</span>
                )}
                {cpqSelectedIds.size > 0 && (
                  <button type="button" className="text-xs text-muted-foreground hover:text-foreground ml-auto"
                    onClick={() => setCpqSelectedIds(new Set())}>Clear selection</button>
                )}
              </div>

              {/* Product list */}
              <div className="overflow-y-auto flex-1">
                {(() => {
                  const filtered = products.filter((p: any) =>
                    (!cpqSearch || p.name.toLowerCase().includes(cpqSearch.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(cpqSearch.toLowerCase())) &&
                    (!cpqCategory || p.category === cpqCategory)
                  );
                  if (filtered.length === 0) return (
                    <div className="text-center py-16 text-muted-foreground text-sm">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No products match your search.
                    </div>
                  );
                  return (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-muted/80 border-b border-border text-xs uppercase">
                        <tr>
                          <th className="px-3 py-2 w-8"></th>
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Product</th>
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Category</th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">List Price</th>
                          {canSeeMargin && <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Cost</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filtered.map((prod: any) => {
                          const entry = entryByProduct.get(prod.id);
                          const contractPrice = contractPriceFor(prod.id);
                          const displayPrice = contractPrice ? contractPrice.unitPrice : (entry ? entry.listPrice : prod.unitPrice);
                          const selected = cpqSelectedIds.has(prod.id);
                          return (
                            <tr key={prod.id}
                              className={`cursor-pointer transition-colors ${selected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"}`}
                              onClick={() => setCpqSelectedIds(prev => { const s = new Set(prev); s.has(prod.id) ? s.delete(prod.id) : s.add(prod.id); return s; })}
                            >
                              <td className="px-3 py-2.5 text-center">
                                <input type="checkbox" checked={selected} readOnly className="rounded pointer-events-none" />
                              </td>
                              <td className="px-3 py-2.5">
                                <p className="font-medium text-foreground">{prod.name}</p>
                                {prod.sku && <p className="text-[10px] text-muted-foreground mt-0.5">SKU: {prod.sku}</p>}
                                {contractPrice && (
                                  <p className="text-[10px] text-green-600 mt-0.5">Contract price applied ({contractPrice.contractNumber})</p>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-muted-foreground text-xs">{(prod as any).category ?? "—"}</td>
                              <td className="px-3 py-2.5 text-right font-medium text-foreground">{fmtMoney(displayPrice ?? 0)}</td>
                              {canSeeMargin && <td className="px-3 py-2.5 text-right text-muted-foreground text-xs">{(prod as any).costPrice != null ? fmtMoney((prod as any).costPrice) : "—"}</td>}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-border flex items-center justify-between shrink-0 bg-muted/20">
                <Button variant="outline" size="sm" onClick={() => setCpqOpen(false)} className="border-border">Cancel</Button>
                <Button size="sm" onClick={cpqNext} disabled={cpqSelectedIds.size === 0}
                  className="bg-primary hover:bg-primary/90 text-white">
                  Next: Configure {cpqSelectedIds.size > 0 ? `(${cpqSelectedIds.size})` : ""} →
                </Button>
              </div>
            </>
          )}

          {cpqStep === 2 && (
            <>
              {/* Configuration table */}
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 text-xs uppercase">
                    <tr className="bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-800 divide-x divide-blue-500/40">
                      <th className="px-3 py-2 text-left font-semibold text-white">Product</th>
                      <th className="px-3 py-2 text-right font-semibold text-white w-20">Qty</th>
                      <th className="px-3 py-2 text-right font-semibold text-white w-32">Unit Price</th>
                      <th className="px-3 py-2 text-right font-semibold text-white w-24">Disc %</th>
                      {canSeeMargin && <th className="px-3 py-2 text-right font-semibold text-white w-24">Margin %</th>}
                      <th className="px-3 py-2 text-right font-semibold text-white w-28">Total</th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cpqItems.map((item, idx) => {
                      const total = item.quantity * item.unitPrice * (1 - item.discount / 100);
                      const m = lineMarginPct(item);
                      return (
                        <tr key={idx} className="hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2">
                            <p className="font-medium text-foreground">{item.productName}</p>
                            {canSeeMargin && item.costPrice != null && (
                              <p className="text-[10px] text-muted-foreground">Cost: {fmtMoney(item.costPrice)}</p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Input type="number" min="1" className="h-8 bg-muted border-border text-right text-sm w-full"
                              value={item.quantity}
                              onChange={e => setCpqItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: parseFloat(e.target.value) || 1 } : it))} />
                          </td>
                          <td className="px-3 py-2">
                            <Input type="number" min="0" step="0.01" className="h-8 bg-muted border-border text-right text-sm w-full"
                              value={item.unitPrice}
                              onChange={e => setCpqItems(prev => prev.map((it, i) => i === idx ? { ...it, unitPrice: parseFloat(e.target.value) || 0 } : it))} />
                          </td>
                          <td className="px-3 py-2">
                            <Input type="number" min="0" max="100" className="h-8 bg-muted border-border text-right text-sm w-full"
                              value={item.discount}
                              onChange={e => setCpqItems(prev => prev.map((it, i) => i === idx ? { ...it, discount: parseFloat(e.target.value) || 0 } : it))} />
                          </td>
                          {canSeeMargin && (
                            <td className="px-3 py-2 text-right text-xs font-semibold">
                              {m != null ? <span className={marginColor(m)}>{m.toFixed(1)}%</span> : <span className="text-muted-foreground">—</span>}
                            </td>
                          )}
                          <td className="px-3 py-2 text-right font-semibold text-foreground">{fmtMoney(total)}</td>
                          <td className="px-3 py-2 text-center">
                            <button type="button" className="text-muted-foreground hover:text-red-500 transition-colors"
                              onClick={() => setCpqItems(prev => prev.filter((_, i) => i !== idx))}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {cpqItems.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-sm">All items removed. Go back to select products.</div>
                )}
              </div>

              {/* Summary */}
              {cpqItems.length > 0 && (
                <div className="px-4 py-2 border-t border-border bg-muted/10 text-sm flex items-center justify-end gap-6 shrink-0">
                  <span className="text-muted-foreground">{cpqItems.length} product{cpqItems.length !== 1 ? "s" : ""}</span>
                  <span className="font-bold text-foreground">
                    Subtotal: {fmtMoney(cpqItems.reduce((s, i) => s + i.quantity * i.unitPrice * (1 - i.discount / 100), 0))}
                  </span>
                </div>
              )}

              {/* Footer */}
              <div className="px-4 py-3 border-t border-border flex items-center justify-between shrink-0 bg-muted/20">
                <Button variant="outline" size="sm" onClick={() => setCpqStep(1)} className="border-border">
                  ← Back to Selection
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCpqOpen(false)} className="border-border">Cancel</Button>
                  <Button size="sm" onClick={cpqAddToQuote} disabled={cpqItems.length === 0}
                    className="bg-primary hover:bg-primary/90 text-white">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add {cpqItems.length > 0 ? cpqItems.length : ""} to Quote
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* CPQ Launch Dialog */}
      <Dialog open={cpqLaunchOpen} onOpenChange={setCpqLaunchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-500" />
              Configure with CPQ
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-1">
            Choose how you want to build line items for <span className="font-semibold text-foreground">{quote?.name}</span>:
          </p>
          <div className="flex flex-col gap-3 mt-2">
            {[
              {
                href: `/cpq/guided-selling?quoteId=${quoteId}&from=quote`,
                icon: "🧭",
                title: "Guided Selling",
                desc: "Answer a few questions about your customer. The system recommends the best products and bundles automatically.",
                tag: "Best for new requirements",
                tagColor: "bg-blue-100 text-blue-700",
              },
              {
                href: `/cpq/configurator?quoteId=${quoteId}&from=quote`,
                icon: "⚙️",
                title: "Product Configurator",
                desc: "Pick a product and configure variants, deployment, support level, license count and duration with live pricing.",
                tag: "Best for known products",
                tagColor: "bg-purple-100 text-purple-700",
              },
              {
                href: `/cpq/qle/${quoteId}?from=quote`,
                icon: "📋",
                title: "Quote Line Editor",
                desc: "Open the full line item editor. Add or remove products, apply discounts, bulk-update quantities, and review totals.",
                tag: "Best for direct editing",
                tagColor: "bg-emerald-100 text-emerald-700",
              },
            ].map((opt) => (
              <a key={opt.href} href={opt.href} onClick={() => setCpqLaunchOpen(false)}>
                <div className="flex items-start gap-3 rounded-lg border border-border hover:border-primary hover:bg-muted/40 p-4 transition-all cursor-pointer group">
                  <span className="text-2xl shrink-0">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold group-hover:text-primary transition-colors">{opt.title}</p>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${opt.tagColor}`}>{opt.tag}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{opt.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                </div>
              </a>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

