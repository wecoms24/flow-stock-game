/* ── [Design Track] SVG 16x16 Pixel Icons ── */
/* All icons are pure SVG rendered inline, no external assets needed */

const ICONS: Record<string, string> = {
  portfolio: `<rect x="2" y="1" width="12" height="14" fill="#C0C0C0" stroke="#000" stroke-width="1"/>
    <rect x="4" y="3" width="8" height="2" fill="#000080"/>
    <rect x="4" y="6" width="4" height="1" fill="#000"/>
    <rect x="4" y="8" width="6" height="1" fill="#808080"/>
    <rect x="4" y="10" width="5" height="1" fill="#808080"/>
    <rect x="4" y="12" width="7" height="1" fill="#FF0000"/>`,

  chart: `<rect x="1" y="1" width="14" height="14" fill="#FFF" stroke="#000" stroke-width="1"/>
    <polyline points="2,13 5,9 7,11 10,5 13,3" fill="none" stroke="#FF0000" stroke-width="1.5"/>
    <line x1="2" y1="14" x2="2" y2="2" stroke="#000" stroke-width="1"/>
    <line x1="1" y1="14" x2="14" y2="14" stroke="#000" stroke-width="1"/>`,

  trading: `<rect x="1" y="2" width="14" height="12" fill="#FFFF00" stroke="#000" stroke-width="1"/>
    <text x="4" y="10" fill="#000" font-size="7" font-weight="bold">$</text>
    <rect x="9" y="5" width="4" height="2" fill="#FF0000"/>
    <rect x="9" y="9" width="4" height="2" fill="#0000FF"/>`,

  news: `<rect x="1" y="1" width="14" height="14" fill="#FFF" stroke="#000" stroke-width="1"/>
    <rect x="2" y="2" width="12" height="3" fill="#000080"/>
    <text x="3" y="4.5" fill="#FFF" font-size="3">NEWS</text>
    <rect x="3" y="6" width="10" height="1" fill="#000"/>
    <rect x="3" y="8" width="8" height="1" fill="#808080"/>
    <rect x="3" y="10" width="10" height="1" fill="#808080"/>
    <rect x="3" y="12" width="6" height="1" fill="#808080"/>`,

  office: `<rect x="1" y="4" width="14" height="11" fill="#C0C0C0" stroke="#000" stroke-width="1"/>
    <rect x="1" y="1" width="14" height="4" fill="#000080"/>
    <rect x="3" y="6" width="4" height="3" fill="#000080"/>
    <rect x="9" y="6" width="4" height="3" fill="#000080"/>
    <rect x="6" y="10" width="4" height="5" fill="#8B6914"/>`,

  office_history: `<rect x="1" y="1" width="14" height="14" fill="#FFF" stroke="#000" stroke-width="1"/>
    <rect x="3" y="3" width="10" height="2" fill="#000080"/>
    <rect x="3" y="6" width="8" height="1" fill="#808080"/>
    <rect x="3" y="8" width="10" height="1" fill="#808080"/>
    <rect x="3" y="10" width="6" height="1" fill="#808080"/>
    <rect x="3" y="12" width="9" height="1" fill="#808080"/>`,

  ranking: `<polygon points="8,1 10,6 15,6 11,9 12,14 8,11 4,14 5,9 1,6 6,6" fill="#FFFF00" stroke="#000" stroke-width="0.5"/>`,

  settings: `<circle cx="8" cy="8" r="3" fill="#808080" stroke="#000" stroke-width="1"/>
    <rect x="7" y="1" width="2" height="3" fill="#808080"/>
    <rect x="7" y="12" width="2" height="3" fill="#808080"/>
    <rect x="1" y="7" width="3" height="2" fill="#808080"/>
    <rect x="12" y="7" width="3" height="2" fill="#808080"/>
    <rect x="3" y="3" width="2" height="2" fill="#808080" transform="rotate(0 4 4)"/>
    <rect x="11" y="3" width="2" height="2" fill="#808080"/>
    <rect x="3" y="11" width="2" height="2" fill="#808080"/>
    <rect x="11" y="11" width="2" height="2" fill="#808080"/>`,

  save: `<rect x="2" y="1" width="12" height="14" fill="#0000FF" stroke="#000" stroke-width="1"/>
    <rect x="4" y="1" width="8" height="5" fill="#C0C0C0"/>
    <rect x="4" y="9" width="8" height="6" fill="#FFF"/>
    <rect x="8" y="2" width="2" height="3" fill="#000"/>`,

  employee: `<circle cx="8" cy="4" r="3" fill="#FFE0BD"/>
    <rect x="4" y="7" width="8" height="7" fill="#000080"/>
    <rect x="6" y="1" width="4" height="2" fill="#8B6914"/>`,

  document: `<rect x="2" y="1" width="12" height="14" fill="#FFF" stroke="#000" stroke-width="1"/>
    <rect x="4" y="3" width="8" height="1" fill="#000080"/>
    <rect x="4" y="5" width="8" height="1" fill="#808080"/>
    <rect x="4" y="7" width="6" height="1" fill="#808080"/>
    <rect x="4" y="9" width="7" height="1" fill="#808080"/>
    <rect x="4" y="11" width="5" height="1" fill="#808080"/>`,

  institution: `<rect x="1" y="4" width="14" height="11" fill="#C0C0C0" stroke="#000" stroke-width="1"/>
    <rect x="1" y="1" width="14" height="4" fill="#000080"/>
    <rect x="3" y="6" width="3" height="4" fill="#000080"/>
    <rect x="7" y="6" width="3" height="4" fill="#000080"/>
    <rect x="11" y="6" width="3" height="4" fill="#000080"/>
    <rect x="6" y="11" width="4" height="4" fill="#8B6914"/>`,

  proposal: `<ellipse cx="8" cy="6" rx="4" ry="4" fill="#FFFF00" stroke="#000" stroke-width="1"/>
    <rect x="6" y="9" width="4" height="2" fill="#C0C0C0" stroke="#000" stroke-width="0.5"/>
    <rect x="5" y="11" width="6" height="1" fill="#808080"/>
    <polygon points="8,1 9,4 7,4" fill="#FF8000"/>
    <rect x="7" y="13" width="2" height="2" fill="#00AA00"/>
    <polygon points="6,13 10,13 9,15 7,15" fill="#00CC00"/>`,

  mna: `<rect x="1" y="5" width="6" height="9" fill="#C0C0C0" stroke="#000" stroke-width="1"/>
    <rect x="1" y="2" width="6" height="4" fill="#000080"/>
    <rect x="2" y="7" width="2" height="2" fill="#000080"/>
    <rect x="9" y="5" width="6" height="9" fill="#C0C0C0" stroke="#000" stroke-width="1"/>
    <rect x="9" y="2" width="6" height="4" fill="#800000"/>
    <rect x="12" y="7" width="2" height="2" fill="#800000"/>
    <polygon points="6,9 10,9 8,7" fill="#FFFF00" stroke="#000" stroke-width="0.5"/>
    <polygon points="6,10 10,10 8,12" fill="#FFFF00" stroke="#000" stroke-width="0.5"/>`,

  skill_book: `<rect x="2" y="1" width="12" height="14" fill="#E8D5A0" stroke="#000" stroke-width="1"/>
    <rect x="2" y="1" width="3" height="14" fill="#8B6914"/>
    <polygon points="8,3 9,6 12,6 10,8 11,11 8,9 5,11 6,8 4,6 7,6" fill="#FFFF00" stroke="#DAA520" stroke-width="0.5"/>`,

  graduation: `<rect x="1" y="6" width="14" height="2" fill="#000080"/>
    <polygon points="8,2 15,6 8,10 1,6" fill="#000080"/>
    <rect x="6" y="8" width="4" height="6" fill="#000080"/>
    <rect x="5" y="13" width="6" height="2" fill="#C0C0C0" stroke="#000" stroke-width="0.5"/>
    <rect x="12" y="6" width="1" height="5" fill="#808080"/>
    <rect x="11" y="10" width="3" height="2" fill="#FFFF00"/>`,
}

export type IconName = keyof typeof ICONS

interface PixelIconProps {
  name: IconName
  size?: number
  className?: string
}

export function PixelIcon({ name, size = 16, className = '' }: PixelIconProps) {
  const iconSvg = ICONS[name]
  if (!iconSvg) return <span className={className}>?</span>

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      style={{ imageRendering: 'pixelated' }}
      dangerouslySetInnerHTML={{ __html: iconSvg }}
    />
  )
}
