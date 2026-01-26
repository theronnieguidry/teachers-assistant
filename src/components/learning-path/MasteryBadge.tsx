import { type MasteryState } from "@/types";
import { CheckCircle2, Circle, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface MasteryBadgeProps {
  state: MasteryState;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const stateConfig: Record<
  MasteryState,
  {
    icon: typeof CheckCircle2;
    label: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
  }
> = {
  not_started: {
    icon: Circle,
    label: "Not Started",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    borderColor: "border-muted-foreground/30",
  },
  in_progress: {
    icon: Clock,
    label: "In Progress",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-400",
    borderColor: "border-amber-400",
  },
  mastered: {
    icon: CheckCircle2,
    label: "Mastered",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-700 dark:text-green-400",
    borderColor: "border-green-500",
  },
  needs_review: {
    icon: RefreshCw,
    label: "Needs Review",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    textColor: "text-orange-700 dark:text-orange-400",
    borderColor: "border-orange-500",
  },
};

const sizeConfig = {
  sm: {
    wrapper: "h-5 px-1.5 text-xs gap-1",
    icon: "h-3 w-3",
    iconOnly: "h-5 w-5",
  },
  md: {
    wrapper: "h-6 px-2 text-sm gap-1.5",
    icon: "h-4 w-4",
    iconOnly: "h-6 w-6",
  },
  lg: {
    wrapper: "h-8 px-3 text-sm gap-2",
    icon: "h-5 w-5",
    iconOnly: "h-8 w-8",
  },
};

export function MasteryBadge({
  state,
  size = "md",
  showLabel = false,
  className,
}: MasteryBadgeProps) {
  const config = stateConfig[state];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  if (!showLabel) {
    return (
      <div
        className={cn(
          "rounded-full flex items-center justify-center border",
          config.bgColor,
          config.borderColor,
          sizes.iconOnly,
          className
        )}
        title={config.label}
      >
        <Icon className={cn(config.textColor, sizes.icon)} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizes.wrapper,
        className
      )}
    >
      <Icon className={sizes.icon} />
      <span>{config.label}</span>
    </div>
  );
}

// Standalone icon for compact displays
export function MasteryIcon({
  state,
  className,
}: {
  state: MasteryState;
  className?: string;
}) {
  const config = stateConfig[state];
  const Icon = config.icon;
  return <Icon className={cn(config.textColor, className)} />;
}
