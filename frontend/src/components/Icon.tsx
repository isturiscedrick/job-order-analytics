function iconPath(name: string) {
  switch (name) {
    case "grid":
      return <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>;
    case "orders":
      return <><path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z" /><path d="M14 3.5V8h4M8.5 12h7M8.5 16h7" /></>;
    case "company":
      return <><rect x="3.5" y="7" width="17" height="14" rx="1.5" /><path d="M8 7V4h8v3M8 11v2m4-2v2m4-2v2M8 17v4m8-4v4" /></>;
    case "calendar":
      return <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18" /></>;
    case "filter":
      return <><path d="M4 5h16M7 12h10m-7 7h4" /><circle cx="8" cy="5" r="1.4" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none" /></>;
    case "check":
      return <><path d="m5 12 4.2 4.2L19 6.5" /></>;
    case "ban":
      return <><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></>;
    case "building":
      return <><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2M10 21v-3h4v3" /></>;
    case "menu":
      return <><path d="M4 6h16M4 12h16M4 18h16" /></>;
    case "chevron":
      return <path d="m9 18 6-6-6-6" />;
    case "activity":
      return <><path d="M3 12h4l3-7 4 14 3-7h4" /></>;
    case "clock":
      return <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>;
    case "archive":
      return <><rect x="3.5" y="4" width="17" height="4.5" rx="1" /><path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5M10 13h4" /></>;
    default:
      return <circle cx="12" cy="12" r="8" />;
  }
}

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPath(name)}
    </svg>
  );
}