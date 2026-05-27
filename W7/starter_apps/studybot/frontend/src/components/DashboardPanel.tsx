import { Activity, CalendarDays, Flame, LayoutDashboard, MessageSquareText } from "lucide-react";
import type { DashboardResponse } from "../api";
import type { Dictionary } from "../i18n";

type Props = {
  t: Dictionary;
  dashboard: DashboardResponse | null;
  loading: boolean;
  onRefresh: () => void;
};

const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });

export function DashboardPanel({ t, dashboard, loading, onRefresh }: Props) {
  const maxTotal = Math.max(
    1,
    ...(dashboard?.activity.map((day) => day.queries + day.docs + day.cards + day.quiz) || [1])
  );

  return (
    <div className="animate-fade-scale">
      <div className="workspace-header">
        <div className="workspace-icon" style={{ background: "linear-gradient(135deg, #4f46e5, #06b6d4)" }}>
          <LayoutDashboard className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="workspace-title">{t.dashboardTitle}</h2>
          <p className="workspace-subtitle">
            {dashboard ? `${dashboard.week_start} - ${dashboard.week_end}` : t.loadingDashboard}
          </p>
        </div>
        <button className="btn-secondary shrink-0" onClick={onRefresh} disabled={loading}>
          <Activity className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{t.refresh}</span>
        </button>
      </div>

      {!dashboard ? (
        <div className="empty-state">
          <LayoutDashboard className="mb-3 h-8 w-8 opacity-50" />
          <p className="text-sm font-semibold">{loading ? t.loadingDashboard : t.noDashboard}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard icon={Flame} label={t.activeDays} value={`${dashboard.active_days}/7`} color="#f59e0b" />
            <MetricCard icon={MessageSquareText} label={t.questionsThisWeek} value={String(dashboard.studied_count)} color="#06b6d4" />
            <MetricCard icon={CalendarDays} label={t.topicsThisWeek} value={String(dashboard.topics.length)} color="#10b981" />
          </div>

          <section className="panel panel-pad">
            <h3 className="mb-4 text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {t.weeklyActivity}
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {dashboard.activity.map((day) => {
                const total = day.queries + day.docs + day.cards + day.quiz;
                const height = 18 + Math.round((total / maxTotal) * 72);
                return (
                  <div key={day.date} className="flex min-w-0 flex-col items-center gap-2">
                    <div className="flex h-24 w-full items-end rounded-lg px-1.5 py-1.5" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                      <div
                        className="w-full rounded-md"
                        title={`${total} activities`}
                        style={{
                          height,
                          background: total ? "linear-gradient(180deg, #06b6d4, #4f46e5)" : "var(--surface-3)",
                        }}
                      />
                    </div>
                    <span className="truncate text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
                      {dayFormatter.format(new Date(`${day.date}T00:00:00`))}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel panel-pad">
            <h3 className="mb-3 text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {t.topicsStudied}
            </h3>
            {dashboard.topics.length ? (
              <div className="flex flex-wrap gap-2">
                {dashboard.topics.map((item) => (
                  <span key={item.topic} className="badge-cyan">
                    {item.topic}
                    <span className="tabular-nums opacity-70">{item.count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t.noTopics}</p>
            )}
          </section>

          <section className="panel panel-pad">
            <h3 className="mb-3 text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {t.recentStudyQuestions}
            </h3>
            <div className="grid gap-2">
              {dashboard.recent_queries.length ? dashboard.recent_queries.map((item, index) => (
                <article key={`${item.created_at}-${index}`} className="rounded-xl border p-3" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.query}</p>
                  {item.created_at && <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{item.created_at}</p>}
                </article>
              )) : (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t.noRecentQuestions}</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</span>
      </div>
      <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{label}</p>
    </section>
  );
}
