import type { CSSProperties } from "react";

/** Theme-aware Recharts styles driven by CSS variables in index.css */
export function getChartTheme() {
  const read = (name: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  return {
    gridStroke: read("--chart-grid"),
    axisStroke: read("--chart-axis"),
    tooltipStyle: {
      backgroundColor: read("--chart-tooltip-bg"),
      border: `1px solid ${read("--chart-tooltip-border")}`,
      borderRadius: "8px",
      color: read("--chart-tooltip-fg"),
    } satisfies CSSProperties,
    legendStyle: { color: read("--chart-axis") } satisfies CSSProperties,
    colors: {
      violet: read("--primary"),
      cyan: read("--info"),
      emerald: read("--success"),
      blue: read("--info"),
    },
  };
}
