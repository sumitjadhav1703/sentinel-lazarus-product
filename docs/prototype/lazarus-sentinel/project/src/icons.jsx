// Minimal line icons — 1.5px stroke, rounded

const Icon = ({ d, size = 16, stroke = 'currentColor', sw = 1.5, fill = 'none', children, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {d ? <path d={d} /> : children}
  </svg>
);

const IconServer     = (p) => <Icon {...p}><rect x="3" y="4"  width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><circle cx="7" cy="7.5" r="0.5" fill="currentColor"/><circle cx="7" cy="16.5" r="0.5" fill="currentColor"/></Icon>;
const IconTerminal   = (p) => <Icon {...p}><polyline points="5 8 9 12 5 16"/><line x1="12" y1="17" x2="19" y2="17"/></Icon>;
const IconGrid       = (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></Icon>;
const IconHistory    = (p) => <Icon {...p}><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 9 8 9"/><polyline points="12 7 12 12 15 14"/></Icon>;
const IconSettings   = (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></Icon>;
const IconPlus       = (p) => <Icon {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Icon>;
const IconPlay       = (p) => <Icon {...p}><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/></Icon>;
const IconCheck      = (p) => <Icon {...p}><polyline points="5 12 10 17 19 7"/></Icon>;
const IconX          = (p) => <Icon {...p}><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></Icon>;
const IconWarn       = (p) => <Icon {...p}><path d="M12 3 2 20h20L12 3z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></Icon>;
const IconSearch     = (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.5" y2="16.5"/></Icon>;
const IconArrowRight = (p) => <Icon {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></Icon>;
const IconChevron    = (p) => <Icon {...p}><polyline points="9 6 15 12 9 18"/></Icon>;
const IconDot        = (p) => <Icon {...p}><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></Icon>;
const IconCopy       = (p) => <Icon {...p}><rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></Icon>;
const IconSun        = (p) => <Icon {...p}><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.1" y2="19.1"/><line x1="4.9" y1="19.1" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.1" y2="4.9"/></Icon>;
const IconMoon       = (p) => <Icon {...p}><path d="M20 15.5A8 8 0 1 1 8.5 4a6.5 6.5 0 0 0 11.5 11.5z"/></Icon>;
const IconBook       = (p) => <Icon {...p}><path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z"/><path d="M4 17a3 3 0 0 1 3-3h12"/></Icon>;

Object.assign(window, {
  Icon, IconServer, IconTerminal, IconGrid, IconHistory, IconSettings,
  IconPlus, IconPlay, IconCheck, IconX, IconWarn, IconSearch,
  IconArrowRight, IconChevron, IconDot, IconCopy, IconSun, IconMoon, IconBook
});
