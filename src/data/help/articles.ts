export interface HelpArticle {
  slug: string;
  title: string;
  categorySlug: string;
  sectionSlug: string;
  excerpt: string;
  readingTime: number;
  lastUpdated: string;
  content: string;
  videoUrl?: string;
}

export const articles: HelpArticle[] = [
  {
    slug: "managing-open-closed-conversations",
    title: "Managing Open and Closed Conversations",
    categorySlug: "messaging",
    sectionSlug: "sms-mms",
    excerpt:
      "Learn how the SMS Inbox organizes conversations into open and closed states for better workflow management.",
    readingTime: 5,
    lastUpdated: "2026-03-10",
    content: `## Overview

The JustCall SMS Inbox uses an **open/closed conversation model** to help your team manage SMS threads efficiently. Every conversation starts as "open" when a new message arrives and can be marked "closed" once the issue is resolved.

## How It Works

### Open Conversations
An open conversation means the thread needs attention. Open conversations appear in your **primary inbox view** and count toward your team's active workload.

Conversations are automatically opened when:
- A new inbound message arrives from a contact
- A previously closed conversation receives a new reply
- A team member manually reopens a thread

### Closed Conversations
Closing a conversation signals that no further action is needed. Closed threads move to the **Closed** tab and no longer appear in your active inbox.

To close a conversation:
1. Open the conversation thread
2. Click the **Close** button in the top-right corner
3. Optionally add a closing note for your team

### Bulk Actions
You can close multiple conversations at once:
1. Select conversations using the checkboxes
2. Click **Close Selected** from the action bar
3. Confirm the bulk close action

## Best Practices

- **Close conversations promptly** after resolving to keep your inbox clean
- **Use closing notes** to document resolution for team visibility
- **Set up automation rules** to auto-close conversations after a period of inactivity
- **Review closed conversations** periodically to ensure nothing was missed

## Related Features
- [Using the Unresponded Filter](/help/articles/using-unresponded-filter) — Find conversations that need replies
- [SMS Inbox Search](/help/articles/sms-inbox-search) — Search across all conversations`,
  },
  {
    slug: "ai-sms-copilot",
    title: "AI-powered SMS Copilot",
    categorySlug: "messaging",
    sectionSlug: "sms-mms",
    excerpt:
      "Use AI to draft SMS replies, get conversation summaries, and handle messages faster.",
    readingTime: 6,
    lastUpdated: "2026-03-10",
    content: `## What is SMS Copilot?

SMS Copilot is JustCall's AI-powered assistant that helps you compose better SMS replies faster. It analyzes the conversation context and suggests relevant responses.

> **Note:** SMS Copilot is different from Smart Replies. Smart Replies are pre-defined templates, while Copilot generates contextual suggestions using AI.

## Key Features

### AI-Generated Reply Suggestions
When you open a conversation, Copilot analyzes the thread and offers up to 3 suggested replies. Click any suggestion to insert it into the compose box, then edit as needed before sending.

### Conversation Summaries
For long threads, Copilot provides a brief summary at the top of the conversation showing:
- Key topics discussed
- Action items mentioned
- Sentiment indicator (positive, neutral, negative)

### Tone Adjustment
Select your draft text and use Copilot to adjust the tone:
- **Professional** — formal business language
- **Friendly** — warm and approachable
- **Concise** — shortened to essentials

## How to Enable SMS Copilot

1. Go to **Settings** > **AI Features**
2. Toggle on **SMS Copilot**
3. Choose your default suggestion style
4. Click **Save**

## Usage Limits

| Plan | Monthly AI Credits |
|------|-------------------|
| Team | 500 suggestions |
| Business | 2,000 suggestions |
| Enterprise | Unlimited |

## Tips for Best Results
- Keep your conversation threads organized — Copilot works best with clear context
- Review and personalize AI suggestions before sending
- Use tone adjustment for customer-facing messages`,
  },
  {
    slug: "sms-automation-triggers",
    title: "SMS Automation and Triggers",
    categorySlug: "messaging",
    sectionSlug: "sms-mms",
    excerpt:
      "Set up automated SMS workflows triggered by events, schedules, or conversation states.",
    readingTime: 8,
    lastUpdated: "2026-03-10",
    content: `## Overview

SMS Automation lets you create rules that automatically send messages, assign conversations, or update statuses based on triggers you define.

## Trigger Types

### Event-Based Triggers
- **New inbound message** — fires when any new SMS arrives
- **Keyword match** — fires when a message contains specific words
- **After-hours message** — fires when a message arrives outside business hours
- **Missed call** — sends an automatic SMS when a call goes unanswered

### Time-Based Triggers
- **Follow-up reminder** — sends a message after X hours of no reply
- **Scheduled message** — sends at a specific date and time
- **Recurring message** — sends on a repeating schedule

### Status-Based Triggers
- **Conversation closed** — fires when a conversation is marked closed
- **Conversation reopened** — fires when a closed conversation gets a new message
- **Assignment change** — fires when a conversation is reassigned

## Creating an Automation Rule

1. Navigate to **Settings** > **Automations** > **SMS Rules**
2. Click **Create New Rule**
3. Select your **trigger** from the dropdown
4. Configure **conditions** (optional filters like specific numbers, teams, or tags)
5. Choose your **action**:
   - Send auto-reply
   - Assign to team member
   - Add tag
   - Close conversation
   - Send webhook
6. Set a **name** for the rule
7. Click **Save & Activate**

## Common Automation Recipes

### After-Hours Auto-Reply
- **Trigger:** New inbound message + outside business hours
- **Action:** Send message: "Thanks for reaching out! Our team is available Mon-Fri 9AM-6PM. We'll respond first thing next business day."

### Lead Qualification
- **Trigger:** Keyword match ("pricing", "demo", "trial")
- **Action:** Assign to Sales team + Add tag "hot-lead"

### Follow-Up Nudge
- **Trigger:** No reply after 24 hours
- **Action:** Send message: "Hi! Just checking in — did you need anything else?"

## Limits
- Maximum 50 active automation rules per account
- Auto-replies respect opt-out/DNC lists automatically
- Time-based triggers have a minimum interval of 1 hour`,
  },
  {
    slug: "sms-bot-automate-replies",
    title: "SMS Bot — Automate SMS Replies",
    categorySlug: "messaging",
    sectionSlug: "sms-bot",
    excerpt:
      "Build conversational SMS bots that handle common queries without human intervention.",
    readingTime: 7,
    lastUpdated: "2026-03-10",
    content: `## What is SMS Bot?

SMS Bot is JustCall's conversational automation tool for SMS. Unlike simple auto-replies, SMS Bot can handle multi-turn conversations by following decision trees you configure.

> **Important:** SMS Bot is different from SMS Copilot. Bot handles conversations autonomously with pre-built flows. Copilot assists human agents with AI suggestions.

## How SMS Bot Works

1. A customer sends an SMS to your JustCall number
2. Bot matches the message to a configured flow
3. Bot responds based on the flow logic
4. If the bot can't handle the query, it escalates to a human agent

## Creating a Bot Flow

### Step 1: Define Entry Points
Set up keyword triggers that activate the bot:
- "hours" or "open" → Business Hours flow
- "cancel" or "refund" → Cancellation flow
- "appointment" or "schedule" → Booking flow

### Step 2: Build the Conversation Tree
Each node in the tree can:
- **Send a message** — text response to the customer
- **Ask a question** — prompt for input with expected answer options
- **Branch** — route based on customer's reply
- **Collect data** — save customer input (name, email, etc.)
- **Transfer** — hand off to a human agent

### Step 3: Set Fallback Behavior
Configure what happens when the bot doesn't understand:
- Retry with rephrased question (max 2 retries)
- Escalate to human agent
- Send a default "I didn't understand" message

## Bot Analytics

Track bot performance in **Analytics** > **SMS Bot**:
- Total bot conversations
- Resolution rate (handled without human)
- Average conversation length
- Top escalation reasons
- Customer satisfaction scores

## Best Practices
- Keep bot messages short (under 160 characters when possible)
- Always provide an escape hatch to reach a human
- Test flows thoroughly before activating
- Review escalation reasons weekly to improve bot coverage`,
  },
  {
    slug: "bulk-sms-campaigns",
    title: "Bulk SMS Campaigns — Bulk Texting",
    categorySlug: "messaging",
    sectionSlug: "bulk-sms",
    excerpt:
      "Send SMS messages to large contact lists with campaign management and tracking.",
    readingTime: 6,
    lastUpdated: "2026-03-10",
    content: `## Overview

Bulk SMS lets you send text messages to hundreds or thousands of contacts at once. Use it for marketing campaigns, announcements, reminders, or notifications.

## Creating a Bulk SMS Campaign

### Step 1: Prepare Your Contact List
- Upload a CSV file with phone numbers and personalization fields
- Or select an existing contact list from your JustCall contacts
- Maximum 10,000 contacts per campaign

### Step 2: Compose Your Message
- Write your message (up to 1,600 characters)
- Use merge fields for personalization: \`{{first_name}}\`, \`{{company}}\`, etc.
- Preview how the message will look with sample data

### Step 3: Configure Sending Options
| Option | Description |
|--------|------------|
| Send Now | Sends immediately |
| Schedule | Pick date and time |
| Timezone | Respects recipient timezone |
| Throttle | Messages per minute (default: 60) |
| Sender Number | Choose your JustCall number |

### Step 4: Review and Send
- Preview total cost estimate
- Confirm opt-out compliance
- Click **Send Campaign** or **Schedule**

## Campaign Tracking

After sending, track results in **Campaigns** > **SMS Campaigns**:
- **Delivered** — successfully received
- **Failed** — delivery failed (invalid number, carrier block)
- **Opted Out** — recipient replied STOP
- **Replied** — recipient sent a response

## Compliance

- All campaigns automatically include opt-out instructions
- DNC (Do Not Call) list contacts are automatically excluded
- 10DLC registration required for US campaigns
- TCPA compliance is your responsibility — ensure proper consent

## Pricing
Bulk SMS is billed at your standard per-message rate. No additional campaign fees.`,
  },
  {
    slug: "bulk-mms-campaign-setup",
    title: "Bulk MMS Campaign — Setup Guide",
    categorySlug: "messaging",
    sectionSlug: "bulk-sms",
    excerpt:
      "Send multimedia messages at scale with images, GIFs, and media attachments.",
    readingTime: 5,
    lastUpdated: "2026-03-10",
    content: `## Overview

Bulk MMS campaigns let you send multimedia messages — images, GIFs, and short videos — to your contact lists. MMS messages have higher engagement rates than plain SMS.

## Supported Media

| Media Type | Max Size | Formats |
|-----------|----------|---------|
| Images | 1.5 MB | JPG, PNG, GIF |
| GIFs | 1 MB | GIF |
| Video | 3.5 MB | MP4 |
| vCard | 100 KB | VCF |

## Creating a Bulk MMS Campaign

### Step 1: Upload Media
1. Go to **Campaigns** > **New Campaign** > **MMS**
2. Click **Upload Media** or drag and drop your file
3. Preview the media attachment
4. Optionally add alt text for accessibility

### Step 2: Compose Message
- Add text to accompany your media (optional but recommended)
- Use merge fields for personalization
- Total message size (text + media) must stay under 5 MB

### Step 3: Select Recipients
- Upload CSV or select existing contact list
- Review recipient count and estimated cost
- MMS is typically 3x the cost of SMS per message

### Step 4: Send or Schedule
Same options as Bulk SMS — send now, schedule, or set timezone-aware delivery.

## Tips for MMS Campaigns
- **Optimize images** — compress to under 500KB for fastest delivery
- **Use square or portrait** images — they display best on mobile
- **Keep text short** — the media is the star; text should complement
- **Test first** — send to yourself before launching to the full list
- **Track performance** — MMS campaigns show media view rates in analytics

## Carrier Limitations
- Some carriers may convert MMS to SMS with a link if media is too large
- International MMS delivery varies by country and carrier
- US and Canada have the best MMS support`,
  },
  {
    slug: "group-texting-sms",
    title: "Group Texting in SMS",
    categorySlug: "messaging",
    sectionSlug: "sms-mms",
    excerpt:
      "Send messages to groups and manage multi-party SMS conversations.",
    readingTime: 4,
    lastUpdated: "2026-03-10",
    content: `## Overview

Group texting lets you send a single message to multiple contacts and manage their individual replies in separate conversation threads.

## Group Text vs Bulk SMS

| Feature | Group Text | Bulk SMS |
|---------|-----------|----------|
| Recipients | Up to 50 | Up to 10,000 |
| Replies | Individual threads | Individual threads |
| Personalization | No merge fields | Merge fields supported |
| Media | MMS supported | MMS supported |
| Use case | Team updates, small groups | Marketing, announcements |

## Sending a Group Text

1. Open **SMS Inbox**
2. Click **New Message**
3. Add multiple recipients (up to 50)
4. Compose your message
5. Click **Send**

Each recipient receives the message individually — they cannot see other recipients. Replies come back as individual 1:1 conversations.

## Managing Group Text Replies

When recipients reply to a group text:
- Each reply creates or continues a **separate 1:1 thread**
- Replies appear in your inbox like normal conversations
- You can assign individual threads to different team members

## Use Cases
- **Team announcements** — notify your team about schedule changes
- **Event reminders** — remind attendees about upcoming events
- **Customer follow-ups** — reach out to a small segment of customers
- **Internal coordination** — quick updates to project stakeholders`,
  },
  {
    slug: "internal-collaboration-sms",
    title: "Internal Collaboration in SMS Inbox",
    categorySlug: "messaging",
    sectionSlug: "sms-mms",
    excerpt:
      "Use @mentions, internal notes, and conversation assignment for team collaboration.",
    readingTime: 5,
    lastUpdated: "2026-03-10",
    content: `## Overview

The SMS Inbox includes built-in collaboration tools so your team can work together on customer conversations without switching to Slack or email.

## Features

### @Mentions
Tag a team member in an internal note to get their attention:
1. Open a conversation
2. Click the **Internal Note** tab (or press \`N\`)
3. Type \`@\` followed by the team member's name
4. Write your note and press **Send**

The mentioned team member receives a notification and can jump directly to the conversation.

### Internal Notes
Internal notes are visible only to your team — customers never see them. Use notes to:
- Add context about a customer
- Document decisions made
- Flag issues for review
- Leave handoff instructions

### Conversation Assignment
Assign conversations to specific team members:
1. Open the conversation
2. Click **Assign** in the header
3. Select the team member from the dropdown
4. Optionally add a note explaining why

Assignments show in the assignee's **My Conversations** view.

### Assignment vs @Mentions

| Action | Purpose | Notification |
|--------|---------|-------------|
| Assign | Transfer ownership | Inbox badge + email |
| @Mention | Request input | Bell notification |

## Best Practices
- **Assign before closing** — make sure someone owns every conversation
- **Use notes liberally** — future you will thank past you
- **@Mention don't assign** when you just need a quick answer
- **Set up auto-assignment rules** to distribute workload evenly`,
  },
  {
    slug: "using-unresponded-filter",
    title: "Using the Unresponded Filter",
    categorySlug: "messaging",
    sectionSlug: "sms-mms",
    excerpt:
      "Filter your inbox to show only conversations waiting for a reply from your team.",
    readingTime: 3,
    lastUpdated: "2026-03-10",
    content: `## Overview

The Unresponded filter shows conversations where the last message is from the customer — meaning your team hasn't replied yet. This is the fastest way to find threads that need attention.

## How to Use

1. Open **SMS Inbox**
2. Click the **Filter** icon in the toolbar
3. Select **Unresponded** from the filter options
4. Your inbox now shows only conversations awaiting a reply

## What Counts as "Unresponded"

A conversation is marked unresponded when:
- The most recent message is **from the customer** (inbound)
- No team member has sent a reply since that message
- Internal notes do **not** count as responses

A conversation is removed from the unresponded filter when:
- A team member sends a reply
- The conversation is closed
- The conversation is marked as "no reply needed"

## Combining Filters

You can combine the unresponded filter with other filters:
- **Unresponded + Assigned to me** — your personal action list
- **Unresponded + Unassigned** — conversations nobody owns yet
- **Unresponded + Older than 24h** — urgent attention needed

## Setting Up Alerts

Get notified when unresponded conversations exceed a threshold:
1. Go to **Settings** > **Notifications** > **Inbox Alerts**
2. Set **Alert when unresponded count exceeds:** (e.g., 10)
3. Choose notification channel (email, push, or both)

## Dashboard Widget

The unresponded count appears on your SMS Inbox dashboard as a real-time metric. Teams typically aim to keep this number below 5 during business hours.`,
  },
  {
    slug: "sms-inbox-search",
    title: "SMS Inbox Search",
    categorySlug: "messaging",
    sectionSlug: "sms-mms",
    excerpt:
      "Search across all SMS conversations by contact, content, tags, and date range.",
    readingTime: 4,
    lastUpdated: "2026-03-10",
    content: `## Overview

SMS Inbox Search lets you find any conversation or message across your entire SMS history. Search by contact name, phone number, message content, tags, or date range.

## Quick Search

Press \`Cmd+K\` (Mac) or \`Ctrl+K\` (Windows) to open quick search from anywhere in the inbox.

Type your search query:
- **Contact name** — "John Smith"
- **Phone number** — "+1 555 0123"
- **Message content** — "invoice #1234"
- **Tag** — "vip" or "urgent"

Results appear instantly as you type. Click a result to jump to that conversation.

## Advanced Search

For more precise results, use the advanced search panel:

1. Click the **Search** icon in the inbox toolbar
2. Click **Advanced** to expand filter options
3. Set your criteria:

| Filter | Description |
|--------|------------|
| Contact | Name or phone number |
| Contains | Text within messages |
| Date range | Start and end date |
| Status | Open, Closed, or All |
| Assigned to | Specific team member |
| Tags | One or more tags |
| Direction | Inbound, Outbound, or Both |

4. Click **Search** to see results

## Search Tips

- Use **quotes** for exact phrases: \`"payment received"\`
- Search is **case-insensitive**
- Results show the **matching message highlighted** in context
- Click **Export** to download search results as CSV

## Saved Searches

Save frequent searches for one-click access:
1. Run your search
2. Click **Save Search** in the results header
3. Name your saved search
4. Access it from the **Saved Searches** dropdown`,
  },
  {
    slug: "understanding-sms-analytics",
    title: "Understanding SMS Analytics",
    categorySlug: "analytics",
    sectionSlug: "dashboards",
    excerpt:
      "Read and interpret your SMS analytics dashboard for team performance insights.",
    readingTime: 5,
    lastUpdated: "2026-03-10",
    content: `## Overview

The SMS Analytics dashboard gives you a comprehensive view of your team's messaging performance. Access it from **Analytics** > **SMS** in the left navigation.

## Dashboard Metrics

### Volume Metrics
- **Total Messages** — inbound + outbound message count
- **Conversations** — unique conversation threads
- **Avg Messages per Conversation** — thread depth indicator

### Response Metrics
- **First Response Time** — average time to first reply
- **Resolution Time** — average time from open to close
- **Response Rate** — percentage of inbound messages that get a reply

### Team Metrics
- **Messages by Agent** — individual team member activity
- **Conversations Handled** — unique threads per agent
- **Avg Response Time by Agent** — individual speed comparison

## Date Range Selection

Use the date picker in the top-right to view analytics for:
- Today
- Last 7 days
- Last 30 days
- Custom range

All metrics update in real-time for "Today" and refresh hourly for historical data.

## Charts and Visualizations

### Message Volume Chart
Bar chart showing daily message volume split by inbound/outbound. Hover for exact counts.

### Response Time Trend
Line chart showing average first response time over the selected period. Downward trends indicate improving performance.

### Top Performing Agents
Ranked table of agents by conversations resolved, average response time, and customer satisfaction score.

## Exporting Data

Click **Export** in the top-right to download:
- **PDF Report** — formatted dashboard snapshot
- **CSV Data** — raw metrics for custom analysis
- **Scheduled Reports** — set up weekly email delivery

## Setting Goals

Go to **Analytics** > **Goals** to set targets:
- First response time under X minutes
- Resolution time under X hours
- Response rate above X%

Goals appear as reference lines on your charts.`,
  },
  {
    slug: "view-unread-messages",
    title: "How to View Unread Messages",
    categorySlug: "messaging",
    sectionSlug: "sms-mms",
    excerpt:
      "Quickly find and manage unread messages in your SMS Inbox.",
    readingTime: 2,
    lastUpdated: "2026-03-10",
    content: `## Overview

The Unread filter in SMS Inbox helps you find messages you haven't opened yet. Unread conversations appear with a **blue dot** indicator in the conversation list.

## Viewing Unread Messages

1. Open **SMS Inbox**
2. Click the **Filter** icon
3. Select **Unread**

Your inbox now shows only conversations with unread messages.

## Unread vs Unresponded

| State | Meaning |
|-------|---------|
| **Unread** | You haven't opened/viewed the message |
| **Unresponded** | You've seen it but haven't replied |

A conversation can be both unread AND unresponded, but marking as read does not count as a response.

## Mark as Read / Unread

- **Mark as read:** Open the conversation, or right-click > **Mark as Read**
- **Mark as unread:** Right-click a conversation > **Mark as Unread** (useful for flagging threads to revisit)
- **Bulk mark:** Select multiple conversations > **Mark as Read**

## Unread Badge

The unread count appears as a badge on:
- The SMS Inbox icon in the left navigation
- Your browser tab title (e.g., "(3) JustCall")
- Desktop push notifications (if enabled)`,
  },
];

export function getArticleBySlug(slug: string): HelpArticle | undefined {
  return articles.find((a) => a.slug === slug);
}

export function getArticlesByCategory(categorySlug: string): HelpArticle[] {
  return articles.filter((a) => a.categorySlug === categorySlug);
}

export function getArticlesBySection(
  categorySlug: string,
  sectionSlug: string
): HelpArticle[] {
  return articles.filter(
    (a) => a.categorySlug === categorySlug && a.sectionSlug === sectionSlug
  );
}

export function searchArticles(query: string): HelpArticle[] {
  const q = query.toLowerCase();
  return articles.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      a.content.toLowerCase().includes(q)
  );
}
