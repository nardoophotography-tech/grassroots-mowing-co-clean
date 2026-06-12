import * as React from 'react';
import { cn } from '@/lib/utils';

interface AboriginalFlagBadgeProps {
  /** Rendered height in px (width follows the flag's 3:2 ratio). */
  height?: number;
  className?: string;
  /** Optional accessible label override. */
  title?: string;
}

/**
 * A small, respectful Aboriginal flag badge.
 * - Accurate design: top half black, bottom half red, centred yellow circle.
 * - Official flag colours (black, red #CC0000, yellow #FFCC00).
 * - Fixed 3:2 ratio so the flag is never distorted.
 * - Intended only as a small badge in the header/footer — never a background.
 */
export const AboriginalFlagBadge: React.FC<AboriginalFlagBadgeProps> = ({
  height = 20,
  className,
  title = 'Aboriginal flag',
}) => {
  const width = Math.round(height * 1.5);
  return (
    <span
      className={cn('aboriginal-flag-badge', className)}
      style={{ width, height }}
      role="img"
      aria-label={title}
      title={title}
    >
      <svg width={width} height={height} viewBox="0 0 150 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <rect x="0" y="0" width="150" height="50" fill="#000000" />
        <rect x="0" y="50" width="150" height="50" fill="#CC0000" />
        <circle cx="75" cy="50" r="22" fill="#FFCC00" />
      </svg>
    </span>
  );
};

export default AboriginalFlagBadge;
