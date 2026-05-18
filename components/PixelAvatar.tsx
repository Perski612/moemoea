import Svg, { G, Rect } from 'react-native-svg'
import type { Tier } from '@/types'

const TIER_COLORS: Record<Tier, string> = {
  rookie: '#39cc14',
  veteran: '#ffd700',
  legend: '#bf00ff',
}

interface PixelAvatarProps {
  tier?: Tier
  px?: number
  accentColor?: string
  bikeColor?: string
  jerseyJ?: string
  jerseyD?: string
  hairColor?: string
  skinColor?: string
  eyeColor?: string
  shirtColor?: string
  pantsColor?: string
  hairStyle?: 'short' | 'long' | 'curly'
  bikeType?: 'hardtail' | 'enduro' | 'downhill'
  suspType?: 'air' | 'coil'
}

type Block = [number, number, number, number, string]

export function PixelAvatar({
  tier = 'rookie',
  px = 3,
  accentColor,
  bikeColor,
  jerseyJ,
  jerseyD,
  hairColor,
  skinColor,
  eyeColor,
  shirtColor,
  pantsColor,
  hairStyle = 'short',
  bikeType = 'hardtail',
  suspType = 'air',
}: PixelAvatarProps) {
  const hair = hairColor ?? bikeColor ?? '#1a1210'
  const skin = skinColor ?? '#d4a574'
  const eye = eyeColor ?? accentColor ?? TIER_COLORS[tier] ?? '#39cc14'
  const jersey = shirtColor ?? jerseyJ ?? '#f97316'
  const pantsBase = pantsColor ?? jerseyD ?? '#1f2937'
  const pants = bikeType !== 'hardtail' ? darken(pantsBase, 0.08) : pantsBase
  const shoe = suspType === 'coil' ? '#3a1e08' : '#111827'
  const outline = '#111827'
  const skinShade = darken(skin, 0.18)
  const jerseyShade = darken(jersey, 0.28)
  const jerseyLight = lighten(jersey, 0.18)
  const pantsLight = lighten(pants, 0.16)

  const blocks: Block[] = [
    // legs and shoes
    [16, 48, 6, 14, outline],
    [22, 48, 8, 14, pants],
    [30, 48, 8, 14, pantsLight],
    [38, 48, 6, 14, outline],
    [12, 62, 12, 5, shoe],
    [36, 62, 12, 5, shoe],

    // torso silhouette
    [10, 29, 6, 19, outline],
    [16, 27, 28, 23, jersey],
    [44, 31, 5, 16, outline],
    [18, 29, 7, 17, jerseyLight],
    [25, 29, 16, 7, lighten(jersey, 0.1)],
    [24, 39, 17, 5, jerseyShade],
    [17, 48, 27, 5, outline],

    // collar / neck
    [22, 25, 4, 6, skin],
    [34, 25, 4, 6, skinShade],
    [26, 27, 8, 4, '#facc15'],

    // arms
    [7, 33, 8, 18, outline],
    [12, 32, 9, 19, jersey],
    [41, 32, 8, 18, jersey],
    [47, 34, 5, 14, outline],

    // head outline and face
    [16, 9, 4, 17, outline],
    [20, 7, 24, 21, skin],
    [44, 12, 4, 12, outline],
    [22, 8, 9, 4, lighten(skin, 0.14)],
    [38, 12, 6, 12, skinShade],
    [28, 24, 10, 4, skinShade],

    // eyes, nose, mouth - two eyes, visibly separated
    [24, 15, 4, 4, '#f8fafc'],
    [26, 15, 2, 4, eye],
    [36, 15, 4, 4, '#f8fafc'],
    [36, 15, 2, 4, eye],
    [32, 19, 3, 5, skinShade],
    [28, 25, 9, 3, '#7f2d12'],

    // ears
    [14, 16, 4, 7, skinShade],
    [46, 16, 3, 6, skinShade],
  ]

  const hairBlocks = getHairBlocks(hairStyle, hair, outline, lighten(hair, 0.2), darken(hair, 0.18))

  return (
    <Svg width={28 * px} height={38 * px} viewBox="0 0 56 76">
      <G>
        {[...blocks, ...hairBlocks].map(([x, y, w, h, fill], index) => (
          <Rect key={index} x={x} y={y} width={w} height={h} fill={fill} />
        ))}
      </G>
    </Svg>
  )
}

function getHairBlocks(style: PixelAvatarProps['hairStyle'], hair: string, outline: string, hi: string, shade: string): Block[] {
  if (style === 'long') {
    return [
      [17, 4, 26, 5, outline],
      [14, 8, 34, 8, outline],
      [18, 7, 24, 7, hair],
      [16, 14, 8, 27, outline],
      [40, 13, 8, 27, outline],
      [20, 10, 24, 8, hair],
      [19, 18, 7, 21, hair],
      [38, 18, 6, 21, shade],
      [23, 8, 9, 3, hi],
      [42, 21, 4, 10, hair],
    ]
  }

  if (style === 'curly') {
    return [
      [18, 3, 7, 7, outline],
      [25, 1, 8, 8, outline],
      [33, 3, 8, 8, outline],
      [14, 9, 34, 9, outline],
      [20, 5, 5, 5, hair],
      [27, 3, 5, 5, hi],
      [35, 5, 5, 5, hair],
      [17, 12, 28, 8, hair],
      [15, 18, 8, 8, shade],
      [41, 17, 6, 8, shade],
    ]
  }

  return [
    [17, 5, 25, 5, outline],
    [14, 9, 33, 9, outline],
    [18, 7, 22, 7, hair],
    [17, 14, 26, 6, hair],
    [15, 18, 7, 8, outline],
    [42, 16, 7, 7, shade],
    [23, 8, 10, 3, hi],
    [34, 10, 10, 4, hair],
  ]
}

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.floor(((n >> 16) & 0xff) * (1 - amount)))
  const g = Math.max(0, Math.floor(((n >> 8) & 0xff) * (1 - amount)))
  const b = Math.max(0, Math.floor((n & 0xff) * (1 - amount)))
  return `rgb(${r},${g},${b})`
}

function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.floor(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * amount))
  const g = Math.min(255, Math.floor(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * amount))
  const b = Math.min(255, Math.floor((n & 0xff) + (255 - (n & 0xff)) * amount))
  return `rgb(${r},${g},${b})`
}
