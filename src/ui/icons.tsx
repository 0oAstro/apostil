import type { ReactNode } from "react";

const icon = (children: ReactNode, size = 16) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const MenuIcon = () => icon(<path d="M2.5 5.5h11M2.5 10.5h11" />);
export const CloseIcon = () => icon(<path d="M4 4l8 8M12 4l-8 8" />);
export const ChevronIcon = () => icon(<path d="M4.5 6.5L8 10l3.5-3.5" />, 12);
export const ChevronRight = () => icon(<path d="M6 3.5L10.5 8 6 12.5" />);
export const ChevronLeft = () => icon(<path d="M10 3.5L5.5 8l4.5 4.5" />);
export const ReplayIcon = () => icon(<path d="M3 8a5 5 0 1 0 1.6-3.7M3 3v2.8h2.8" />);
export const SendIcon = () => icon(<path d="M8 13V3.5M4 7l4-4 4 4" />);
export const PenIcon = () => icon(<path d="M3 13l.7-2.8L10.8 3a1.3 1.3 0 0 1 1.9 0l.3.3a1.3 1.3 0 0 1 0 1.9L5.8 12.3 3 13z" />, 14);
export const ShareIcon = () => icon(<path d="M8 10V2.5M5 5l3-3 3 3M3 9v3.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9" />, 14);
export const ChatIcon = () => icon(<path d="M2.5 4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H7L4 14v-2.5h-.5a1 1 0 0 1-1-1V4z" />, 14);
export const SearchIcon = () => icon(<path d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM14 14l-3.4-3.4" />, 14);
export const PlusIcon = () => icon(<path d="M8 3v10M3 8h10" />, 14);
