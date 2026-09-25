// Lucide icons as inline SVG strings, for use inside the innerHTML
// templates every screen already builds. Only the icons listed here are
// bundled (named imports tree-shake), so the APK stays fully offline and
// small. To use a new icon: import it below, add it to ICONS, then call
// icon('its-kebab-name').
//
// Icons are decorative by default (aria-hidden) because they sit next to a
// text label. Pass `label` when an icon is the only thing inside a button
// or conveys status on its own.

import {
  ALargeSmall, ArrowLeft, Award, BadgeCheck, Bone, Box, ChartColumn, Check, ChevronRight,
  CircleAlert, CircleCheck, CirclePlay, CircleUser, CircleX, ClipboardCheck, Clock, Cog,
  Construction, Copy, Download, Droplet, ExternalLink, Eye, Factory, FileText, Flame,
  FlaskConical, Footprints, Forklift, Gamepad2, HandHeart, HardHat, HeartPulse, Hourglass,
  House, IdCard, Images, Info, KeyRound, Landmark, Languages, ListChecks, Lock, LogIn, LogOut,
  MapPin, MessageSquareWarning, Mic, Mountain, Move3d, Pencil, Percent, Phone, Pickaxe,
  QrCode, RotateCcw, Rotate3d, Save, Scan, ScanQrCode, Shield, ShieldAlert, ShieldCheck, Shirt,
  Siren, Smartphone, Square, TriangleAlert, Trophy, Upload, UserCog, UserPlus, UserRound,
  UserRoundCheck, UserRoundX, Users, Volume2, VolumeX, Wind, WifiOff, X, Zap, Camera, Hand,
} from 'lucide'

const ICONS = {
  'a-large-small': ALargeSmall, 'arrow-left': ArrowLeft, award: Award, 'badge-check': BadgeCheck,
  bone: Bone, box: Box, 'chart-column': ChartColumn, check: Check, 'chevron-right': ChevronRight,
  'circle-alert': CircleAlert, 'circle-check': CircleCheck, 'circle-play': CirclePlay,
  'circle-user': CircleUser, 'circle-x': CircleX, 'clipboard-check': ClipboardCheck, clock: Clock,
  cog: Cog, construction: Construction, copy: Copy, download: Download, droplet: Droplet,
  'external-link': ExternalLink, eye: Eye, factory: Factory, 'file-text': FileText, flame: Flame,
  'flask-conical': FlaskConical, footprints: Footprints, forklift: Forklift, 'gamepad-2': Gamepad2,
  'hand-heart': HandHeart, 'hard-hat': HardHat, 'heart-pulse': HeartPulse, hourglass: Hourglass,
  house: House, 'id-card': IdCard, images: Images, info: Info, 'key-round': KeyRound,
  landmark: Landmark, languages: Languages, 'list-checks': ListChecks, lock: Lock, 'log-in': LogIn,
  'log-out': LogOut, 'map-pin': MapPin, 'message-square-warning': MessageSquareWarning, mic: Mic,
  mountain: Mountain, 'move-3d': Move3d, pencil: Pencil, percent: Percent, phone: Phone,
  pickaxe: Pickaxe, 'qr-code': QrCode, 'rotate-ccw': RotateCcw, 'rotate-3d': Rotate3d, save: Save,
  scan: Scan, 'scan-qr-code': ScanQrCode, shield: Shield, 'shield-alert': ShieldAlert,
  'shield-check': ShieldCheck, shirt: Shirt, siren: Siren, smartphone: Smartphone, square: Square,
  'triangle-alert': TriangleAlert, trophy: Trophy, upload: Upload, 'user-cog': UserCog,
  'user-plus': UserPlus, 'user-round': UserRound, 'user-round-check': UserRoundCheck,
  'user-round-x': UserRoundX, users: Users, 'volume-2': Volume2, 'volume-x': VolumeX, wind: Wind,
  'wifi-off': WifiOff, x: X, zap: Zap, camera: Camera, hand: Hand,
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/**
 * @param {string} name   kebab-case Lucide name registered in ICONS
 * @param {{size?: number, cls?: string, label?: string, stroke?: number}} [opts]
 * @returns {string} an <svg> string
 */
export function icon(name, { size = 24, cls = '', label = '', stroke = 2 } = {}) {
  const node = ICONS[name]
  if (!node) {
    console.warn(`icon(): "${name}" is not registered in shared/ui/icon.js`)
    return ''
  }
  const children = node
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')}/>`)
    .join('')
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true" focusable="false"'
  return `<svg class="icon ${cls}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${children}</svg>`
}

// Picture for each training module, keyed by modules.js's `domain`.
export const MODULE_ICONS = {
  'ppe-compliance': 'hard-hat',
  'machinery-safety': 'cog',
  'fire-explosion': 'flame',
  'gas-leak': 'wind',
  'chemical-hazard': 'flask-conical',
  'emergency-response': 'siren',
}

// Picture for each gallery item, keyed by ppeItems.js / machineryItems.js id.
export const ITEM_ICONS = {
  'ppe-helmet': 'hard-hat',
  'ppe-scsr': 'wind',
  'ppe-vest': 'shirt',
  'ppe-boots': 'footprints',
  'ppe-gas-detector': 'triangle-alert',
  forklift: 'forklift',
  'conveyor-belt': 'construction',
}
