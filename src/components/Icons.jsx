import React from 'react';

const Icon = ({ size = 18, children, style }) => (
  <svg
    width={size} height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    {children}
  </svg>
);

export const PlayIcon = ({ size }) => (
  <Icon size={size}><polygon points="5 3 19 12 5 21 5 3" /></Icon>
);

export const PauseIcon = ({ size }) => (
  <Icon size={size}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></Icon>
);

export const SkipNextIcon = ({ size }) => (
  <Icon size={size}><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></Icon>
);

export const SkipPrevIcon = ({ size }) => (
  <Icon size={size}><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></Icon>
);

export const RepeatIcon = ({ size }) => (
  <Icon size={size}>
    <polyline points="17 1 21 5 17 9"/>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
    <polyline points="7 23 3 19 7 15"/>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </Icon>
);

export const Repeat1Icon = ({ size }) => (
  <Icon size={size}>
    <polyline points="17 1 21 5 17 9"/>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
    <polyline points="7 23 3 19 7 15"/>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    <line x1="12" y1="8" x2="12" y2="16"/>
  </Icon>
);

export const MicIcon = ({ size }) => (
  <Icon size={size}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </Icon>
);

export const MusicIcon = ({ size }) => (
  <Icon size={size}>
    <path d="M9 18V5l12-2v13"/>
    <circle cx="6" cy="18" r="3"/>
    <circle cx="18" cy="16" r="3"/>
  </Icon>
);

export const ChevronDownIcon = ({ size }) => (
  <Icon size={size}><polyline points="6 9 12 15 18 9"/></Icon>
);

export const XIcon = ({ size }) => (
  <Icon size={size}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Icon>
);

export const MaximizeIcon = ({ size }) => (
  <Icon size={size}>
    <polyline points="15 3 21 3 21 9"/>
    <polyline points="9 21 3 21 3 15"/>
    <line x1="21" y1="3" x2="14" y2="10"/>
    <line x1="3" y1="21" x2="10" y2="14"/>
  </Icon>
);

export const MinimizeIcon = ({ size }) => (
  <Icon size={size}>
    <polyline points="4 14 10 14 10 20"/>
    <polyline points="20 10 14 10 14 4"/>
    <line x1="10" y1="14" x2="3" y2="21"/>
    <line x1="21" y1="3" x2="14" y2="10"/>
  </Icon>
);

export const SunIcon = ({ size }) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </Icon>
);

export const MoonIcon = ({ size }) => (
  <Icon size={size}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></Icon>
);

export const SearchIcon = ({ size }) => (
  <Icon size={size}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Icon>
);

export const ListIcon = ({ size }) => (
  <Icon size={size}>
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </Icon>
);

export const GridIcon = ({ size }) => (
  <Icon size={size}>
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </Icon>
);

export const PlusIcon = ({ size }) => (
  <Icon size={size}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Icon>
);

export const EditIcon = ({ size }) => (
  <Icon size={size}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Icon>
);

export const TrashIcon = ({ size }) => (
  <Icon size={size}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></Icon>
);

export const GripIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
    <circle cx="5" cy="4" r="1.2"/><circle cx="11" cy="4" r="1.2"/>
    <circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/>
    <circle cx="5" cy="12" r="1.2"/><circle cx="11" cy="12" r="1.2"/>
  </svg>
);

export const VolumeIcon = ({ size }) => (
  <Icon size={size}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </Icon>
);

export const LockIcon = ({ size }) => (
  <Icon size={size}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Icon>
);
