import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { msg, systemMessage, getLocale } from '../../i18n/runtime';
import { fanService } from '../../services/fanService';
import { loadFirstWeekActivity } from '../../utils/firstWeekActivity';
import SeenEyeMark from '../../components/branding/SeenEyeMark';

export default function FirstWeekNotifications() {
  useLanguage();
  const { user } = useAuth();
  // Existing accounts should see the real notifications they can see in Activity,
  // rather than an empty, historical signup-week filter.
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const since = weekStart.toISOString();
  const query = useQuery({
    queryKey: ['fan', 'activity', 'first-week', user?.id || user?._id, since],
    queryFn: ({ signal }) => loadFirstWeekActivity(fanService.getActivity, since, signal),
    enabled: Boolean(user?.id || user?._id),
    staleTime: 30000,
  });
  return <>
    <p className="notification-week-intro">{msg('settings.firstWeekExplanation')}</p>
    {query.isPending ? <p className="notification-week-status" role="status">{msg('admin.loading')}</p> : null}
    {query.isError ? <div className="notification-week-status" role="alert"><p>{msg('settings.firstWeekUnavailable')}</p><button onClick={() => query.refetch()} type="button">{msg('discover.tryAgain')}</button></div> : null}
    {query.isSuccess && !query.data.length ? <p className="notification-week-status">{msg('settings.firstWeekQuiet')}</p> : null}
    <div className="notification-week-list">
      {(query.data || []).map(item => <article className="notification-week-card" key={item.id}>
        <span className="notification-week-icon" aria-hidden="true"><span><SeenEyeMark /></span></span>
        <div className="notification-week-copy"><div><b>@seen</b><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' })}</time></div><p dir="auto">{systemMessage(item.text)}</p></div>
      </article>)}
    </div>
  </>;
}
