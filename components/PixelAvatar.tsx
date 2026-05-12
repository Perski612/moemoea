import Svg, { Rect } from 'react-native-svg'
import type { Tier } from '@/types'

const PALETTES: Record<Tier, { H: string; V: string; S: string; E: string }> = {
  rookie:  { H: '#39ff14', V: '#1a4a08', S: '#d4a574', E: '#111' },
  veteran: { H: '#ffd700', V: '#7a5500', S: '#d4a574', E: '#111' },
  legend:  { H: '#bf00ff', V: '#5a0080', S: '#d4a574', E: '#111' },
}

function buildRows(bikeType: 'hardtail' | 'fully', suspType: 'air' | 'coil'): string[] {
  const frameRow = bikeType === 'fully' ? '.BBBBXBBBB..' : '.BBBBBBBBB..'
  const forkRow  = suspType  === 'coil' ? 'BKB......BKB' : 'BB.......BB.'
  return [
    '....HHHH....',
    '...HHHHHH...',
    '..HHHHHHHH..',
    '..HVVVVVHH..',
    '..HSSSSSHH..',
    '..HSE.E.SH..',
    '..HSSSSSHH..',
    'BJJJJJJJJJJB',
    'BJJJDDJJJJJB',
    '..JJJJJJJJJ.',
    '...JJJJJJJ..',
    '....JJ.JJ...',
    '...BBB.BBB..',
    frameRow,
    forkRow,
    'WW.......WW.',
    '.WWW...WWW..',
  ]
}

interface PixelAvatarProps {
  tier?: Tier
  px?: number
  accentColor?: string
  bikeColor?: string
  jerseyJ?: string
  jerseyD?: string
  bikeType?: 'hardtail' | 'fully'
  suspType?: 'air' | 'coil'
}

export function PixelAvatar({
  tier      = 'rookie',
  px        = 3,
  accentColor,
  bikeColor,
  jerseyJ,
  jerseyD,
  bikeType  = 'hardtail',
  suspType  = 'air',
}: PixelAvatarProps) {
  const base = PALETTES[tier] ?? PALETTES.rookie
  const pal: Record<string, string> = {
    H: accentColor ?? base.H,
    V: base.V,
    S: base.S,
    E: base.E,
    J: jerseyJ ?? '#e8e4dc',
    D: jerseyD ?? '#9a9890',
    B: bikeColor ?? '#1a1a1a',
    W: '#0d0d0d',
    X: '#888888',
    K: '#666666',
  }

  const rows = buildRows(bikeType, suspType)
  const cols = rows[0].length
  const width  = cols * px
  const height = rows.length * px

  const rects = rows.flatMap((row, ri) =>
    [...row].flatMap((ch, ci) =>
      ch === '.' ? [] : [
        <Rect
          key={`${ri}-${ci}`}
          x={ci * px}
          y={ri * px}
          width={px}
          height={px}
          fill={pal[ch] ?? '#fff'}
        />
      ]
    )
  )

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ imageRendering: 'pixelated' } as any}
    >
      {rects}
    </Svg>
  )
}
