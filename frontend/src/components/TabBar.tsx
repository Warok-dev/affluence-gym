import { ROUTES } from "../router";
import { useT } from "../i18n";
import { BoardIcon, DumbbellIcon } from "./icons";

interface Props {
  route: string;
  workoutInProgress: boolean;
}

/** Bottom tab bar: the two places of the app, always one thumb away. */
export function TabBar({ route, workoutInProgress }: Props) {
  const t = useT();
  const onWorkouts = route.startsWith(ROUTES.workouts);
  const tabs = [
    { href: ROUTES.occupancy, label: t.tabOccupancy, icon: <BoardIcon />, current: !onWorkouts },
    {
      href: workoutInProgress ? ROUTES.activeWorkout : ROUTES.workouts,
      label: t.tabWorkouts,
      icon: <DumbbellIcon />,
      current: onWorkouts,
      badge: workoutInProgress ? t.inProgress : null,
    },
  ];
  return (
    <nav className="tabbar" aria-label={t.navLabel}>
      {tabs.map((tab) => (
        <a key={tab.label} href={`#${tab.href}`} className="tabbar-item" aria-current={tab.current ? "page" : undefined}>
          {tab.icon}
          <span>{tab.label}</span>
          {tab.badge && <span className="tabbar-badge">{tab.badge}</span>}
        </a>
      ))}
    </nav>
  );
}
