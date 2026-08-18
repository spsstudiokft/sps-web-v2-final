export type Language = {
  code: string;
  name: string;
  enabled?: boolean;
  is_default?: boolean;
  nativeName?: string;
  flag?: string;
};

export type SiteSettings = {
  [key: string]: string | undefined;
  studio_name?: string;
  hero_headline?: string;
  hero_subheadline?: string;
  about_text?: string;
  contact_title?: string;
  contact_description?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  contact_hours?: string;
  contact_map_embed?: string;
  contact_form_show_phone?: string; // '1' | '0' or 'true' | 'false'
  contact_form_require_phone?: string; // '1' | '0' or 'true' | 'false'
  contact_form_show_service?: string; // '1' | '0'
  contact_form_show_address?: string; // '1' | '0'
  contact_form_show_availability?: string; // '1' | '0'
  contact_form_require_availability?: string; // '1' | '0'
  contact_form_availability_label?: string;
  contact_form_availability_help_text?: string;
  theme_colors?: string;
  theme_public_config?: string;
  theme_admin_config?: string;
  media_provider?: string;
  appwrite_endpoint?: string;
  appwrite_project_id?: string;
  appwrite_api_key?: string;
  appwrite_bucket_id?: string;
  r2_account_id?: string;
  r2_access_key_id?: string;
  r2_secret_access_key?: string;
  r2_bucket_name?: string;
  r2_public_domain?: string;
  logo_header_light?: string;
  logo_header_dark?: string;
  logo_footer_light?: string;
  logo_footer_dark?: string;
  favicon_url?: string;
  logo_alt_text?: string;
  footer_version?: string;
  footer_ai_notice?: string;
  footer_created_prefix?: string;
  footer_created_suffix?: string;
  site_languages?: string;
  default_language?: string;
  custom_translations?: string;
  resend_from_email?: string;
  resend_from_name?: string;
  resend_reply_to?: string;
  admin_notification_email?: string;
  email_footer_text?: string;
  google_review_url?: string;
  seo_default_title?: string;
  seo_default_description?: string;
  seo_default_keywords?: string;
  seo_pages_meta?: string; // JSON string mapping page key to PageSeoMeta
};

export type PageSeoMeta = {
  title?: string;
  description?: string;
  keywords?: string;
};

export type GalleryMediaType = 'image' | 'video';
export type PortfolioItemType = 'image' | 'drone_video' | 'interior_video';
export type VideoEmbedType = 'upload' | 'youtube' | 'vimeo' | 'direct';

export interface GalleryMediaItem {
  id: string;
  url: string;
  type: GalleryMediaType;
  item_type?: PortfolioItemType;
  title?: string;
  caption?: string;
  alt?: string;
  thumbnail_url?: string;
  embed_type?: VideoEmbedType;
  video_id?: string;
  filename?: string;
  original_filename?: string;
  file_size?: number;
  compressed_url?: string;
  compressed_filename?: string;
  compressed_size?: number;
  project_id?: string;
  project_name?: string;
  category_name?: string;
  item_number?: string;
}

export type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  item_type?: PortfolioItemType | string | null;
  media_type?: 'image' | 'video';
  media_url?: string | null;
  thumbnail_url?: string | null;
  image_urls: string;
  target_url: string | null;
  is_featured: number;
  is_published: number;
  sort_order: number;
  keywords?: string | null;
  created_at: string;
  updated_at?: string;
  projects?: Array<{ id: string; name: string }>;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  client_id: string | null;
  client_email?: string | null;
  keywords?: string | null;
  created_at: string;
  updated_at: string;
  portfolios?: Array<{
    id: string;
    title: string;
    image_urls?: string;
    description?: string;
    target_url?: string;
    thumbnail_url?: string;
    media_url?: string;
    media_type?: "image" | "video";
  }>;
};

export type Category = {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  parent_id?: string | null;
  parent_name?: string | null;
  sort_order: number;
  item_count?: number;
};

export type Service = {
  id: string;
  title: string;
  description: string | null;
  icon?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  link_text?: string | null;
  price?: number | null;
  is_published: number;
  sort_order: number;
  created_at: string;
  updated_at?: string;
};

export interface BundleServiceItem {
  service_id?: string;
  tier_id?: string;
  item_type?: "tier" | "service" | "extra" | "custom";
  service_title?: string;
  service_name?: string; // backwards compatibility
  quantity: number;
  original_price?: number | null;
  override_price?: number | null;
  features?: string[]; // key features of the tier
  notes?: string | null;
  is_disabled?: boolean;
  is_missing?: boolean;
}

export type PricingPlan = {
  id: string;
  type: "tier" | "bundle";
  title: string;
  subtitle?: string | null;
  description?: string | null;
  price: number;
  original_price?: number | null;
  currency: string;
  billing_type: "one_time" | "monthly" | "yearly" | "per_sqft" | "per_photo" | "custom" | "recurring";
  billing_period?: string | null;
  discount_label?: string | null;
  features: string; // JSON array string e.g. '["25 HDR Photos", "24h Turnaround"]'
  included_items?: string | null; // JSON array string e.g. '["Photography", "Floor Plan"]'
  bundle_services?: string | null; // JSON array string of BundleServiceItem[]
  cta_label?: string | null;
  cta_url?: string | null;
  message_template_en?: string | null;
  message_template_hu?: string | null;
  is_featured: number;
  featured_badge?: string | null;
  is_enabled: number;
  sort_order: number;
  created_at: string;
  updated_at?: string;
};

export type PricingFeeType = "fixed" | "percentage" | "distance" | "distance_tiered";

export interface DistanceTier {
  from_km: number;
  to_km: number | null; // null means and above
  rate_per_km: number;
}

export interface ExtraService {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  category?: string | null;
  icon?: string | null;
  price: number;
  price_type?: "fixed" | "percentage"; // "fixed" = flat amount, "percentage" = % of plan
  billing_type?: "one_time" | "recurring";
  original_price?: number | null;
  currency: string;
  unit?: string | null; // e.g. 'item', 'photo', 'room', 'minute', 'order', 'property', 'month'
  allow_quantity: number;
  min_quantity: number;
  max_quantity: number;
  is_featured?: number;
  is_enabled: number;
  show_on_pricing_page?: number; // 1 = visible on site, 0 = admin / custom quote only
  restricted_plans?: string | null; // JSON array string of Plan IDs, or empty/null for all
  restricted_roles?: string | null; // JSON array string of user roles, or empty/null for all
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface PricingFeeRule {
  id: string;
  name: string;
  description?: string | null;
  fee_type: PricingFeeType;
  amount: number; // Flat fee amount, % percentage, OR standard per-km rate
  currency: string;
  unit?: string | null; // 'km' | 'mile' | 'flat' | 'order' | '%'
  min_distance?: number | null; // Free threshold in km/mile
  min_fee?: number | null; // Minimum fee if triggered
  max_distance?: number | null;
  tiers?: string | null; // JSON array string of DistanceTier[]
  applicable_conditions?: string | null; // 'all' | 'custom' | JSON filter
  applicable_plans?: string | null; // JSON array string of plan IDs or 'all'
  applicable_regions?: string | null; // e.g. 'Budapest Metro', 'Statewide'
  applicable_order_types?: string | null; // 'all' | 'residential' | 'commercial' | 'rush'
  min_order_amount?: number | null; // Minimum order total before fee applies
  max_order_amount?: number | null; // Maximum order total cap
  is_mandatory?: number; // 1 = mandatory required fee, 0 = optional surcharge
  is_default_active: number;
  is_enabled: number;
  show_on_pricing_page?: number; // 1 = visible on site, 0 = internal only
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export type FAQCategory = {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  parent_id?: string | null;
  is_published: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  faq_count?: number;
  parent_name?: string | null;
};

export type FAQItem = {
  id: string;
  question: string;
  answer: string;
  category?: string | null;
  category_id?: string | null;
  is_published: number;
  sort_order: number;
  created_at: string;
  updated_at?: string;
};

export type ContactSubmission = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  property_address?: string;
  availability_start?: string;
  availability_end?: string;
  message: string;
  plan_id?: string | null;
  plan_name?: string | null;
  extra_services?: string | null;
  fee_details?: string | null;
  estimated_total?: number | null;
  currency?: string | null;
  is_read: number;
  status: string;
  notes: string;
  customer_id?: string | null;
  is_archived?: number;
  archived_at?: string | null;
  archived_by?: string | null;
  unarchived_at?: string | null;
  unarchived_by?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: string; // 'customer' | 'user' | 'portal_access' | 'contact'
  entity_id: string;
  action: string;
  actor_id?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  details: string; // JSON string
  ip_address?: string | null;
  created_at: string;
}

export interface ClientProperty {
  id: string;
  client_id: string;
  property_name?: string;
  address: string;
  metadata?: string | Record<string, any>;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ClientLink {
  id: string;
  client_id: string;
  label?: string;
  url: string;
  metadata?: string | Record<string, any>;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CRMRecord {
  id: string;
  type: 'lead' | 'customer';
  name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  notes: string;
  owner_id: string;
  property_address?: string | null;
  advertisement_link?: string | null;
  properties_count?: number;
  links_count?: number;
  properties?: ClientProperty[];
  links?: ClientLink[];
  has_portal_account?: boolean | number;
  portal_user_id?: string | null;
  portal_user_is_active?: number | null;
  portal_access_disabled_at?: string | null;
  portal_access_disabled_reason?: string | null;
  portal_access_disabled_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  email: string;
  name?: string;
  role: string;
  is_active: number;
  property_address?: string | null;
  advertisement_link?: string | null;
  properties_count?: number;
  links_count?: number;
  properties?: ClientProperty[];
  links?: ClientLink[];
  project_count?: number;
  projects?: { id: string; name: string }[];
  customer_status?: string | null;
  customer_name?: string | null;
  customer_id?: string | null;
  referral_code?: string | null;
  referred_by_code?: string | null;
  referral_tier_id?: string | null;
  referral_credits?: number;
  referral_tier_name?: string;
  referral_tier_badge_color?: string;
  referral_tier_icon?: string;
  referral_count?: number;
  successful_referral_count?: number;
  portal_access_disabled_at?: string | null;
  portal_access_disabled_reason?: string | null;
  portal_access_disabled_by?: string | null;
  created_at: string;
}

export interface TranslationItem {
  id: string;
  locale: string;
  key: string;
  group_name: string;
  value: string;
  created_at?: string;
  updated_at?: string;
}

export interface TranslationGroup {
  id: string;
  name: string;
  count: number;
}

export interface TranslationStats {
  totalKeys: number;
  totalTranslations: number;
  locales: Record<string, number>;
  missingCounts: Record<string, number>;
  groups: Record<string, number>;
}

export type SocialNodeType = 'group' | 'link';

export interface SocialTreeNode {
  id: string;
  parent_id?: string | null;
  type: SocialNodeType;
  title: string;
  subtitle?: string | null;
  platform: string;
  url?: string | null;
  icon?: string | null;
  badge?: string | null;
  color?: string | null;
  is_enabled: number;
  is_expanded_default?: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  children?: SocialTreeNode[];
  child_count?: number;
}

export interface SocialPlatformPreset {
  id: string;
  name: string;
  icon: string;
  color: string;
  urlPlaceholder: string;
  defaultBadge?: string;
}

export interface EmailLog {
  id: string;
  recipient: string;
  sender: string;
  subject: string;
  template_id?: string;
  status: "sent" | "failed" | "mock_logged";
  error_message?: string | null;
  metadata?: string | null;
  created_at: string;
}

export interface EmailTemplateToken {
  token: string;
  label: string;
  description: string;
  example: string;
}

export interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  category: "auth" | "onboarding" | "production" | "billing" | "notifications" | "diagnostics" | "system" | "marketing";
  description: string;
  subject: string;
  body_html: string;
  body_text: string;
  available_tokens: EmailTemplateToken[];
  sample_data: Record<string, any>;
  token_defaults?: Record<string, string>;
  version: number;
  is_customized: boolean;
  last_updated_at: string;
  updated_by?: string;
  default_subject?: string;
  default_body_html?: string;
  default_body_text?: string;
}

export interface EmailServiceConfig {
  isConfigured: boolean;
  apiKeyPresent: boolean;
  defaultSenderEmail: string;
  defaultSenderName: string;
  replyToEmail: string;
  adminNotificationEmail: string;
  footerText?: string;
  studioName?: string;
}

export interface InfoBarCategory {
  id: string;
  name: string;
  label: string;
  bg_color: string;
  text_color: string;
  dark_bg_color?: string;
  dark_text_color?: string;
  icon: string;
  is_enabled: number | boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  message_count?: number;
}

export interface InfoBarMessage {
  id: string;
  category_id: string;
  category_name?: string;
  category_label?: string;
  category_icon?: string;
  category_bg_color?: string;
  category_text_color?: string;
  category_dark_bg_color?: string;
  category_dark_text_color?: string;
  text: string;
  link_url?: string;
  link_label?: string;
  link_target_blank?: number | boolean;
  badge_text?: string;
  start_date?: string | null;
  end_date?: string | null;
  is_enabled: number | boolean;
  is_dismissible: number | boolean;
  dismiss_scope?: 'session' | 'permanent' | 'none';
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface InfoBarSettings {
  info_bar_enabled: boolean;
  info_bar_rotation_interval: number;
  info_bar_pause_on_hover: boolean;
  info_bar_show_indicators: boolean;
  info_bar_animation: 'slide' | 'fade' | 'smooth';
}

export interface PublicInfoBarData {
  settings: InfoBarSettings;
  categories: InfoBarCategory[];
  messages: InfoBarMessage[];
}

// ============================================================================
// REFERRAL & INVITE SYSTEM TYPES
// ============================================================================

export type ReferralRewardType = 'discount_percent' | 'discount_fixed' | 'credit' | 'free_service' | 'custom';
export type ReferralStatus = 'pending' | 'converted' | 'rejected' | 'fraud_suspected';
export type RewardStatus = 'available' | 'redeemed' | 'expired' | 'cancelled';
export type ReferralSuccessCriteria = 'registration' | 'first_payment' | 'min_spend';

export interface ReferralTier {
  id: string;
  name: string;
  slug: string;
  min_referrals: number;
  min_revenue: number;
  reward_type: ReferralRewardType;
  reward_value: number;
  reward_description: string;
  referee_reward_type: ReferralRewardType;
  referee_reward_value: number;
  referee_reward_description: string;
  badge_color: string;
  icon: string;
  perks_json: string; // JSON array of string perks
  perks?: string[];
  is_default: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ClientReferral {
  id: string;
  referrer_user_id: string;
  referrer_name?: string;
  referrer_email?: string;
  referee_user_id?: string | null;
  referee_name?: string;
  referee_email: string;
  referral_code_used: string;
  status: ReferralStatus;
  conversion_trigger: string;
  conversion_value: number;
  referrer_reward_granted: number;
  referee_reward_granted: number;
  referrer_reward_description?: string;
  referee_reward_description?: string;
  referee_ip?: string;
  rejection_reason?: string;
  notes?: string;
  converted_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ReferralReward {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  referral_id?: string | null;
  reward_tier_id?: string | null;
  tier_name?: string;
  recipient_role: 'referrer' | 'referee' | 'admin_grant';
  reward_type: ReferralRewardType;
  reward_value: number;
  currency: string;
  title: string;
  description: string;
  voucher_code: string;
  status: RewardStatus;
  expires_at?: string | null;
  redeemed_at?: string | null;
  redeemed_invoice_id?: string | null;
  redeemed_notes?: string;
  created_at: string;
}

export interface ReferralProgramSettings {
  is_active: boolean;
  success_criteria: ReferralSuccessCriteria;
  min_spend: number;
  referee_welcome_type: ReferralRewardType;
  referee_welcome_value: number;
  referee_welcome_description: string;
  fraud_ip_check: boolean;
  currency: string;
  custom_terms?: string;
}

export interface ClientReferralProfile {
  referral_code: string;
  referral_link: string;
  currency?: string;
  program_settings?: ReferralProgramSettings;
  current_tier: ReferralTier;
  next_tier: ReferralTier | null;
  referrals_needed_for_next_tier: number;
  progress_percent: number;
  total_referrals: number;
  successful_referrals: number;
  pending_referrals: number;
  total_credits_earned: number;
  available_credits: number;
  total_revenue_generated: number;
  all_tiers: ReferralTier[];
  rewards: ReferralReward[];
  recent_referrals: ClientReferral[];
}

export interface AdminReferralStats {
  totalReferrals: number;
  convertedReferrals: number;
  pendingReferrals: number;
  rejectedReferrals: number;
  conversionRate: number;
  totalRewardsIssued: number;
  totalCreditsGranted: number;
  totalReferredRevenue: number;
  activeReferrersCount: number;
}
