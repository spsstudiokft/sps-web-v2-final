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
    title: "Admin VIP Credit",
    description: "Bonus VIP credit issued by SPS Studio management.",
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
      setError(err.message || "Failed to load referral program data");
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
        throw new Error(d.error || "Failed to update referral status");
      }

      await loadAllData();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
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
        throw new Error(d.error || "Failed to save tier");
      }

      setIsTierModalOpen(false);
      setEditingTier(null);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || "Failed to save tier");
    } finally {
      setSavingTier(false);
    }
  };

  // Tier Delete
  const handleDeleteTier = async (id: string) => {
    if (!confirm("Are you sure you want to delete this referral tier?")) return;

    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch(`/api/admin/referrals/tiers/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to delete tier");
      }

      await loadAllData();
    } catch (err: any) {
      alert(err.message || "Failed to delete tier");
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
        throw new Error(d.error || "Failed to save program settings");
      }

      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  // Manual Reward Issue
  const handleIssueManualReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRewardModal.userId) {
      alert("User ID is required");
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
        throw new Error(d.error || "Failed to issue reward");
      }

      setManualRewardModal(prev => ({ ...prev, isOpen: false }));
      await loadAllData();
      alert("Reward voucher issued successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to issue reward");
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
        throw new Error(d.error || "Failed to update voucher status");
      }

      await loadAllData();
    } catch (err: any) {
      alert(err.message || "Failed to update voucher");
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
        <p className="text-sm text-muted-text font-medium">Loading Referral Management...</p>
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
              VIP Tiered Referral Program
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-text mt-1">
            Manage VIP membership tiers, automate referral rewards, track client invite networks, and issue credits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadAllData}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
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
            <span>Add New Tier</span>
          </Button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-text font-medium">Total Referrals Logged</p>
                <h3 className="text-2xl font-bold text-text font-mono mt-1">{stats.total_referrals}</h3>
                <p className="text-[11px] text-muted-text mt-0.5">{stats.pending_referrals} pending first shoot</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-text font-medium">Successful Conversions</p>
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
                <p className="text-xs text-muted-text font-medium">Referred Revenue</p>
                <h3 className="text-2xl font-bold text-text font-mono mt-1">
                  {formatMoney(stats.total_conversion_value)}
                </h3>
                <p className="text-[11px] text-muted-text mt-0.5">From converted client bookings</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-text font-medium">Rewards & Credits Issued</p>
                <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono mt-1">
                  {stats.total_rewards_issued}
                </h3>
                <p className="text-[11px] text-amber-600 font-medium mt-0.5">
                  {stats.active_referrers_count} active VIP advocates
                </p>
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
            <span>Overview & Top Referrers</span>
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
            <span>Referrals Log ({referrals.length})</span>
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
            <span>VIP Tiers ({tiers.length})</span>
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
            <span>Issued Rewards & Vouchers ({rewards.length})</span>
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
            <span>Program Settings</span>
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
                  <span>Top Client Advocates Leaderboard</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Clients who generate the highest volume of referral bookings and revenue.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {stats.top_referrers.length === 0 ? (
                  <div className="p-6 text-center text-muted-text text-xs">
                    No converted referrals yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-text uppercase text-[10px] font-semibold tracking-wider">
                          <th className="pb-2 px-2">Rank & Advocate</th>
                          <th className="pb-2 px-2">Current Tier</th>
                          <th className="pb-2 px-2 text-center">Successful Invites</th>
                          <th className="pb-2 px-2 text-right">Referred Revenue</th>
                          <th className="pb-2 px-2 text-right">Actions</th>
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
                                <span>Issue Bonus</span>
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
                  <span>Program Quick Rules</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Current automated validation rules.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-3.5 text-xs">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-text font-medium">Program Status</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                      settings?.is_enabled 
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-red-500/15 text-red-600"
                    }`}>
                      {settings?.is_enabled ? "Active" : "Paused"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-text font-medium">Referee Reward</span>
                    <span className="font-semibold text-text">
                      {settings?.referee_reward_type === "discount_percent" 
                        ? `${settings?.referee_reward_value}% OFF` 
                        : `${formatMoney(settings?.referee_reward_value || 0, settings?.currency)} Credit`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-text font-medium">Trigger Event</span>
                    <span className="font-semibold text-text uppercase text-[10px]">
                      {settings?.referral_trigger === "on_first_paid_invoice" ? "First Paid Invoice" : "Registration"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-text font-medium">Min Qualifying Invoice</span>
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
                    <span>Adjust Program Settings</span>
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
                placeholder="Search advocate, referee, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-text font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-1.5 px-2.5 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Statuses ({referrals.length})</option>
                <option value="converted">Converted</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="fraud_suspected">Under Review / Fraud</option>
              </select>
            </div>
          </div>

          {/* Referrals Table */}
          <Card className="border-border shadow-xs">
            <CardContent className="p-0">
              {filteredReferrals.length === 0 ? (
                <div className="p-12 text-center text-muted-text text-xs space-y-2">
                  <Users className="w-8 h-8 mx-auto opacity-40" />
                  <p>No referral relationships found matching your filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/20 text-muted-text uppercase text-[10px] font-semibold tracking-wider">
                        <th className="py-3 px-4">Referrer (Advocate)</th>
                        <th className="py-3 px-4">Referee (Invited Client)</th>
                        <th className="py-3 px-4">Referral Code</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Conversion Value</th>
                        <th className="py-3 px-4">Invited / Converted Date</th>
                        <th className="py-3 px-4 text-right">Actions</th>
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
                                <CheckCircle2 className="w-3 h-3" /> Converted
                              </span>
                            )}
                            {r.status === "pending" && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold text-[10px] flex items-center gap-1 w-fit">
                                <Clock className="w-3 h-3" /> Pending Booking
                              </span>
                            )}
                            {r.status === "rejected" && (
                              <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 font-semibold text-[10px] w-fit">
                                Rejected
                              </span>
                            )}
                            {r.status === "fraud_suspected" && (
                              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-700 dark:text-red-300 font-semibold text-[10px] flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3" /> Fraud Suspected
                              </span>
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
                                  title="Manually Convert & Issue Rewards"
                                >
                                  Convert
                                </button>
                              )}
                              {r.status !== "rejected" && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateReferralStatus(r.id, "rejected")}
                                  className="p-1 px-2 text-[11px] rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 font-medium transition-colors"
                                  title="Mark as Rejected / Invalid"
                                >
                                  Reject
                                </button>
                              )}
                              {r.status !== "fraud_suspected" && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateReferralStatus(r.id, "fraud_suspected")}
                                  className="p-1 px-1.5 text-[11px] rounded bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 font-medium transition-colors"
                                  title="Flag for Fraud Review"
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
              <h2 className="text-base font-bold text-text">Referral VIP Tiers</h2>
              <p className="text-xs text-muted-text">
                Clients progress through tiers as their invited network completes bookings with SPS Studio.
              </p>
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
              <span>Create Tier</span>
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
                        title="Edit Tier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTier(tier.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-text hover:text-red-600 transition-colors"
                        title="Delete Tier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-text">Min Successful Referrals:</span>
                      <span className="font-mono font-bold text-text">{tier.min_referrals}</span>
                    </div>
                    {tier.min_referred_revenue > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-text">Min Referred Revenue:</span>
                        <span className="font-mono font-semibold text-text">
                          {formatMoney(tier.min_referred_revenue)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-text">Reward per Referral:</span>
                      <span className="font-semibold text-emerald-600 font-mono">
                        {tier.reward_type === "discount_percent" 
                          ? `${tier.reward_value}% OFF` 
                          : `${formatMoney(tier.reward_value, settings?.currency)} Credit`}
                      </span>
                    </div>
                  </div>

                  {tier.perks && tier.perks.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-semibold text-text uppercase tracking-wider">Perks & Privileges:</div>
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
              <h2 className="text-base font-bold text-text">Issued Rewards & Voucher Audit</h2>
              <p className="text-xs text-muted-text">
                All reward vouchers, client discounts, and referral credits generated by the system.
              </p>
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
              <span>Issue Manual Reward</span>
            </Button>
          </div>

          <Card className="border-border shadow-xs">
            <CardContent className="p-0">
              {rewards.length === 0 ? (
                <div className="p-12 text-center text-muted-text text-xs space-y-2">
                  <Gift className="w-8 h-8 mx-auto opacity-40" />
                  <p>No rewards issued yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/20 text-muted-text uppercase text-[10px] font-semibold tracking-wider">
                        <th className="py-3 px-4">Client User</th>
                        <th className="py-3 px-4">Reward Title</th>
                        <th className="py-3 px-4">Voucher Code</th>
                        <th className="py-3 px-4">Type & Value</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Issued / Expires</th>
                        <th className="py-3 px-4 text-right">Actions</th>
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
                            <div>Issued: {rw.created_at ? new Date(rw.created_at).toLocaleDateString() : "—"}</div>
                            {rw.expires_at && <div>Exp: {new Date(rw.expires_at).toLocaleDateString()}</div>}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {rw.status === "available" && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRewardStatus(rw.id, "redeemed")}
                                  className="p-1 px-2 text-[11px] rounded bg-muted hover:bg-muted/80 text-text font-medium transition-colors"
                                  title="Mark Voucher as Redeemed on Invoice"
                                >
                                  Mark Redeemed
                                </button>
                              )}
                              {rw.status !== "revoked" && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRewardStatus(rw.id, "revoked")}
                                  className="p-1 px-2 text-[11px] rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 font-medium transition-colors"
                                  title="Revoke / Cancel Voucher"
                                >
                                  Revoke
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

      {/* TAB 5: PROGRAM SETTINGS */}
      {activeTab === "settings" && settings && (
        <Card className="border-border shadow-xs max-w-2xl">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              <span>Referral Program Configuration</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Configure trigger conditions, welcome discounts for referees, and fraud limits.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-0">
            <form onSubmit={handleSaveSettings} className="space-y-4">
              {settingsSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Program settings updated successfully!</span>
                </div>
              )}

              {/* Enable toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                <div>
                  <div className="text-xs font-semibold text-text">Enable Referral Program</div>
                  <div className="text-[11px] text-muted-text">
                    Allow clients to view their referral link, invite peers, and receive rewards.
                  </div>
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
                <Label className="text-xs font-medium">Referral & Store Credit Currency</Label>
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
                  The primary currency used for referral bonus vouchers, qualifying thresholds, and client store credit balances (e.g., HUF, USD, EUR).
                </p>
              </div>

              {/* Trigger Condition */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">When is a referral considered Converted?</Label>
                <select
                  value={settings.referral_trigger}
                  onChange={(e) => setSettings({ ...settings, referral_trigger: e.target.value as any })}
                  className="w-full p-2 text-xs rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="on_first_paid_invoice">On First Paid Invoice (Recommended)</option>
                  <option value="on_registration">On Client Registration (Instant)</option>
                </select>
                <p className="text-[11px] text-muted-text">
                  Requiring a paid invoice ensures you only issue referral rewards once real revenue is generated.
                </p>
              </div>

              {/* Min invoice amount */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Minimum Invoice Amount to Qualify ({getCurrencySymbol(settings.currency)})
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
                <div className="text-xs font-semibold text-text">Referee Welcome Reward (For New Client)</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-text">Reward Type</Label>
                    <select
                      value={settings.referee_reward_type}
                      onChange={(e) => setSettings({ ...settings, referee_reward_type: e.target.value as any })}
                      className="w-full p-2 text-xs rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="discount_percent">Percentage Discount (%)</option>
                      <option value="store_credit">Store Credit ({getCurrencySymbol(settings.currency)})</option>
                      <option value="fixed_discount">Fixed Amount Discount ({getCurrencySymbol(settings.currency)})</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-text">
                      Reward Value ({settings.referee_reward_type === "discount_percent" ? "%" : getCurrencySymbol(settings.currency)})
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
                <Label className="text-xs font-medium">Voucher Expiration (Days)</Label>
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
                    <span>Saving Settings...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Program Settings</span>
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
                <Label className="text-xs font-medium">Tier Name <span className="text-red-500">*</span></Label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Gold VIP Ambassador"
                  value={editingTier.name || ""}
                  onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Min Successful Referrals</Label>
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
                    Min Referred Revenue ({getCurrencySymbol(settings?.currency)})
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
                  <Label className="text-xs font-medium">Reward Type</Label>
                  <select
                    value={editingTier.reward_type || "store_credit"}
                    onChange={(e) => setEditingTier({ ...editingTier, reward_type: e.target.value as any })}
                    className="w-full p-2 text-xs rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="store_credit">Store Credit ({getCurrencySymbol(settings?.currency)})</option>
                    <option value="discount_percent">Discount Percentage (%)</option>
                    <option value="fixed_discount">Fixed Discount ({getCurrencySymbol(settings?.currency)})</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Reward Value ({editingTier.reward_type === "discount_percent" ? "%" : getCurrencySymbol(settings?.currency)})
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
                <Label className="text-xs font-medium">Reward Description</Label>
                <Input
                  type="text"
                  placeholder="e.g. $50 Store Credit per booking"
                  value={editingTier.reward_description || ""}
                  onChange={(e) => setEditingTier({ ...editingTier, reward_description: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Badge Color (Hex)</Label>
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
                  <Label className="text-xs font-medium">Icon</Label>
                  <select
                    value={editingTier.icon || "award"}
                    onChange={(e) => setEditingTier({ ...editingTier, icon: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="award">Award</option>
                    <option value="star">Star</option>
                    <option value="shield">Shield</option>
                    <option value="trophy">Trophy</option>
                    <option value="crown">Crown</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Perks (1 per line)</Label>
                <textarea
                  rows={3}
                  value={editingTier.perks?.join("\n") || ""}
                  onChange={(e) => setEditingTier({
                    ...editingTier,
                    perks: e.target.value.split("\n").filter(p => p.trim().length > 0)
                  })}
                  placeholder="VIP Priority Turnaround&#10;Complimentary Drone Shoot Upgrade"
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={savingTier}
                  className="gap-1.5"
                >
                  {savingTier ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  <span>Save Tier</span>
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
                <h3 className="font-bold text-sm text-text">Issue Custom VIP Reward Voucher</h3>
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
                    <div className="text-[11px] text-muted-text">Crediting User:</div>
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
                    Change Client
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      Select Client from Database <span className="text-red-500">*</span>
                    </Label>
                    <span className="text-[10px] text-muted-text font-mono">
                      {clientList.length} registered client{clientList.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {clientList.length > 5 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-text pointer-events-none" />
                      <Input
                        type="text"
                        placeholder="Search client by name, email, or code..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="pl-8 text-xs h-8"
                      />
                    </div>
                  )}

                  {loadingClients ? (
                    <div className="p-3 text-center text-xs text-muted-text flex items-center justify-center gap-2 bg-muted/30 rounded-lg">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      <span>Fetching clients from database...</span>
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
                      <option value="">-- Choose a registered client ({clientList.length} available) --</option>
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
                  <Label className="text-xs font-medium">Reward Type</Label>
                  <select
                    value={manualRewardModal.rewardType}
                    onChange={(e) => setManualRewardModal({ ...manualRewardModal, rewardType: e.target.value as any })}
                    className="w-full p-2 text-xs rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="store_credit">Store Credit ({getCurrencySymbol(manualRewardModal.currency || settings?.currency)})</option>
                    <option value="discount_percent">Discount Percentage (%)</option>
                    <option value="fixed_discount">Fixed Discount ({getCurrencySymbol(manualRewardModal.currency || settings?.currency)})</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Value ({manualRewardModal.rewardType === "discount_percent" ? "%" : getCurrencySymbol(manualRewardModal.currency || settings?.currency)})
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
                <Label className="text-xs font-medium">Currency</Label>
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
                <Label className="text-xs font-medium">Voucher Title</Label>
                <Input
                  type="text"
                  required
                  value={manualRewardModal.title}
                  onChange={(e) => setManualRewardModal({ ...manualRewardModal, title: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Description</Label>
                <Input
                  type="text"
                  value={manualRewardModal.description}
                  onChange={(e) => setManualRewardModal({ ...manualRewardModal, description: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Expires In (Days)</Label>
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={issuingReward}
                  className="gap-1.5"
                >
                  {issuingReward ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gift className="w-3 h-3" />}
                  <span>Issue Voucher</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
