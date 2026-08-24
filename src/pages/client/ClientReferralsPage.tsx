import React, { useState, useEffect } from "react";
import { 
  Gift, 
  Share2, 
  Copy, 
  Check, 
  Mail, 
  Award, 
  Shield, 
  Star, 
  Trophy, 
  Crown, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Send, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  ChevronRight,
  Info,
  Users
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { ClientReferralProfile, ReferralTier } from "../../lib/types";
import { formatCurrency } from "../../lib/currency";
import { useLanguage } from "../../contexts/LanguageContext";
import { useApi } from "../../hooks/useApi";

export default function ClientReferralsPage() {
  const { tUi } = useLanguage();
  const { fetchApi } = useApi();
  const [profile, setProfile] = useState<ClientReferralProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Copy states
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null);

  // Email invite form states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi("/api/client/referrals/profile");
      if (!res.ok) {
        let errMsg = "Failed to load referral details";
        try {
          const d = await res.json();
          if (d.error) errMsg = d.error;
        } catch {}
        throw new Error(errMsg);
      }
      const data = await res.json();
      setProfile(data);
    } catch (err: any) {
      console.error("Error loading referral profile:", err);
      setError(err.message || "Failed to load referral profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!profile?.referral_link) return;
    navigator.clipboard.writeText(profile.referral_link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (!profile?.referral_code) return;
    navigator.clipboard.writeText(profile.referral_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyVoucher = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedVoucher(code);
    setTimeout(() => setCopiedVoucher(null), 2000);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes("@")) {
      setInviteError("Please enter a valid email address");
      return;
    }

    setSendingInvite(true);
    setInviteSuccess(null);
    setInviteError(null);

    try {
      const res = await fetchApi("/api/client/referrals/invite-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          recipient_email: inviteEmail.trim(),
          recipient_name: inviteName.trim() || undefined,
          custom_message: inviteMessage.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      setInviteSuccess(data.message || `Invitation successfully sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteName("");
      setInviteMessage("");
    } catch (err: any) {
      setInviteError(err.message || "Failed to send invitation");
    } finally {
      setSendingInvite(false);
    }
  };

  const getTierIcon = (iconName: string) => {
    switch (iconName?.toLowerCase()) {
      case "crown": return <Crown className="w-5 h-5" />;
      case "trophy": return <Trophy className="w-5 h-5" />;
      case "star": return <Star className="w-5 h-5" />;
      case "shield": return <Shield className="w-5 h-5" />;
      case "award":
      default: return <Award className="w-5 h-5" />;
    }
  };

  const formatMoney = (amount: number, curr?: string) => {
    return formatCurrency(amount, curr || profile?.currency || "USD");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <div className="w-9 h-9 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-text font-medium">{tUi("client.referrals.loading")}</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-text">{tUi("client.referrals.load_failed")}</h2>
        <p className="text-xs text-muted-text">{error || "Please try again later."}</p>
        <Button onClick={fetchProfile} variant="outline" size="sm">
          {tUi("client.common.retry")}
        </Button>
      </div>
    );
  }

  const { current_tier, next_tier, all_tiers, rewards, recent_referrals } = profile;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-text font-heading">
              VIP Referral & Rewards
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-text mt-1">
            Invite fellow realtors & business partners. Unlock tiered studio perks, exclusive discounts, and earn booking credits.
          </p>
        </div>

        {/* Available Credits Badge */}
        <div className="flex items-center gap-3 bg-surface border border-border p-2.5 px-4 rounded-xl shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-muted-text font-medium">{tUi("client.referrals.available_credits")}</div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatMoney(profile.available_credits)}
            </div>
          </div>
        </div>
      </div>

      {/* Tier Status Hero Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Tier & Progress */}
        <Card className="lg:col-span-2 border-border shadow-xs overflow-hidden relative">
          <div 
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{ backgroundColor: current_tier.badge_color || "#3B82F6" }}
          />
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0"
                  style={{ backgroundColor: current_tier.badge_color || "#3B82F6" }}
                >
                  {getTierIcon(current_tier.icon)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-text font-heading">{current_tier.name}</h2>
                    <span 
                      className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: current_tier.badge_color || "#3B82F6" }}
                    >
                      Active Tier
                    </span>
                  </div>
                  <p className="text-xs text-muted-text mt-0.5">
                    {current_tier.reward_description || "Exclusive VIP member privileges active."}
                  </p>
                </div>
              </div>

              {/* Stats pill */}
              <div className="flex items-center gap-4 bg-muted/40 p-2.5 px-4 rounded-xl border border-border/60">
                <div className="text-center">
                  <div className="text-xs text-muted-text">{tUi("client.referrals.invited")}</div>
                  <div className="text-sm font-bold text-text font-mono">{profile.total_referrals}</div>
                </div>
                <div className="w-px h-6 bg-border" />
                <div className="text-center">
                  <div className="text-xs text-muted-text">{tUi("client.referrals.successful")}</div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">{profile.successful_referrals}</div>
                </div>
                <div className="w-px h-6 bg-border" />
                <div className="text-center">
                  <div className="text-xs text-muted-text">{tUi("client.referrals.pending")}</div>
                  <div className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">{profile.pending_referrals}</div>
                </div>
              </div>
            </div>

            {/* Progress to Next Tier */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-text font-medium flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  {next_tier ? (
                    <span>{tUi("client.referrals.progress_to", { tier: next_tier.name })}</span>
                  ) : (
                    <span className="text-emerald-600 font-semibold">{tUi("client.referrals.max_status")}</span>
                  )}
                </span>
                <span className="font-mono text-xs font-semibold text-text">
                  {next_tier 
                    ? `${profile.successful_referrals} / ${next_tier.min_referrals} Successful Referrals`
                    : "100% Top Tier"
                  }
                </span>
              </div>

              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${profile.progress_percent}%`,
                    backgroundColor: next_tier?.badge_color || current_tier.badge_color || "#3B82F6" 
                  }}
                />
              </div>

              {next_tier && (
                <p className="text-[11px] text-muted-text">
                  Invite <strong>{profile.referrals_needed_for_next_tier} more</strong> qualified colleague{profile.referrals_needed_for_next_tier > 1 ? "s" : ""} to unlock {next_tier.name} status and earn {next_tier.reward_description}.
                </p>
              )}
            </div>

            {/* Current Tier Perks list */}
            {current_tier.perks && current_tier.perks.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-semibold text-text">{tUi("client.referrals.active_perks")}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {current_tier.perks.map((perk, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-muted-text">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Share Referral Link Card */}
        <Card className="border-border shadow-xs flex flex-col justify-between">
          <CardHeader className="p-5 pb-3 space-y-1">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary" />
              <span>{tUi("client.referrals.invite_link")}</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Share your link with colleagues. They get a <strong>{profile.program_settings?.referee_reward_type === "discount_percent" ? `${profile.program_settings.referee_reward_value}% welcome discount` : `${formatMoney(profile.program_settings?.referee_reward_value || 0, profile.currency)} welcome credit`}</strong> on signup.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-0 space-y-4">
            {/* Referral Code */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-text uppercase tracking-wider font-semibold">
                Your Referral Code
              </Label>
              <div className="flex items-center gap-2">
                <div className="p-2.5 px-3 rounded-lg bg-muted/60 border border-border font-mono font-bold text-sm tracking-wider text-text flex-1 text-center select-all">
                  {profile.referral_code}
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCopyCode}
                  className="gap-1.5 shrink-0"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? "Copied" : "Copy"}</span>
                </Button>
              </div>
            </div>

            {/* Referral URL */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-text uppercase tracking-wider font-semibold">
                Direct Registration Link
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={profile.referral_link}
                  className="text-xs font-mono select-all bg-muted/40"
                />
                <Button 
                  size="sm" 
                  variant="primary" 
                  onClick={handleCopyLink}
                  className="gap-1.5 shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                </Button>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div className="pt-2 border-t border-border/60">
              <div className="text-[11px] text-muted-text font-medium mb-2">{tUi("client.referrals.quick_share")}</div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Check out SPS Studio for premium real estate media & photography. Use my VIP invite link to get a ${profile.program_settings?.referee_reward_type === "discount_percent" ? `${profile.program_settings.referee_reward_value}% welcome discount` : `${formatMoney(profile.program_settings?.referee_reward_value || 0, profile.currency)} welcome credit`} on your first booking: ${profile.referral_link}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>{tUi("client.referrals.share_whatsapp")}</span>
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent("Exclusive VIP Invite to SPS Studio")}&body=${encodeURIComponent(`Hi,\n\nI recommend SPS Studio for real estate photography, video tours, and floor plans. Use my personal invite link below to get a ${profile.program_settings?.referee_reward_type === "discount_percent" ? `${profile.program_settings.referee_reward_value}% discount` : `${formatMoney(profile.program_settings?.referee_reward_value || 0, profile.currency)} credit`} on your first booking:\n\n${profile.referral_link}\n\nReferral Code: ${profile.referral_code}`)}`}
                  className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{tUi("client.referrals.share_email")}</span>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2-Column: Direct Email Invite + Reward Vouchers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Direct Email Invite */}
        <Card className="border-border shadow-xs">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <span>{tUi("client.referrals.direct_invite")}</span>
            </CardTitle>
            <CardDescription className="text-xs">
              We'll send a VIP invitation directly from SPS Studio on your behalf.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-0">
            <form onSubmit={handleSendInvite} className="space-y-3.5">
              {inviteSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{inviteSuccess}</span>
                </div>
              )}

              {inviteError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{inviteError}</span>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  Colleague's Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={tUi("client.referrals.email_placeholder")}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tUi("client.referrals.colleague_name")}</Label>
                <Input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder={tUi("client.referrals.name_placeholder")}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tUi("client.referrals.personal_note")}</Label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder={tUi("client.referrals.note_placeholder")}
                  rows={2}
                  className="w-full p-2 text-xs rounded-md border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <Button
                type="submit"
                disabled={sendingInvite}
                className="w-full text-xs gap-2"
              >
                {sendingInvite ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{tUi("client.referrals.sending")}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{tUi("client.referrals.send")}</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Available Rewards & Vouchers */}
        <Card className="border-border shadow-xs flex flex-col justify-between">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{tUi("client.referrals.vouchers")}</span>
              </CardTitle>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-text">
                {rewards.length} Vouchers
              </span>
            </div>
            <CardDescription className="text-xs">
              Vouchers unlocked from your referrals and VIP status. Apply during invoice settlement.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-0 flex-1">
            {rewards.length === 0 ? (
              <div className="p-6 text-center text-muted-text space-y-2">
                <Gift className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs">{tUi("client.referrals.no_vouchers")}</p>
                <p className="text-[11px]">{tUi("client.referrals.no_vouchers_desc")}</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {rewards.map((rw) => (
                  <div
                    key={rw.id}
                    className={`p-3 rounded-xl border transition-all ${
                      rw.status === "available"
                        ? "bg-surface border-border/80 hover:border-primary/50 shadow-2xs"
                        : "bg-muted/30 border-border/40 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-xs text-text flex items-center gap-1.5">
                          <span>{rw.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                            rw.status === "available"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-muted text-muted-text"
                          }`}>
                            {rw.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-text mt-0.5">{rw.description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-primary font-mono">
                          {rw.reward_type === "discount_percent" ? `${rw.reward_value}% OFF` : formatMoney(rw.reward_value, rw.currency)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between">
                      <div className="text-[11px] font-mono font-bold text-text bg-muted/60 px-2 py-0.5 rounded border border-border/50">
                        {rw.voucher_code}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyVoucher(rw.voucher_code)}
                        className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
                      >
                        {copiedVoucher === rw.voucher_code ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>{tUi("client.common.copied")}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{tUi("client.referrals.copy_voucher")}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tier Roadmap Explorer */}
      <Card className="border-border shadow-xs">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>{tUi("client.referrals.roadmap")}</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Review all tier tiers, qualification requirements, and lifetime studio privileges.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {all_tiers.map((t, idx) => {
              const isCurrent = t.id === current_tier.id;
              const isPast = profile.successful_referrals >= t.min_referrals;

              return (
                <div
                  key={t.id}
                  className={`p-4 rounded-xl border relative flex flex-col justify-between transition-all ${
                    isCurrent 
                      ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30" 
                      : isPast
                        ? "bg-surface border-border"
                        : "bg-muted/20 border-border/50 opacity-75"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div 
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: t.badge_color || "#3B82F6" }}
                      >
                        {getTierIcon(t.icon)}
                      </div>
                      {isCurrent ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                          Current
                        </span>
                      ) : isPast ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Unlocked
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-text font-mono">
                          {t.min_referrals} invites
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="font-bold text-xs text-text">{t.name}</div>
                      <div className="text-[11px] text-primary font-medium mt-0.5">
                        {t.reward_description}
                      </div>
                    </div>

                    {t.perks && t.perks.length > 0 && (
                      <ul className="space-y-1 text-[11px] text-muted-text pt-2 border-t border-border/50">
                        {t.perks.slice(0, 3).map((p, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-1">
                            <span className="text-primary font-bold">•</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-3 pt-2 text-[10px] text-muted-text border-t border-border/40 font-mono">
                    Req: {t.min_referrals} referral{t.min_referrals !== 1 ? "s" : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Referrals Activity History */}
      <Card className="border-border shadow-xs">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>{tUi("client.referrals.status_title")}</span>
            </CardTitle>
            <span className="text-xs text-muted-text">
              {recent_referrals.length} total referrals
            </span>
          </div>
          <CardDescription className="text-xs">
            Track registration and photoshoot booking status for your invited colleagues.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 pt-0">
          {recent_referrals.length === 0 ? (
            <div className="p-8 text-center text-muted-text space-y-2">
              <Users className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-xs">{tUi("client.referrals.no_activity")}</p>
              <p className="text-[11px]">{tUi("client.referrals.no_activity_desc")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-text uppercase text-[10px] font-semibold tracking-wider">
                    <th className="pb-2.5 px-3">{tUi("client.referrals.colleague")}</th>
                    <th className="pb-2.5 px-3">{tUi("client.referrals.status")}</th>
                    <th className="pb-2.5 px-3">{tUi("client.referrals.invited_date")}</th>
                    <th className="pb-2.5 px-3">{tUi("client.referrals.reward_status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {recent_referrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-muted/20">
                      <td className="py-3 px-3 font-medium text-text">
                        <div>
                          {ref.referee_name || ref.referee_email}
                        </div>
                        {ref.referee_name && (
                          <div className="text-[11px] text-muted-text font-mono">{ref.referee_email}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {ref.status === "converted" && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px] flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Converted
                          </span>
                        )}
                        {ref.status === "pending" && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold text-[10px] flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" /> Registered (Booking Pending)
                          </span>
                        )}
                        {ref.status === "rejected" && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 font-semibold text-[10px] w-fit">
                            Not Qualified
                          </span>
                        )}
                        {ref.status === "fraud_suspected" && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 font-semibold text-[10px] w-fit">
                            Under Review
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-muted-text font-mono text-[11px]">
                        {ref.created_at ? new Date(ref.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-3 text-muted-text text-[11px]">
                        {ref.referrer_reward_granted ? (
                          <span className="text-emerald-600 font-medium flex items-center gap-1">
                            <Gift className="w-3.5 h-3.5" /> Voucher Granted
                          </span>
                        ) : (
                          <span className="text-muted-text">{tUi("client.referrals.pending_booking")}</span>
                        )}
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
  );
}
