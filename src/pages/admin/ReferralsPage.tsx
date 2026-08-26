import { useLanguage } from "../../contexts/LanguageContext";
import React, { useState, useEffect, useCallback } from "react";
import { 
  Gift, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Award, 
  Shield, 
  Star, 
  Trophy, 
  Crown, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Settings, 
  Search, 
  Filter, 
  RefreshCw, 
  Loader2, 
  ChevronRight, 
  AlertCircle,
  Tag,
  Copy,
  Sliders,
  Sparkles,
  ArrowUpRight
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { 
  ReferralTier, 
  ClientReferral, 
  ReferralReward, 
  ReferralProgramSettings, 
  AdminReferralStats 
} from "../../lib/types";
import { 
  SUPPORTED_CURRENCIES, 
  getCurrencySymbol, 
  formatCurrency 
} from "../../lib/currency";

export default function ReferralsPage() {
  const { tUi } = useLanguage();
  const [activeTab, setActiveTab] = useState<"overview" | "referrals" | "tiers" | "rewards" | "settings">("overview");
  
  // Data states
  const [stats, setStats] = useState<AdminReferralStats | null>(null);
  const [referrals, setReferrals] = useState<ClientReferral[]>([]);
  const [tiers, setTiers] = useState<ReferralTier[]>([]);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [settings, setSettings] = useState<ReferralProgramSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & search
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states for Tier editing/creation
  const [editingTier, setEditingTier] = useState<Partial<ReferralTier> | null>(null);
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [savingTier, setSavingTier] = useState(false);

  // Modal for Manual Reward issuance
  const [manualRewardModal, setManualRewardModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    rewardType: "store_credit" | "discount_percent" | "fixed_discount";
    rewardValue: number;
    currency: string;
    title: string;
    description: string;
    expiresInDays: number;
  }>({
    isOpen: false,
    userId: "",
    userName: "",
    rewardType: "store_credit",
    rewardValue: 25,
    currency: "USD",
    title: tUi("admin.referrals.runtime.default_reward_title"),
    description: tUi("admin.referrals.runtime.default_reward_description"),
    expiresInDays: 90
  });
  const [issuingReward, setIssuingReward] = useState(false);
  const [clientList, setClientList] = useState<Array<{
    id: string;
    name: string;
    email: string;
    customer_name?: string;
    referral_code?: string;
    referral_credits?: number;
    tier_name?: string;
    tier_color?: string;
  }>>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientSearch, setClientSearch] = useState("");

  const fetchClientList = useCallback(async () => {
    setLoadingClients(true);
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch("/api/admin/referrals/clients", { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setClientList(data);
        }
      }
    } catch (e) {
      console.error("Failed to fetch clients list:", e);
    } finally {
      setLoadingClients(false);
    }
  }, []);

  // Settings save state
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [statsRes, refsRes, tiersRes, rewardsRes, settingsRes, clientsRes] = await Promise.all([
        fetch("/api/admin/referrals/stats", { headers }),
        fetch("/api/admin/referrals/list", { headers }),
        fetch("/api/admin/referrals/tiers", { headers }),
        fetch("/api/admin/referrals/rewards", { headers }),
        fetch("/api/admin/referrals/settings", { headers }),
        fetch("/api/admin/referrals/clients", { headers })
      ]);

      const parseSafe = async (res: Response) => {
        if (!res.ok) return null;
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      };

      const [statsData, refsData, tiersData, rewardsData, settingsData, clientsData] = await Promise.all([
        parseSafe(statsRes),
        parseSafe(refsRes),
        parseSafe(tiersRes),
        parseSafe(rewardsRes),
        parseSafe(settingsRes),
        parseSafe(clientsRes)
      ]);

      if (statsData) setStats(statsData);
      if (Array.isArray(refsData)) setReferrals(refsData);
      if (Array.isArray(tiersData)) setTiers(tiersData);
      if (Array.isArray(rewardsData)) setRewards(rewardsData);
      if (settingsData) setSettings(settingsData);
      if (Array.isArray(clientsData)) setClientList(clientsData);
    } catch (err: any) {
      console.error("Error loading referral admin data:", err);
      setError(err.message || tUi("admin.referrals.runtime.load_failed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handlers for Referral Status changes (Approve, Reject, Flag Fraud)
  const handleUpdateReferralStatus = async (id: string, status: "converted" | "rejected" | "fraud_suspected" | "pending") => {
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch(`/api/admin/referrals/relationships/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || tUi("admin.referrals.runtime.status_update_failed"));
      }

      await loadAllData();
    } catch (err: any) {
      alert(err.message || tUi("admin.referrals.runtime.status_update_failed"));
    }
  };

  // Tier Modal Save
  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier?.name) return;

    setSavingTier(true);
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const isEdit = Boolean(editingTier.id);
      const url = isEdit ? `/api/admin/referrals/tiers/${editingTier.id}` : "/api/admin/referrals/tiers";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(editingTier)
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || tUi("admin.referrals.runtime.tier_save_failed"));
      }

      setIsTierModalOpen(false);
      setEditingTier(null);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || tUi("admin.referrals.runtime.tier_save_failed"));
    } finally {
      setSavingTier(false);
    }
  };

  // Tier Delete
  const handleDeleteTier = async (id: string) => {
    if (!confirm(tUi("admin.referrals.runtime.tier_delete_confirm"))) return;

    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch(`/api/admin/referrals/tiers/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || tUi("admin.referrals.runtime.tier_delete_failed"));
      }

      await loadAllData();
    } catch (err: any) {
      alert(err.message || tUi("admin.referrals.runtime.tier_delete_failed"));
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSavingSettings(true);
    setSettingsSuccess(false);
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch("/api/admin/referrals/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(settings)
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || tUi("admin.referrals.runtime.settings_save_failed"));
      }

      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || tUi("admin.referrals.runtime.settings_save_failed"));
    } finally {
      setSavingSettings(false);
    }
  };

  // Manual Reward Issue
  const handleIssueManualReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRewardModal.userId) {
      alert(tUi("admin.referrals.runtime.user_required"));
      return;
    }

    setIssuingReward(true);
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch("/api/admin/referrals/rewards/issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          user_id: manualRewardModal.userId,
          reward_type: manualRewardModal.rewardType,
          reward_value: Number(manualRewardModal.rewardValue),
          currency: manualRewardModal.currency || settings?.currency || "USD",
          title: manualRewardModal.title,
          description: manualRewardModal.description,
          expires_in_days: Number(manualRewardModal.expiresInDays)
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || tUi("admin.referrals.runtime.reward_issue_failed"));
      }

      setManualRewardModal(prev => ({ ...prev, isOpen: false }));
      await loadAllData();
      alert(tUi("admin.referrals.runtime.reward_issued"));
    } catch (err: any) {
      alert(err.message || tUi("admin.referrals.runtime.reward_issue_failed"));
    } finally {
      setIssuingReward(false);
    }
  };

  // Update Reward Status (Redeem or Revoke)
  const handleUpdateRewardStatus = async (id: string, status: "redeemed" | "revoked" | "available") => {
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch(`/api/admin/referrals/rewards/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || tUi("admin.referrals.runtime.voucher_update_failed"));
      }

      await loadAllData();
    } catch (err: any) {
      alert(err.message || tUi("admin.referrals.runtime.voucher_update_failed"));
    }
  };

  const getTierIcon = (iconName: string) => {
    switch (iconName?.toLowerCase()) {
      case "crown": return <Crown className="w-4 h-4" />;
      case "trophy": return <Trophy className="w-4 h-4" />;
      case "star": return <Star className="w-4 h-4" />;
      case "shield": return <Shield className="w-4 h-4" />;
      case "award":
      default: return <Award className="w-4 h-4" />;
    }
  };

  const formatMoney = (amount: number, curr?: string) => {
    return formatCurrency(amount, curr || settings?.currency || "USD");
  };

  // Filtered referrals
  const filteredReferrals = referrals.filter(r => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesSearch = !searchQuery || 
      r.referrer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referrer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referee_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referral_code?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <div className="w-9 h-9 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-text font-medium">{tUi("admin.referrals.page.loading_referral_management")}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Gift className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-text font-heading">
              {tUi("admin.referrals.page.vip_tiered_referral_program")}</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-text mt-1">
            {tUi("admin.referrals.page.manage_vip_membership_tiers_automate_referral_rewards_")}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadAllData}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{tUi("admin.faq_categories.refresh")}</span>
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setEditingTier({
                name: "",
                min_referrals: 1,
                min_referred_revenue: 0,
                reward_type: "store_credit",
                reward_value: 25,
                reward_description: "$25 Credit per referral",
                badge_color: "#3B82F6",
                icon: "award",
                sort_order: tiers.length + 1,
                is_active: true,
                perks: ["VIP Booking Priority", "Exclusive Turnaround"]
              });
              setIsTierModalOpen(true);
            }}
            className="gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{tUi("admin.referrals.page.add_new_tier")}</span>
          </Button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-text font-medium">{tUi("admin.referrals.page.total_referrals_logged")}</p>
                <h3 className="text-2xl font-bold text-text font-mono mt-1">{stats.total_referrals}</h3>
                <p className="text-[11px] text-muted-text mt-0.5">{stats.pending_referrals} {tUi("admin.referrals.page.pending_first_shoot")}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-text font-medium">{tUi("admin.referrals.page.successful_conversions")}</p>
                <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                  {stats.converted_referrals}
                </h3>
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                  {stats.total_referrals > 0 
                    ? `${Math.round((stats.converted_referrals / stats.total_referrals) * 100)}% Conversion Rate`
                    : "0% Conversion Rate"
                  }
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-text font-medium">{tUi("admin.referrals.page.referred_revenue")}</p>
                <h3 className="text-2xl font-bold text-text font-mono mt-1">
                  {formatMoney(stats.total_conversion_value)}
                </h3>
                <p className="text-[11px] text-muted-text mt-0.5">{tUi("admin.referrals.page.from_converted_client_bookings")}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-text font-medium">{tUi("admin.referrals.page.rewards_credits_issued")}</p>
                <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono mt-1">
                  {stats.total_rewards_issued}
                </h3>
                <p className="text-[11px] text-amber-600 font-medium mt-0.5">
                  {stats.active_referrers_count} {tUi("admin.referrals.page.active_vip_advocates")}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-text hover:text-text"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>{tUi("admin.referrals.page.overview_top_referrers")}</span>
          </button>

          <button
            onClick={() => setActiveTab("referrals")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "referrals"
                ? "border-primary text-primary"
                : "border-transparent text-muted-text hover:text-text"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{tUi("admin.referrals.page.referrals_log")}{referrals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("tiers")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "tiers"
                ? "border-primary text-primary"
                : "border-transparent text-muted-text hover:text-text"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>{tUi("admin.referrals.page.vip_tiers")}{tiers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("rewards")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "rewards"
                ? "border-primary text-primary"
                : "border-transparent text-muted-text hover:text-text"
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>{tUi("admin.referrals.page.issued_rewards_vouchers")}{rewards.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "settings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-text hover:text-text"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{tUi("admin.referrals.page.program_settings")}</span>
          </button>
        </nav>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Advocates Leaderboard */}
            <Card className="lg:col-span-2 border-border shadow-xs">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>{tUi("admin.referrals.page.top_client_advocates_leaderboard")}</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {tUi("admin.referrals.page.clients_who_generate_the_highest_volume_of_referral_bo")}</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {stats.top_referrers.length === 0 ? (
                  <div className="p-6 text-center text-muted-text text-xs">
                    {tUi("admin.referrals.page.no_converted_referrals_yet")}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-text uppercase text-[10px] font-semibold tracking-wider">
                          <th className="pb-2 px-2">{tUi("admin.referrals.page.rank_advocate")}</th>
                          <th className="pb-2 px-2">{tUi("admin.referrals.page.current_tier")}</th>
                          <th className="pb-2 px-2 text-center">{tUi("admin.referrals.page.successful_invites")}</th>
                          <th className="pb-2 px-2 text-right">{tUi("admin.referrals.page.referred_revenue")}</th>
                          <th className="pb-2 px-2 text-right">{tUi("admin.clients.th_actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {stats.top_referrers.map((adv, idx) => (
                          <tr key={adv.user_id} className="hover:bg-muted/20">
                            <td className="py-2.5 px-2 font-medium text-text">
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  idx === 0 ? "bg-amber-500 text-white" :
                                  idx === 1 ? "bg-slate-400 text-white" :
                                  idx === 2 ? "bg-amber-700 text-white" : "bg-muted text-muted-text"
                                }`}>
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="font-semibold">{adv.name || adv.email}</div>
                                  <div className="text-[10px] text-muted-text font-mono">{adv.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-2">
                              <span 
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white inline-flex items-center gap-1"
                                style={{ backgroundColor: adv.tier_color || "#3B82F6" }}
                              >
                                {adv.tier_name}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-600">
                              {adv.referrals_count}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-semibold">
                              {formatMoney(adv.total_revenue)}
                            </td>
                            <td className="py-2.5 px-2 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setManualRewardModal({
                                    isOpen: true,
                                    userId: adv.user_id,
                                    userName: adv.name || adv.email,
                                    rewardType: "store_credit",
                                    rewardValue: 50,
                                    currency: settings?.currency || "USD",
                                    title: "VIP Advocate Bonus Credit",
                                    description: "Exclusive bonus reward for top referral performance.",
                                    expiresInDays: 90
                                  });
                                }}
                                className="text-[11px] h-7 gap-1"
                              >
                                <Gift className="w-3 h-3 text-primary" />
                                <span>{tUi("admin.referrals.page.issue_bonus")}</span>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions & Program Status */}
            <Card className="border-border shadow-xs">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  <span>{tUi("admin.referrals.page.program_quick_rules")}</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {tUi("admin.referrals.page.current_automated_validation_rules")}</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-3.5 text-xs">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-text font-medium">{tUi("admin.referrals.page.program_status")}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                      settings?.is_enabled 
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-red-500/15 text-red-600"
                    }`}>
                      {settings?.is_enabled ? "Active" : "Paused"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-text font-medium">{tUi("admin.referrals.page.referee_reward")}</span>
                    <span className="font-semibold text-text">
                      {settings?.referee_reward_type === "discount_percent" 
                        ? `${settings?.referee_reward_value}% OFF` 
                        : `${formatMoney(settings?.referee_reward_value || 0, settings?.currency)} Credit`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-text font-medium">{tUi("admin.referrals.page.trigger_event")}</span>
                    <span className="font-semibold text-text uppercase text-[10px]">
                      {settings?.referral_trigger === "on_first_paid_invoice" ? "First Paid Invoice" : "Registration"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-text font-medium">{tUi("admin.referrals.page.min_qualifying_invoice")}</span>
                    <span className="font-mono font-semibold text-text">
                      {formatMoney(settings?.min_invoice_amount_for_conversion || 0)}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("settings")}
                    className="w-full text-xs gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>{tUi("admin.referrals.page.adjust_program_settings")}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: REFERRALS LOG */}
      {activeTab === "referrals" && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-xl border border-border">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-muted-text absolute left-3 top-3" />
              <Input
                type="text"
                placeholder={tUi("admin.referrals.page.search_advocate_referee_code")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-text font-medium">{tUi("admin.projects.status_filter_label")}</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-1.5 px-2.5 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">{tUi("admin.referrals.page.all_statuses")}{referrals.length})</option>
                <option value="converted">{tUi("admin.referrals.page.converted")}</option>
                <option value="pending">{tUi("admin.team.status_pending")}</option>
                <option value="rejected">{tUi("admin.budget.stats.rejected")}</option>
                <option value="fraud_suspected">{tUi("admin.referrals.page.under_review_fraud")}</option>
              </select>
            </div>
          </div>

          {/* Referrals Table */}
          <Card className="border-border shadow-xs">
            <CardContent className="p-0">
              {filteredReferrals.length === 0 ? (
                <div className="p-12 text-center text-muted-text text-xs space-y-2">
                  <Users className="w-8 h-8 mx-auto opacity-40" />
                  <p>{tUi("admin.referrals.page.no_referral_relationships_found_matching_your_filter")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/20 text-muted-text uppercase text-[10px] font-semibold tracking-wider">
                        <th className="py-3 px-4">{tUi("admin.referrals.page.referrer_advocate")}</th>
                        <th className="py-3 px-4">{tUi("admin.referrals.page.referee_invited_client")}</th>
                        <th className="py-3 px-4">{tUi("admin.referrals.page.referral_code")}</th>
                        <th className="py-3 px-4">{tUi("admin.clients.th_status")}</th>
                        <th className="py-3 px-4">{tUi("admin.referrals.page.conversion_value")}</th>
                        <th className="py-3 px-4">{tUi("admin.referrals.page.invited_converted_date")}</th>
                        <th className="py-3 px-4 text-right">{tUi("admin.clients.th_actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredReferrals.map((r) => (
                        <tr key={r.id} className="hover:bg-muted/20">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-text">{r.referrer_name || r.referrer_email}</div>
                            <div className="text-[11px] text-muted-text font-mono">{r.referrer_email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-text">{r.referee_name || r.referee_email}</div>
                            <div className="text-[11px] text-muted-text font-mono">{r.referee_email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted border border-border/70">
                              {r.referral_code}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {r.status === "converted" && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px] flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" /> {tUi("admin.referrals.page.converted")}</span>
                            )}
                            {r.status === "pending" && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold text-[10px] flex items-center gap-1 w-fit">
                                <Clock className="w-3 h-3" /> {tUi("admin.referrals.page.pending_booking")}</span>
                            )}
                            {r.status === "rejected" && (
                              <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 font-semibold text-[10px] w-fit">
                                {tUi("admin.budget.stats.rejected")}</span>
                            )}
                            {r.status === "fraud_suspected" && (
                              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-700 dark:text-red-300 font-semibold text-[10px] flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3" /> {tUi("admin.referrals.page.fraud_suspected")}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium">
                            {r.conversion_value ? formatMoney(r.conversion_value) : "—"}
                          </td>
                          <td className="py-3 px-4 text-muted-text font-mono text-[11px]">
                            {r.converted_at 
                              ? new Date(r.converted_at).toLocaleDateString()
                              : r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"
                            }
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {r.status !== "converted" && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateReferralStatus(r.id, "converted")}
                                  className="p-1 px-2 text-[11px] rounded bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 font-medium transition-colors"
                                  title={tUi("admin.referrals.page.manually_convert_issue_rewards")}
                                >
                                  {tUi("admin.referrals.page.convert")}</button>
                              )}
                              {r.status !== "rejected" && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateReferralStatus(r.id, "rejected")}
                                  className="p-1 px-2 text-[11px] rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 font-medium transition-colors"
                                  title={tUi("admin.referrals.page.mark_as_rejected_invalid")}
                                >
                                  {tUi("admin.referrals.page.reject")}</button>
                              )}
                              {r.status !== "fraud_suspected" && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateReferralStatus(r.id, "fraud_suspected")}
                                  className="p-1 px-1.5 text-[11px] rounded bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 font-medium transition-colors"
                                  title={tUi("admin.referrals.page.flag_for_fraud_review")}
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: VIP TIERS CONFIGURATOR */}
      {activeTab === "tiers" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-text">{tUi("admin.referrals.page.referral_vip_tiers")}</h2>
              <p className="text-xs text-muted-text">
                {tUi("admin.referrals.page.clients_progress_through_tiers_as_their_invited_networ")}</p>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setEditingTier({
                  name: "",
                  min_referrals: tiers.length > 0 ? tiers[tiers.length - 1].min_referrals + 2 : 1,
                  min_referred_revenue: 0,
                  reward_type: "store_credit",
                  reward_value: 50,
                  reward_description: "$50 Credit per booking",
                  badge_color: "#8B5CF6",
                  icon: "trophy",
                  sort_order: tiers.length + 1,
                  is_active: true,
                  perks: ["VIP Booking Priority", "Exclusive Turnaround"]
                });
                setIsTierModalOpen(true);
              }}
              className="gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{tUi("admin.referrals.page.create_tier")}</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tiers.map((tier) => (
              <Card 
                key={tier.id} 
                className="border-border shadow-xs relative overflow-hidden flex flex-col justify-between"
              >
                <div 
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: tier.badge_color || "#3B82F6" }}
                />
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-2xs"
                        style={{ backgroundColor: tier.badge_color || "#3B82F6" }}
                      >
                        {getTierIcon(tier.icon)}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-text">{tier.name}</h3>
                        <div className="text-xs text-primary font-medium">{tier.reward_description}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTier(tier);
                          setIsTierModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-text hover:text-text transition-colors"
                        title={tUi("admin.referrals.page.edit_tier")}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTier(tier.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-text hover:text-red-600 transition-colors"
                        title={tUi("admin.referrals.page.delete_tier")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-text">{tUi("admin.referrals.page.min_successful_referrals")}</span>
                      <span className="font-mono font-bold text-text">{tier.min_referrals}</span>
                    </div>
                    {tier.min_referred_revenue > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-text">{tUi("admin.referrals.page.min_referred_revenue")}</span>
                        <span className="font-mono font-semibold text-text">
                          {formatMoney(tier.min_referred_revenue)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-text">{tUi("admin.referrals.page.reward_per_referral")}</span>
                      <span className="font-semibold text-emerald-600 font-mono">
                        {tier.reward_type === "discount_percent" 
                          ? `${tier.reward_value}% OFF` 
                          : `${formatMoney(tier.reward_value, settings?.currency)} Credit`}
                      </span>
                    </div>
                  </div>

                  {tier.perks && tier.perks.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-semibold text-text uppercase tracking-wider">{tUi("admin.referrals.page.perks_privileges")}</div>
                      <ul className="space-y-1 text-xs text-muted-text">
                        {tier.perks.map((p, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ISSUED REWARDS & VOUCHERS */}
      {activeTab === "rewards" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-text">{tUi("admin.referrals.page.issued_rewards_voucher_audit")}</h2>
              <p className="text-xs text-muted-text">
                {tUi("admin.referrals.page.all_reward_vouchers_client_discounts_and_referral_cred")}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setManualRewardModal({
                  isOpen: true,
                  userId: "",
                  userName: "",
                  rewardType: "store_credit",
                  rewardValue: 25,
                  currency: settings?.currency || "USD",
                  title: "Custom VIP Credit Voucher",
                  description: "Issued by SPS Studio administrator.",
                  expiresInDays: 90
                });
                if (clientList.length === 0) {
                  fetchClientList();
                }
              }}
              className="gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{tUi("admin.referrals.page.issue_manual_reward")}</span>
            </Button>
          </div>

          <Card className="border-border shadow-xs">
            <CardContent className="p-0">
              {rewards.length === 0 ? (
                <div className="p-12 text-center text-muted-text text-xs space-y-2">
                  <Gift className="w-8 h-8 mx-auto opacity-40" />
                  <p>{tUi("admin.referrals.page.no_rewards_issued_yet")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/20 text-muted-text uppercase text-[10px] font-semibold tracking-wider">
                        <th className="py-3 px-4">{tUi("admin.referrals.page.client_user")}</th>
                        <th className="py-3 px-4">{tUi("admin.referrals.page.reward_title")}</th>
                        <th className="py-3 px-4">{tUi("admin.referrals.page.voucher_code")}</th>
                        <th className="py-3 px-4">{tUi("admin.referrals.page.type_value")}</th>
                        <th className="py-3 px-4">{tUi("admin.clients.th_status")}</th>
                        <th className="py-3 px-4">{tUi("admin.referrals.page.issued_expires")}</th>
                        <th className="py-3 px-4 text-right">{tUi("admin.clients.th_actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {rewards.map((rw) => (
                        <tr key={rw.id} className="hover:bg-muted/20">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-text">{rw.user_name || rw.user_email}</div>
                            <div className="text-[11px] text-muted-text font-mono">{rw.user_email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-text">{rw.title}</div>
                            <div className="text-[11px] text-muted-text">{rw.description}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted border border-border">
                              {rw.voucher_code}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-emerald-600">
                            {rw.reward_type === "discount_percent" 
                              ? `${rw.reward_value}% OFF` 
                              : formatMoney(rw.reward_value, rw.currency || settings?.currency)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase ${
                              rw.status === "available"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : rw.status === "redeemed"
                                  ? "bg-muted text-muted-text"
                                  : "bg-red-500/15 text-red-600"
                            }`}>
                              {rw.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted-text font-mono text-[11px]">
                            <div>{tUi("admin.referrals.page.issued")}{rw.created_at ? new Date(rw.created_at).toLocaleDateString() : "—"}</div>
                            {rw.expires_at && <div>{tUi("admin.referrals.page.exp")}{new Date(rw.expires_at).toLocaleDateString()}</div>}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {rw.status === "available" && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRewardStatus(rw.id, "redeemed")}
                                  className="p-1 px-2 text-[11px] rounded bg-muted hover:bg-muted/80 text-text font-medium transition-colors"
                                  title={tUi("admin.referrals.page.mark_voucher_as_redeemed_on_invoice")}
                                >
                                  {tUi("admin.referrals.page.mark_redeemed")}</button>
                              )}
                              {rw.status !== "revoked" && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRewardStatus(rw.id, "revoked")}
                                  className="p-1 px-2 text-[11px] rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 font-medium transition-colors"
                                  title={tUi("admin.referrals.page.revoke_cancel_voucher")}
                                >
                                  {tUi("admin.referrals.page.revoke")}</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: PROGRAM SETTINGS */}
      {activeTab === "settings" && settings && (
        <Card className="border-border shadow-xs max-w-2xl">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              <span>{tUi("admin.referrals.page.referral_program_configuration")}</span>
            </CardTitle>
            <CardDescription className="text-xs">
              {tUi("admin.referrals.page.configure_trigger_conditions_welcome_discounts_for_ref")}</CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-0">
            <form onSubmit={handleSaveSettings} className="space-y-4">
              {settingsSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{tUi("admin.referrals.page.program_settings_updated_successfully")}</span>
                </div>
              )}

              {/* Enable toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                <div>
                  <div className="text-xs font-semibold text-text">{tUi("admin.referrals.page.enable_referral_program")}</div>
                  <div className="text-[11px] text-muted-text">
                    {tUi("admin.referrals.page.allow_clients_to_view_their_referral_link_invite_peers")}</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.is_enabled}
                  onChange={(e) => setSettings({ ...settings, is_enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              {/* Program Currency */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{tUi("admin.referrals.page.referral_store_credit_currency")}</Label>
                <select
                  value={settings.currency || "USD"}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-text">
                  {tUi("admin.referrals.page.the_primary_currency_used_for_referral_bonus_vouchers_")}</p>
              </div>

              {/* Trigger Condition */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{tUi("admin.referrals.page.when_is_a_referral_considered_converted")}</Label>
                <select
                  value={settings.referral_trigger}
                  onChange={(e) => setSettings({ ...settings, referral_trigger: e.target.value as any })}
                  className="w-full p-2 text-xs rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="on_first_paid_invoice">{tUi("admin.referrals.page.on_first_paid_invoice_recommended")}</option>
                  <option value="on_registration">{tUi("admin.referrals.page.on_client_registration_instant")}</option>
                </select>
                <p className="text-[11px] text-muted-text">
                  {tUi("admin.referrals.page.requiring_a_paid_invoice_ensures_you_only_issue_referr")}</p>
              </div>

              {/* Min invoice amount */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {tUi("admin.referrals.page.minimum_invoice_amount_to_qualify")}{getCurrencySymbol(settings.currency)})
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={settings.min_invoice_amount_for_conversion}
                  onChange={(e) => setSettings({ ...settings, min_invoice_amount_for_conversion: Number(e.target.value) })}
                  className="text-xs"
                />
              </div>

              {/* Referee welcome reward */}
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-3">
                <div className="text-xs font-semibold text-text">{tUi("admin.referrals.page.referee_welcome_reward_for_new_client")}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-text">{tUi("admin.referrals.page.reward_type")}</Label>
                    <select
                      value={settings.referee_reward_type}
                      onChange={(e) => setSettings({ ...settings, referee_reward_type: e.target.value as any })}
                      className="w-full p-2 text-xs rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="discount_percent">{tUi("admin.referrals.page.percentage_discount")}</option>
                      <option value="store_credit">{tUi("admin.referrals.page.store_credit")}{getCurrencySymbol(settings.currency)})</option>
                      <option value="fixed_discount">{tUi("admin.referrals.page.fixed_amount_discount")}{getCurrencySymbol(settings.currency)})</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-text">
                      {tUi("admin.referrals.page.reward_value")}{settings.referee_reward_type === "discount_percent" ? "%" : getCurrencySymbol(settings.currency)})
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={settings.referee_reward_value}
                      onChange={(e) => setSettings({ ...settings, referee_reward_value: Number(e.target.value) })}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Expiration days */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{tUi("admin.referrals.page.voucher_expiration_days")}</Label>
                <Input
                  type="number"
                  min="7"
                  max="365"
                  value={settings.reward_expiry_days}
                  onChange={(e) => setSettings({ ...settings, reward_expiry_days: Number(e.target.value) })}
                  className="text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={savingSettings}
                className="w-full text-xs gap-2"
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{tUi("admin.settings.saving_settings")}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{tUi("admin.referrals.page.save_program_settings")}</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* MODAL: Edit / Create Tier */}
      {isTierModalOpen && editingTier && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-text">
                  {editingTier.id ? "Edit Referral Tier" : "Create New Referral Tier"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTierModalOpen(false)}
                className="p-1 rounded-lg text-muted-text hover:text-text hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTier} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <Label className="text-xs font-medium">{tUi("admin.referrals.page.tier_name")}<span className="text-red-500">*</span></Label>
                <Input
                  type="text"
                  required
                  placeholder={tUi("admin.referrals.page.e_g_gold_vip_ambassador")}
                  value={editingTier.name || ""}
                  onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tUi("admin.referrals.page.min_successful_referrals_2")}</Label>
                  <Input
                    type="number"
                    min="0"
                    required
                    value={editingTier.min_referrals ?? 1}
                    onChange={(e) => setEditingTier({ ...editingTier, min_referrals: Number(e.target.value) })}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    {tUi("admin.referrals.page.min_referred_revenue_2")}{getCurrencySymbol(settings?.currency)})
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingTier.min_referred_revenue ?? 0}
                    onChange={(e) => setEditingTier({ ...editingTier, min_referred_revenue: Number(e.target.value) })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tUi("admin.referrals.page.reward_type")}</Label>
                  <select
                    value={editingTier.reward_type || "store_credit"}
                    onChange={(e) => setEditingTier({ ...editingTier, reward_type: e.target.value as any })}
                    className="w-full p-2 text-xs rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="store_credit">{tUi("admin.referrals.page.store_credit")}{getCurrencySymbol(settings?.currency)})</option>
                    <option value="discount_percent">{tUi("admin.referrals.page.discount_percentage")}</option>
                    <option value="fixed_discount">{tUi("admin.referrals.page.fixed_discount")}{getCurrencySymbol(settings?.currency)})</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    {tUi("admin.referrals.page.reward_value")}{editingTier.reward_type === "discount_percent" ? "%" : getCurrencySymbol(settings?.currency)})
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={editingTier.reward_value ?? 25}
                    onChange={(e) => setEditingTier({ ...editingTier, reward_value: Number(e.target.value) })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tUi("admin.referrals.page.reward_description")}</Label>
                <Input
                  type="text"
                  placeholder={tUi("admin.referrals.page.e_g_50_store_credit_per_booking")}
                  value={editingTier.reward_description || ""}
                  onChange={(e) => setEditingTier({ ...editingTier, reward_description: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tUi("admin.referrals.page.badge_color_hex")}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingTier.badge_color || "#3B82F6"}
                      onChange={(e) => setEditingTier({ ...editingTier, badge_color: e.target.value })}
                      className="w-8 h-8 rounded-lg border border-border cursor-pointer p-0"
                    />
                    <Input
                      type="text"
                      value={editingTier.badge_color || "#3B82F6"}
                      onChange={(e) => setEditingTier({ ...editingTier, badge_color: e.target.value })}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tUi("admin.services.icon")}</Label>
                  <select
                    value={editingTier.icon || "award"}
                    onChange={(e) => setEditingTier({ ...editingTier, icon: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="award">{tUi("admin.referrals.page.award")}</option>
                    <option value="star">{tUi("admin.referrals.page.star")}</option>
                    <option value="shield">{tUi("admin.referrals.page.shield")}</option>
                    <option value="trophy">{tUi("admin.referrals.page.trophy")}</option>
                    <option value="crown">{tUi("admin.referrals.page.crown")}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tUi("admin.referrals.page.perks_1_per_line")}</Label>
                <textarea
                  rows={3}
                  value={editingTier.perks?.join("\n") || ""}
                  onChange={(e) => setEditingTier({
                    ...editingTier,
                    perks: e.target.value.split("\n").filter(p => p.trim().length > 0)
                  })}
                  placeholder={tUi("admin.referrals.page.vip_priority_turnaround_10_complimentary_drone_shoot_u")}
                  className="w-full p-2 text-xs rounded-md border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTierModalOpen(false)}
                >
                  {tUi("admin.clients.cancel")}</Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={savingTier}
                  className="gap-1.5"
                >
                  {savingTier ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  <span>{tUi("admin.referrals.page.save_tier")}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Manual Reward Issue */}
      {manualRewardModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-text">{tUi("admin.referrals.page.issue_custom_vip_reward_voucher")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setManualRewardModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg text-muted-text hover:text-text hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleIssueManualReward} className="p-5 space-y-4">
              {manualRewardModal.userName ? (
                <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-muted-text">{tUi("admin.referrals.page.crediting_user")}</div>
                    <div className="text-xs font-bold text-text">{manualRewardModal.userName}</div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setManualRewardModal(prev => ({ ...prev, userId: "", userName: "" }));
                      if (clientList.length === 0) fetchClientList();
                    }}
                    className="text-[11px] h-7 text-primary hover:text-primary"
                  >
                    {tUi("admin.referrals.page.change_client")}</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      {tUi("admin.referrals.page.select_client_from_database")}<span className="text-red-500">*</span>
                    </Label>
                    <span className="text-[10px] text-muted-text font-mono">
                      {clientList.length} {tUi("admin.referrals.page.registered_client")}{clientList.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {clientList.length > 5 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-text pointer-events-none" />
                      <Input
                        type="text"
                        placeholder={tUi("admin.referrals.page.search_client_by_name_email_or_code")}
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="pl-8 text-xs h-8"
                      />
                    </div>
                  )}

                  {loadingClients ? (
                    <div className="p-3 text-center text-xs text-muted-text flex items-center justify-center gap-2 bg-muted/30 rounded-lg">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      <span>{tUi("admin.referrals.page.fetching_clients_from_database")}</span>
                    </div>
                  ) : (
                    <select
                      required
                      value={manualRewardModal.userId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const selectedClient = clientList.find(c => c.id === selectedId);
                        setManualRewardModal(prev => ({
                          ...prev,
                          userId: selectedId,
                          userName: selectedClient ? (selectedClient.name || selectedClient.email) : ""
                        }));
                      }}
                      className="w-full p-2.5 text-xs rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    >
                      <option value="">{tUi("admin.referrals.page.choose_a_registered_client")}{clientList.length} {tUi("admin.referrals.page.available")}</option>
                      {clientList
                        .filter(c => {
                          if (!clientSearch) return true;
                          const q = clientSearch.toLowerCase();
                          return (
                            (c.name && c.name.toLowerCase().includes(q)) ||
                            (c.email && c.email.toLowerCase().includes(q)) ||
                            (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
                            (c.referral_code && c.referral_code.toLowerCase().includes(q))
                          );
                        })
                        .map((client) => {
                          const displayName = client.name || client.email;
                          const emailSuffix = client.name && client.name !== client.email ? ` (${client.email})` : "";
                          const tierSuffix = client.tier_name ? ` • Tier: ${client.tier_name}` : "";
                          const creditSuffix = client.referral_credits !== undefined && client.referral_credits > 0 
                            ? ` • ${formatMoney(client.referral_credits, settings?.currency)} Credits` 
                            : "";
                          return (
                            <option key={client.id} value={client.id}>
                              {displayName}{emailSuffix}{tierSuffix}{creditSuffix}
                            </option>
                          );
                        })}
                    </select>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tUi("admin.referrals.page.reward_type")}</Label>
                  <select
                    value={manualRewardModal.rewardType}
                    onChange={(e) => setManualRewardModal({ ...manualRewardModal, rewardType: e.target.value as any })}
                    className="w-full p-2 text-xs rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="store_credit">{tUi("admin.referrals.page.store_credit")}{getCurrencySymbol(manualRewardModal.currency || settings?.currency)})</option>
                    <option value="discount_percent">{tUi("admin.referrals.page.discount_percentage")}</option>
                    <option value="fixed_discount">{tUi("admin.referrals.page.fixed_discount")}{getCurrencySymbol(manualRewardModal.currency || settings?.currency)})</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    {tUi("admin.referrals.page.value")}{manualRewardModal.rewardType === "discount_percent" ? "%" : getCurrencySymbol(manualRewardModal.currency || settings?.currency)})
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={manualRewardModal.rewardValue}
                    onChange={(e) => setManualRewardModal({ ...manualRewardModal, rewardValue: Number(e.target.value) })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tUi("admin.extra_services.field_currency")}</Label>
                <select
                  value={manualRewardModal.currency || settings?.currency || "USD"}
                  onChange={(e) => setManualRewardModal({ ...manualRewardModal, currency: e.target.value })}
                  className="w-full p-2 text-xs rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tUi("admin.referrals.page.voucher_title")}</Label>
                <Input
                  type="text"
                  required
                  value={manualRewardModal.title}
                  onChange={(e) => setManualRewardModal({ ...manualRewardModal, title: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tUi("admin.portfolio_form.description")}</Label>
                <Input
                  type="text"
                  value={manualRewardModal.description}
                  onChange={(e) => setManualRewardModal({ ...manualRewardModal, description: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tUi("admin.referrals.page.expires_in_days")}</Label>
                <Input
                  type="number"
                  min="7"
                  value={manualRewardModal.expiresInDays}
                  onChange={(e) => setManualRewardModal({ ...manualRewardModal, expiresInDays: Number(e.target.value) })}
                  className="text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setManualRewardModal(prev => ({ ...prev, isOpen: false }))}
                >
                  {tUi("admin.clients.cancel")}</Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={issuingReward}
                  className="gap-1.5"
                >
                  {issuingReward ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gift className="w-3 h-3" />}
                  <span>{tUi("admin.referrals.page.issue_voucher")}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
