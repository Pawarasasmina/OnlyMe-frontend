import { enumLabel as __enumLabel } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
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

function initials(name = __msg("profile.fan")) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function Avatar({ alt, name, src, size = "h-12 w-12" }) {
  __useUiLanguage();
  const imageUrl = resolveMediaUrl(src);

  return (
    <div className={`${size} shrink-0 overflow-hidden rounded-2xl bg-white/10`}>
      {imageUrl ? (
        <img alt={alt || __msg("fan.avatar", { value0: name || __msg("admin.user") })} className="h-full w-full object-cover" src={imageUrl} />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-sm font-bold text-brand-secondary">
          {initials(name)}
        </span>
      )}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }) {
  __useUiLanguage();
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
  __useUiLanguage();
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div className="h-36 animate-pulse rounded-3xl border border-white/10 bg-white/5" key={index} />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 3 }) {
  __useUiLanguage();
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div className="h-20 animate-pulse rounded-3xl border border-white/10 bg-white/5" key={index} />
      ))}
    </div>
  );
}

export function DashboardEmptyState({ icon: Icon = FiAlertCircle, message, detail, action }) {
  __useUiLanguage();
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-5 text-center" role="status">
      <Icon aria-hidden="true" className="mx-auto text-xl text-brand-secondary" />
      <p className="mt-2 font-semibold text-white">{message}</p>
      {detail ? <p className="mx-auto mt-2 max-w-md text-sm text-brand-mist/60">{detail}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function DashboardErrorState({ message = __msg("fan.unableToLoadThisSection"), onRetry }) {
  __useUiLanguage();
  return (
    <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <FiAlertCircle className="mt-1 shrink-0 text-red-200" />
          <div>
            <p className="font-semibold text-red-100">{message}</p>
            <p className="mt-1 text-sm text-red-100/70">{__msg("fan.pleaseTryAgainInAMoment")}</p>
          </div>
        </div>
        {onRetry ? (
          <Button onClick={onRetry} type="button" variant="ghost">
            <FiRefreshCw className="me-2" />{__msg("activity.retry")}</Button>
        ) : null}
      </div>
    </div>
  );
}

export function SectionPanel({ title, description, action, children }) {
  __useUiLanguage();
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
  __useUiLanguage();
  if (loading) {
    return <div aria-label={__msg("fan.loading", { value0: title })} className="h-36 animate-pulse rounded-3xl border border-white/10 bg-white/5" role="status" />;
  }

  return (
    <article className="flex min-h-36 flex-col justify-between rounded-3xl border border-white/10 bg-brand-dark/60 p-4 transition hover:border-brand-primary/50 hover:bg-white/[0.04] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-2xl bg-brand-primary/15 p-3 text-brand-secondary">
          <Icon aria-hidden="true" />
        </span>
        {error ? <FiAlertCircle className="text-red-200" title={__msg("fan.unableToLoad")} /> : null}
      </div>
      <div className="mt-3">
        <p className="text-sm text-brand-mist/60">{title}</p>
        <p className="mt-1 text-2xl font-black text-white sm:text-3xl">{error ? __msg("admin.unavailable") : empty ? "0" : value}</p>
        <p className="mt-1 min-h-10 text-sm leading-5 text-brand-mist/55">{error ? __msg("fan.thisValueCouldNotBeLoaded") : help}</p>
      </div>
      {to && actionLabel ? (
        <Link className="mt-3 inline-flex w-fit items-center gap-2 rounded-full text-sm font-semibold text-brand-secondary outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark" to={to}>
          {actionLabel} <FiArrowRight data-ui-directional="true" />
        </Link>
      ) : null}
    </article>
  );
}

export function ProfileSummaryCard({ profile, loading, error, onRetry }) {
  __useUiLanguage();
  if (loading) {
    return <ListSkeleton count={1} />;
  }

  if (error) {
    return <DashboardErrorState message={__msg("fan.unableToLoadProfileSummary")} onRetry={onRetry} />;
  }

  if (!profile) {
    return <DashboardEmptyState icon={FiUser} message={__msg("fan.profileDetailsAreNotAvailable")} />;
  }

  const completion = profile.completionPercentage ?? 0;
  const needsAttention = completion < 100;

  return (
    <section className="rounded-3xl border border-white/10 bg-brand-dark/60 p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={profile.displayName || profile.username} src={profile.avatarUrl} size="h-14 w-14" />
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-white">{profile.displayName || profile.username || __msg("fan.atseenFan")}</h3>
            {profile.username ? <p dir="auto" className="truncate text-sm text-brand-mist/60">@{profile.username}</p> : null}
            {profile.email ? (
              <p dir="auto" className="mt-1 truncate text-sm text-brand-mist/55" title={profile.email}>
                {profile.email}
              </p>
            ) : null}
          </div>
        </div>
        <Link to="/settings/profile">
          <Button className="w-full sm:w-auto" type="button" variant="secondary">
            <FiEdit3 className="me-2" />{__msg("fan.editProfile")}</Button>
        </Link>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <InfoPill icon={FiEye} label={__msg("fan.visibility")} value={profile.profileVisibility || "private"} />
        <InfoPill icon={FiCalendar} label={__msg("fan.joined")} value={formatDate(profile.joinedAt)} />
        {profile.preferredLanguage ? <InfoPill icon={FiMessageCircle} label={__msg("fan.language")} value={profile.preferredLanguage} /> : null}
        {profile.timezone ? <InfoPill icon={FiClock} label={__msg("fan.timeZone")} value={profile.timezone} /> : null}
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-brand-mist/65">{__msg("fan.profileCompletion")}</span>
          <span className="font-bold text-brand-secondary">{completion}%</span>
        </div>
        <div
          aria-label={__msg("fan.profileCompletion")}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={completion}
          className="h-2.5 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
        >
          <div className="h-full rounded-full bg-brand-primary" style={{ width: `${completion}%` }} />
        </div>
        {needsAttention ? (
          <p className="mt-3 rounded-2xl bg-brand-secondary/10 px-4 py-2 text-sm text-brand-secondary">{__msg("fan.addAProfilePhotoToHelpCreatorsRecognizeYou")}</p>
        ) : null}
      </div>
    </section>
  );
}

function InfoPill({ icon: Icon, label, value }) {
  __useUiLanguage();
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
  __useUiLanguage();
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
            <h4 className="truncate font-bold text-white">{subscription.creator?.displayName || __msg("fan.creatorUnavailable")}</h4>
            <p className="truncate text-sm text-brand-mist/55">@{subscription.creator?.username || __msg("admin.unknown")}</p>
          </div>
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass}`}>{__enumLabel(subscription.status)}</span>
      </div>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <Detail label={__msg("fan.nextRenewal")} value={subscription.nextRenewalDate ? formatDate(subscription.nextRenewalDate) : "Not scheduled"} />
        <Detail label={__msg("fan.price")} value={subscription.priceCents == null ? "Not recorded" : `$${(subscription.priceCents / 100).toFixed(2)}`} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {subscription.trialStatus ? <Badge label={__msg("fan.trial", { value0: subscription.trialStatus })} /> : null}
        {subscription.gracePeriod ? <Badge label={__msg("fan.gracePeriod")} /> : null}
        {subscription.isExpiringSoon ? <Badge label={__msg("fan.expiringSoon")} /> : null}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {subscription.creator?.username ? (
          <Link className="inline-flex items-center justify-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark" to={`/creators/${subscription.creator.username}`}>{__msg("fan.viewCreator")}</Link>
        ) : null}
        {showManage ? (
          <Button disabled type="button" variant="ghost">{__msg("fan.manageSubscription")}</Button>
        ) : null}
      </div>
    </article>
  );
}

function Badge({ label }) {
  __useUiLanguage();
  return <span className="rounded-full bg-brand-secondary/10 px-3 py-1 text-xs font-semibold text-brand-secondary">{label}</span>;
}

function Detail({ label, value }) {
  __useUiLanguage();
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
  __useUiLanguage();
  const isCredit = transaction.direction === "credit";
  const statusLabel = {
    completed: __msg("fan.captured"),
    pending: __msg("fan.held_87807a"),
    refunded: __msg("fan.refunded"),
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
  __useUiLanguage();
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
      <h4 className="mt-4 line-clamp-2 font-bold text-white">{item.title || __msg("fan.thisContentIsNoLongerAvailable")}</h4>
      <p className="mt-1 text-sm text-brand-mist/55">@{item.creator?.username || __msg("admin.unknown")}</p>
      <div className="mt-3 grid gap-2 text-sm text-brand-mist/60">
        <span>{item.contentType || __msg("fan.content")} - {formatDate(item.unlockedAt)}</span>
        <span>{formatCoins(item.coinAmount || 0)} - {item.accessStatus || __msg("admin.unavailable")}</span>
      </div>
      <Button className="mt-4 w-full" disabled type="button" variant="ghost">{__msg("fan.viewContent")}</Button>
    </article>
  );
}

export function ConversationPreviewRow({ conversation }) {
  __useUiLanguage();
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={conversation.creator?.displayName} src={conversation.creator?.avatarUrl} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{conversation.creator?.displayName || __msg("fan.creatorUnavailable")}</p>
          <p className="truncate text-sm text-brand-mist/55">{conversation.lastMessagePreview || __msg("fan.noMessagePreviewAvailable")}</p>
          <p className="mt-1 text-xs text-brand-mist/45">{formatDateTime(conversation.lastMessageAt)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {conversation.ppm ? <Badge label={__msg("fan.ppm")} /> : null}
        {conversation.unread ? <span className="h-2.5 w-2.5 rounded-full bg-brand-primary" aria-label={__msg("fan.unread")} /> : null}
        <Button disabled type="button" variant="ghost">{__msg("fan.openConversation")}</Button>
      </div>
    </div>
  );
}

export function ActivityRow({ activity }) {
  __useUiLanguage();
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
          {activity.relatedCreator ? <p dir="auto" className="mt-1 text-sm text-brand-mist/55">@{activity.relatedCreator.username}</p> : null}
          <p className="mt-1 text-xs text-brand-mist/45">{formatDateTime(activity.createdAt)}</p>
        </div>
      </div>
      {activity.actionPath ? (
        <Link className="inline-flex w-fit items-center gap-2 rounded-full text-sm font-semibold text-brand-secondary outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark" to={activity.actionPath}>{__msg("fan.open")}<FiArrowRight data-ui-directional="true" />
        </Link>
      ) : null}
    </div>
  );
}

export function QuickActions({ capabilities = {} }) {
  __useUiLanguage();
  const actions = [
    capabilities.discoverCreators ? { label: __msg("fan.discoverCreators"), to: "/", icon: FiUser } : null,
    { label: __msg("fan.openWallet"), to: "/fan/wallet", icon: FiCreditCard },
    { label: __msg("fan.viewSubscriptions"), to: "/fan/subscriptions", icon: FiCheckCircle },
    { label: __msg("fan.viewPurchasedContent"), to: "/fan/purchases", icon: FiLock },
    { label: __msg("fan.openMessages"), to: "/fan/messages", icon: FiMessageCircle },
    { label: __msg("fan.editProfile"), to: "/settings/profile", icon: FiEdit3 },
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
          <FiArrowRight data-ui-directional="true" className="text-brand-mist/45" />
        </Link>
      ))}
    </div>
  );
}

export function DisabledActionNotice({ children }) {
  __useUiLanguage();
  return (
    <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-brand-mist/65">
      {children}
    </p>
  );
}

export function FilterPills({ filters, active, onChange }) {
  __useUiLanguage();
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
