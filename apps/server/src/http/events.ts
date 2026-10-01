export type DashboardEvent = {
  type: "dashboard.updated";
  at: string;
};

const subscribers = new Set<(event: DashboardEvent) => void>();

export function subscribeDashboard(
  subscriber: (event: DashboardEvent) => void,
) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export function publishDashboardUpdate() {
  const event: DashboardEvent = {
    type: "dashboard.updated",
    at: new Date().toISOString(),
  };
  for (const subscriber of subscribers) subscriber(event);
}
