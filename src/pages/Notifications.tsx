import { api, errMsg } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Empty, ErrorBox, PageHeader, Spinner } from '../components/ui';
import type { AppNotification } from '../lib/types';
import { fmtDateTime } from '../lib/utils';

const icon = { assignment: '📝', rotation: '🔄', info: 'ℹ️' };

export default function Notifications() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.list<AppNotification>('notifications', { userId: user!.id, _sort: 'createdAt', _order: 'desc' }), [user?.id]);
  const unread = (data ?? []).filter((n) => !n.read);

  const mark = async (items: AppNotification[]) => {
    try { await Promise.all(items.map((n) => api.update('notifications', n.id, { read: true }))); reload(); }
    catch (e) { toast('error', errMsg(e)); }
  };

  return (
    <div>
      <PageHeader title="Notifications" subtitle={`${unread.length} unread`}>
        <button className="btn-secondary" disabled={!unread.length} onClick={() => mark(unread).then(() => toast('success', 'All marked as read.'))}>Mark all as read</button>
      </PageHeader>
      <div className="card divide-y divide-slate-100">
        {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.length ? <Empty text="You have no notifications." /> : data.map((n) => (
          <div key={n.id} className={`flex items-start gap-3 px-4 py-3 ${n.read ? '' : 'bg-brand-50'}`}>
            <span className="text-xl">{icon[n.type]}</span>
            <div className="flex-1"><p className="text-sm text-slate-800">{n.message}</p><p className="text-xs text-slate-400">{fmtDateTime(n.createdAt)}</p></div>
            {!n.read && <button className="btn-secondary btn-sm" onClick={() => mark([n])}>Mark read</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
