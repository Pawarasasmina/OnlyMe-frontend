import { Link } from "react-router-dom";
import {
  FiAlertCircle,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiEdit3,
  FiEye,
  FiFileText,
  FiLock,
  FiMail,
  FiMessageCircle,
  FiRefreshCw,
  FiUser,
} from "react-icons/fi";
import Button from "../common/Button";
import { resolveMediaUrl } from "../../utils/media";
import { formatCoins, formatDate, formatDateTime } from "../../utils/fanDashboardFormatters";

function initials(name = "Fan") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function Avatar({ alt, name, src, size = "h-12 w-12" }) {
  const imageUrl = resolveMediaUrl(src);

  return (
    <div className={`${size} shrink-0 overflow-hidden rounded-2xl bg-white/10`}>
      {imageUrl ? (
        <img alt={alt || `${name || "User"} avatar`} className="h-full w-full object-cover" src={imageUrl} />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-sm font-bold text-brand-secondary">
          {initials(name)}
        </span>
      )}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-secondary">{eyebrow}</p> : null}
        <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl lg:text-4xl">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-mist/65">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function DashboardCardSkeleton({ count = 1 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div className="h-36 animate-pulse rounded-3xl border border-white/10 bg-white/5" key={index} />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div className="h-20 animate-pulse rounded-3xl border border-white/10 bg-white/5" key={index} />
      ))}
    </div>
  );
}

export function DashboardEmptyState({ icon: Icon = FiAlertCircle, message, detail, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-5 text-center" role="status">
      <Icon aria-hidden="true" className="mx-auto text-xl text-brand-secondary" />
      <p className="mt-2 font-semibold text-white">{message}</p>
      {detail ? <p className="mx-auto mt-2 max-w-md text-sm text-brand-mist/60">{detail}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function DashboardErrorState({ message = "Unable to load this section.", onRetry }) {
  return (
    <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <FiAlertCircle className="mt-1 shrink-0 text-red-200" />
          <div>
            <p className="font-semibold text-red-100">{message}</p>
            <p className="mt-1 text-sm text-red-100/70">Please try again in a moment.</p>
          </div>
        </div>
        {onRetry ? (
          <Button onClick={onRetry} type="button" variant="ghost">
            <FiRefreshCw className="mr-2" /> Retry
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function SectionPanel({ title, description, action, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-brand-dark/60 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          {description ? <p className="mt-1 text-sm text-brand-mist/60">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatCard({ icon: Icon, title, value, help, to, actionLabel, loading, error, empty }) {
  if (loading) {
    return <div aria-label={`Loading ${title}`} className="h-36 animate-pulse rounded-3xl border border-white/10 bg-white/5" role="status" />;
  }

  return (
    <article className="flex min-h-36 flex-col justify-between rounded-3xl border border-white/10 bg-brand-dark/60 p-4 transition hover:border-brand-primary/50 hover:bg-white/[0.04] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-2xl bg-brand-primary/15 p-3 text-brand-secondary">
          <Icon aria-hidden="true" />
        </span>
        {error ? <FiAlertCircle className="text-red-200" title="Unable to load" /> : null}
      </div>
      <div className="mt-3">
        <p className="text-sm text-brand-mist/60">{title}</p>
        <p className="mt-1 text-2xl font-black text-white sm:text-3xl">{error ? "Unavailable" : empty ? "0" : value}</p>
        <p className="mt-1 min-h-10 text-sm leading-5 text-brand-mist/55">{error ? "This value could not be loaded." : help}</p>
      </div>
      {to && actionLabel ? (
        <Link className="mt-3 inline-flex w-fit items-center gap-2 rounded-full text-sm font-semibold text-brand-secondary outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark" to={to}>
          {actionLabel} <FiArrowRight />
        </Link>
      ) : null}
    </article>
  );
}

export function ProfileSummaryCard({ profile, loading, error, onRetry }) {
  if (loading) {
    return <ListSkeleton count={1} />;
  }

  if (error) {
    return <DashboardErrorState message="Unable to load profile summary." onRetry={onRetry} />;
  }

  if (!profile) {
    return <DashboardEmptyState icon={FiUser} message="Profile details are not available." />;
  }

  const completion = profile.completionPercentage ?? 0;
  const needsAttention = completion < 100;

  return (
    <section className="rounded-3xl border border-white/10 bg-brand-dark/60 p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={profile.displayName || profile.username} src={profile.avatarUrl} size="h-14 w-14" />
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-white">{profile.displayName || profile.username || "Atseen fan"}</h3>
            {profile.username ? <p className="truncate text-sm text-brand-mist/60">@{profile.username}</p> : null}
            {profile.email ? (
              <p className="mt-1 truncate text-sm text-brand-mist/55" title={profile.email}>
                {profile.email}
              </p>
            ) : null}
          </div>
        </div>
        <Link to="/settings/profile">
          <Button className="w-full sm:w-auto" type="button" variant="secondary">
            <FiEdit3 className="mr-2" /> Edit Profile
          </Button>
        </Link>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <InfoPill icon={FiEye} label="Visibility" value={profile.profileVisibility || "private"} />
        <InfoPill icon={FiCalendar} label="Joined" value={formatDate(profile.joinedAt)} />
        {profile.preferredLanguage ? <InfoPill icon={FiMessageCircle} label="Language" value={profile.preferredLanguage} /> : null}
        {profile.timezone ? <InfoPill icon={FiClock} label="Time zone" value={profile.timezone} /> : null}
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-brand-mist/65">Profile completion</span>
          <span className="font-bold text-brand-secondary">{completion}%</span>
        </div>
        <div
          aria-label="Profile completion"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={completion}
          className="h-2.5 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
        >
          <div className="h-full rounded-full bg-brand-primary" style={{ width: `${completion}%` }} />
        </div>
        {needsAttention ? (
          <p className="mt-3 rounded-2xl bg-brand-secondary/10 px-4 py-2 text-sm text-brand-secondary">
            Add a profile photo to help creators recognize you.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function InfoPill({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-brand-mist/45">
        <Icon aria-hidden="true" /> {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold capitalize text-white" title={value}>
        {value}
      </p>
    </div>
  );
}

export function SubscriptionCard({ subscription, showManage = true }) {
  const statusClass =
    subscription.status === "active"
      ? "bg-emerald-500/10 text-emerald-200"
      : subscription.status === "cancelled" || subscription.status === "expired"
        ? "bg-red-500/10 text-red-200"
        : "bg-white/10 text-brand-mist/75";

  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={subscription.creator?.displayName} src={subscription.creator?.avatarUrl} />
          <div className="min-w-0">
            <h4 className="truncate font-bold text-white">{subscription.creator?.displayName || "Creator unavailable"}</h4>
            <p className="truncate text-sm text-brand-mist/55">@{subscription.creator?.username || "unknown"}</p>
          </div>
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass}`}>{subscription.status}</span>
      </div>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <Detail label="Next renewal" value={subscription.nextRenewalDate ? formatDate(subscription.nextRenewalDate) : "Not scheduled"} />
        <Detail label="Price" value={subscription.priceCents == null ? "Not recorded" : `$${(subscription.priceCents / 100).toFixed(2)}`} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {subscription.trialStatus ? <Badge label={`Trial: ${subscription.trialStatus}`} /> : null}
        {subscription.gracePeriod ? <Badge label="Grace period" /> : null}
        {subscription.isExpiringSoon ? <Badge label="Expiring soon" /> : null}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {subscription.creator?.username ? (
          <Link className="inline-flex items-center justify-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark" to={`/creators/${subscription.creator.username}`}>
            View Creator
          </Link>
        ) : null}
        {showManage ? (
          <Button disabled type="button" variant="ghost">
            Manage Subscription
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function Badge({ label }) {
  return <span className="rounded-full bg-brand-secondary/10 px-3 py-1 text-xs font-semibold text-brand-secondary">{label}</span>;
}

function Detail({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/5 p-3">
      <p className="text-xs text-brand-mist/45">{label}</p>
      <p className="mt-1 truncate font-semibold text-white" title={value}>
        {value}
      </p>
    </div>
  );
}

export function WalletTransactionRow({ transaction }) {
  const isCredit = transaction.direction === "credit";
  const statusLabel = {
    completed: "Captured",
    pending: "Held",
    refunded: "Refunded",
  }[transaction.status] || transaction.status;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`rounded-2xl p-3 ${isCredit ? "bg-emerald-500/10 text-emerald-200" : "bg-red-500/10 text-red-200"}`}>
          <FiCreditCard aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{transaction.description}</p>
          <p className="text-sm capitalize text-brand-mist/55">
            {transaction.type} - {formatDateTime(transaction.createdAt)} - {statusLabel}
          </p>
        </div>
      </div>
      <p className={`text-lg font-black ${isCredit ? "text-emerald-200" : "text-red-200"}`}>
        {isCredit ? "+" : "-"}{formatCoins(transaction.amount)}
      </p>
    </div>
  );
}

export function PurchasedContentCard({ item }) {
  const thumbnail = resolveMediaUrl(item.thumbnailUrl);

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="aspect-video overflow-hidden rounded-2xl bg-white/10">
        {thumbnail ? (
          <img alt={item.title} className="h-full w-full object-cover" src={thumbnail} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-brand-mist/45">
            <FiFileText aria-hidden="true" />
          </div>
        )}
      </div>
      <h4 className="mt-4 line-clamp-2 font-bold text-white">{item.title || "This content is no longer available."}</h4>
      <p className="mt-1 text-sm text-brand-mist/55">@{item.creator?.username || "unknown"}</p>
      <div className="mt-3 grid gap-2 text-sm text-brand-mist/60">
        <span>{item.contentType || "Content"} - {formatDate(item.unlockedAt)}</span>
        <span>{formatCoins(item.coinAmount || 0)} - {item.accessStatus || "Unavailable"}</span>
      </div>
      <Button className="mt-4 w-full" disabled type="button" variant="ghost">
        View Content
      </Button>
    </article>
  );
}

export function ConversationPreviewRow({ conversation }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={conversation.creator?.displayName} src={conversation.creator?.avatarUrl} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{conversation.creator?.displayName || "Creator unavailable"}</p>
          <p className="truncate text-sm text-brand-mist/55">{conversation.lastMessagePreview || "No message preview available."}</p>
          <p className="mt-1 text-xs text-brand-mist/45">{formatDateTime(conversation.lastMessageAt)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {conversation.ppm ? <Badge label="PPM" /> : null}
        {conversation.unread ? <span className="h-2.5 w-2.5 rounded-full bg-brand-primary" aria-label="Unread" /> : null}
        <Button disabled type="button" variant="ghost">
          Open Conversation
        </Button>
      </div>
    </div>
  );
}

export function ActivityRow({ activity }) {
  const icons = {
    subscription: FiCheckCircle,
    wallet_credit: FiCreditCard,
    wallet_debit: FiCreditCard,
    message: FiMail,
    notification: FiAlertCircle,
  };
  const Icon = icons[activity.type] || FiClock;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="rounded-2xl bg-brand-primary/15 p-3 text-brand-secondary">
          <Icon aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-white">{activity.description}</p>
          {activity.relatedCreator ? <p className="mt-1 text-sm text-brand-mist/55">@{activity.relatedCreator.username}</p> : null}
          <p className="mt-1 text-xs text-brand-mist/45">{formatDateTime(activity.createdAt)}</p>
        </div>
      </div>
      {activity.actionPath ? (
        <Link className="inline-flex w-fit items-center gap-2 rounded-full text-sm font-semibold text-brand-secondary outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark" to={activity.actionPath}>
          Open <FiArrowRight />
        </Link>
      ) : null}
    </div>
  );
}

export function QuickActions({ capabilities = {} }) {
  const actions = [
    capabilities.discoverCreators ? { label: "Discover Creators", to: "/", icon: FiUser } : null,
    { label: "Open Wallet", to: "/fan/wallet", icon: FiCreditCard },
    { label: "View Subscriptions", to: "/fan/subscriptions", icon: FiCheckCircle },
    { label: "View Purchased Content", to: "/fan/purchases", icon: FiLock },
    { label: "Open Messages", to: "/fan/messages", icon: FiMessageCircle },
    { label: "Edit Profile", to: "/settings/profile", icon: FiEdit3 },
  ].filter(Boolean);

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {actions.map((action) => (
        <Link
          className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white outline-none transition hover:border-brand-primary/60 hover:bg-brand-primary/10 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark"
          key={action.to}
          to={action.to}
        >
          <span className="inline-flex items-center gap-2">
            <action.icon aria-hidden="true" className="shrink-0 text-brand-secondary" /> {action.label}
          </span>
          <FiArrowRight className="text-brand-mist/45" />
        </Link>
      ))}
    </div>
  );
}

export function DisabledActionNotice({ children }) {
  return (
    <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-brand-mist/65">
      {children}
    </p>
  );
}

export function FilterPills({ filters, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            active === filter.value ? "bg-brand-primary text-white" : "bg-white/10 text-brand-mist/75 hover:bg-white/15"
          }`}
          key={filter.value}
          onClick={() => onChange(filter.value)}
          type="button"
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
