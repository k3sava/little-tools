export interface HelpCategory {
  slug: string;
  title: string;
  description: string;
  icon: string;
  articleCount: number;
  sections: { title: string; slug: string }[];
  group: "getting-started" | "using-justcall" | "managing-justcall";
}

export const categories: HelpCategory[] = [
  {
    slug: "getting-started",
    title: "Getting Started",
    description:
      "Set up your JustCall account, configure devices, and start making calls in minutes.",
    icon: "🚀",
    articleCount: 46,
    group: "getting-started",
    sections: [
      { title: "Account Setup", slug: "account-setup" },
      { title: "Device & Permissions", slug: "device-permissions" },
      { title: "Apps & Extensions", slug: "apps-extensions" },
    ],
  },
  {
    slug: "ai-voice-agent",
    title: "AI Voice Agent",
    description:
      "Create, configure, and manage AI-powered voice agents for inbound and outbound calls.",
    icon: "🤖",
    articleCount: 27,
    group: "using-justcall",
    sections: [
      { title: "Setup & Pricing", slug: "setup-pricing" },
      { title: "Inbound Config", slug: "inbound-config" },
      { title: "Outbound", slug: "outbound" },
      { title: "Reporting", slug: "reporting" },
      { title: "Knowledge Base", slug: "knowledge-base" },
    ],
  },
  {
    slug: "phone-numbers",
    title: "Phone Numbers & Calling",
    description:
      "Manage phone numbers, porting, call routing, IVR, and SIP configuration.",
    icon: "📞",
    articleCount: 120,
    group: "using-justcall",
    sections: [
      { title: "Number Management", slug: "number-management" },
      { title: "Number Porting", slug: "number-porting" },
      { title: "Call Routing", slug: "call-routing" },
      { title: "IVR & Queues", slug: "ivr-queues" },
      { title: "FAQs", slug: "faqs" },
      { title: "SIP Configuration", slug: "sip-config" },
    ],
  },
  {
    slug: "sales-dialer",
    title: "Sales Dialer",
    description:
      "Run campaigns, use predictive dialing, voicemail drop, and local presence.",
    icon: "📊",
    articleCount: 81,
    group: "using-justcall",
    sections: [
      { title: "Getting Started", slug: "getting-started" },
      { title: "Configuration", slug: "configuration" },
      { title: "Campaigns", slug: "campaigns" },
      { title: "Dialer Features", slug: "dialer-features" },
      { title: "Integrations", slug: "integrations" },
    ],
  },
  {
    slug: "messaging",
    title: "Messaging",
    description:
      "Send SMS/MMS, set up SMS bots, run bulk campaigns, WhatsApp, and 10DLC compliance.",
    icon: "💬",
    articleCount: 87,
    group: "using-justcall",
    sections: [
      { title: "SMS/MMS", slug: "sms-mms" },
      { title: "SMS Bot", slug: "sms-bot" },
      { title: "Bulk SMS", slug: "bulk-sms" },
      { title: "SMS Guidelines", slug: "sms-guidelines" },
      { title: "10DLC Registration", slug: "10dlc" },
      { title: "WhatsApp", slug: "whatsapp" },
    ],
  },
  {
    slug: "ai-features",
    title: "AI Features",
    description:
      "JustCall AI for call summaries, transcription, sentiment analysis, and coaching.",
    icon: "✨",
    articleCount: 40,
    group: "using-justcall",
    sections: [
      { title: "AI Summaries", slug: "ai-summaries" },
      { title: "Transcription", slug: "transcription" },
      { title: "Coaching", slug: "coaching" },
      { title: "Meetings", slug: "meetings" },
    ],
  },
  {
    slug: "analytics",
    title: "Analytics & Reporting",
    description:
      "Dashboards, call analytics, team performance, and custom reports.",
    icon: "📈",
    articleCount: 35,
    group: "managing-justcall",
    sections: [
      { title: "Dashboards", slug: "dashboards" },
      { title: "Call Analytics", slug: "call-analytics" },
      { title: "Custom Reports", slug: "custom-reports" },
    ],
  },
  {
    slug: "integrations",
    title: "Integrations",
    description:
      "Connect JustCall with HubSpot, Salesforce, Pipedrive, Zapier, and 50+ more tools.",
    icon: "🔌",
    articleCount: 318,
    group: "managing-justcall",
    sections: [
      { title: "HubSpot", slug: "hubspot" },
      { title: "Salesforce", slug: "salesforce" },
      { title: "Pipedrive", slug: "pipedrive" },
      { title: "Zapier", slug: "zapier" },
      { title: "Other CRMs", slug: "other-crms" },
    ],
  },
  {
    slug: "account-billing",
    title: "Account & Billing",
    description:
      "Manage your subscription, team members, roles, SSO, and billing.",
    icon: "⚙️",
    articleCount: 45,
    group: "managing-justcall",
    sections: [
      { title: "Profile Settings", slug: "profile-settings" },
      { title: "Account Settings", slug: "account-settings" },
      { title: "Billing", slug: "billing" },
      { title: "SSO & Security", slug: "sso-security" },
    ],
  },
];

export function getCategoryBySlug(slug: string): HelpCategory | undefined {
  return categories.find((c) => c.slug === slug);
}

export const categoryGroups = [
  { key: "getting-started" as const, title: "Getting Started" },
  { key: "using-justcall" as const, title: "Using JustCall" },
  { key: "managing-justcall" as const, title: "Managing JustCall" },
];
