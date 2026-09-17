"use client";

import { formatDuration, eachDateInclusive, todayWorkDate, weekBounds, weekRemainingSeconds, elapsedWeekdays } from "@/lib/time";
import { useMyTimesheet, useWorkspaceTimesheet } from "@/lib/hooks";
import { useWorkspace } from "@/components/workspace-context";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function hoursLabel(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = seconds / 3600;
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
}

export function WeekTimesheet() {
  const t = useT();
  const { currentUser, workspace } = useWorkspace();
  const today = todayWorkDate();
  const { from, to } = weekBounds(today);
  const dates = eachDateInclusive(from, to);
  const mine = useMyTimesheet(from, to);
  const role = workspace.members.find((m) => m.user.id === currentUser.id)?.role;
  const isLead = role === "OWNER" || role === "ADMIN";
  const team = useWorkspaceTimesheet(from, to, isLead);

  const capMinutes = mine.data?.capMinutes ?? workspace.dailyHourCapMinutes ?? 600;
  const filled = (mine.data?.days ?? []).reduce((sum, d) => sum + d.seconds, 0);
  const remaining = weekRemainingSeconds({ filledSeconds: filled, capMinutes, from, to, today });
  const quota = elapsedWeekdays(from, to, today) * capMinutes * 60;
  const byDate = Object.fromEntries((mine.data?.days ?? []).map((d) => [d.date, d.seconds]));

  return (
    <section className="mb-6 rounded-lg border border-cu-border p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-semibold text-cu-text">{t("home.timesheet")}</h2>
        <p className="text-[12px] text-cu-text-secondary">
          {t("time.weekFilled", { filled: formatDuration(filled), quota: formatDuration(quota) })}
          {" · "}
          {t("time.remaining", { hours: formatDuration(remaining) })}
        </p>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dates.map((d) => {
          const sec = byDate[d] ?? 0;
          const capSec = capMinutes * 60;
          const isToday = d === today;
          const short = d.slice(5);
          return (
            <div
              key={d}
              className={cn(
                "rounded-md border px-1.5 py-1 text-center",
                isToday ? "border-cu-purple" : "border-cu-border/70",
                sec > 0 && sec < capSec && "bg-cu-hover",
              )}
            >
              <div className="text-[10px] text-cu-text-tertiary">{short}</div>
              <div className="text-[12px] tabular-nums text-cu-text">{hoursLabel(sec)}</div>
            </div>
          );
        })}
      </div>

      {isLead && (
        <div className="mt-4 overflow-x-auto">
          <p className="mb-1.5 text-[12px] font-medium text-cu-text">{t("time.teamWeek")}</p>
          <table className="w-full min-w-[32rem] text-left text-[12px]">
            <thead>
              <tr className="text-cu-text-tertiary">
                <th className="py-1 pr-2 font-medium">{t("filter.assignee")}</th>
                {dates.map((d) => (
                  <th key={d} className="px-1 py-1 text-center font-medium tabular-nums">
                    {d.slice(5)}
                  </th>
                ))}
                <th className="py-1 pl-2 text-right font-medium">{t("time.total")}</th>
              </tr>
            </thead>
            <tbody>
              {(team.data?.members ?? []).map((m) => {
                const weekSum = dates.reduce((sum, d) => sum + (m.days[d] ?? 0), 0);
                const gap = weekRemainingSeconds({
                  filledSeconds: weekSum,
                  capMinutes,
                  from,
                  to,
                  today,
                });
                return (
                  <tr key={m.userId} className="border-t border-cu-border/60">
                    <td className="py-1.5 pr-2 text-cu-text">{m.name}</td>
                    {dates.map((d) => {
                      const sec = m.days[d] ?? 0;
                      const under = sec > 0 && sec < capMinutes * 60;
                      return (
                        <td
                          key={d}
                          className={cn(
                            "px-1 py-1.5 text-center tabular-nums",
                            under ? "text-cu-text-secondary" : "text-cu-text",
                          )}
                          title={under ? t("time.unfilled") : undefined}
                        >
                          {hoursLabel(sec)}
                        </td>
                      );
                    })}
                    <td className="py-1.5 pl-2 text-right tabular-nums text-cu-text">
                      {formatDuration(weekSum)}
                      {gap > 0 ? (
                        <span className="ml-1 text-cu-text-tertiary">({formatDuration(gap)})</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
