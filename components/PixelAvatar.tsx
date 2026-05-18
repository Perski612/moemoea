import Svg, { Rect } from 'react-native-svg'
import type { Tier } from '@/types'

const TIER_COLORS: Record<Tier, string> = {
  rookie:  '#39cc14',
  veteran: '#ffd700',
  legend:  '#bf00ff',
}

// 12 columns × 19 rows, front-facing chibi
// H=hair  S=skin  E=eye-white  I=iris  M=mouth
// N=neck  J=jacket  T=collar  D=jacket-detail  L=pants  W=shoe
const CHAR_ROWS = [
  '....HHHH....',  // 0  hair crown
  '...HHHHHH...',  // 1  hair
  '..HHHHHHHH..',  // 2  hair wide
  '.HHSSSSSSHH.',  // 3  forehead
  '.HHEISSIEHH.',  // 4  eyes row 1
  '.HHEISSIEHH.',  // 5  eyes row 2
  '.HHSSSSSSHH.',  // 6  nose/cheeks
  '.HHSSMMSSHH.',  // 7  mouth
  '.HHHSSSSHHH.',  // 8  chin / jaw
  '....NNNN....',  // 9  neck
  '.JJJTTTTJJJ.',  // 10 jacket + collar
  '.JJJTTJJJJJ.',  // 11 collar narrows
  '.JJJJJJJJJJ.',  // 12 jacket body
  '.JJDJJJJDJJ.',  // 13 jacket detail stripe
  '.JJJJJJJJJJ.',  // 14 jacket lower
  '..LLLLLLLL..',  // 15 pants
  '..LLLLLLLL..',  // 16 pants
  '..LLLLLLLL..',  // 17 pants lower
  '..WWW..WWW..',  // 18 shoes
]

interface PixelAvatarProps {
  tier?: Tier
  px?: number
  accentColor?: string
  bikeColor?: string   // repurposed → hair color
  jerseyJ?: string
  jerseyD?: string     // → pants color
  bikeType?: 'hardtail' | 'fully'
  suspType?: 'air' | 'coil'
}

export function PixelAvatar({
  tier     = 'rookie',
  px       = 3,
  accentColor,
  bikeColor,
  jerseyJ,
  jerseyD,
  bikeType = 'hardtail',
  suspType = 'air',
}: PixelAvatarProps) {
  const iris   = accentColor ?? TIER_COLORS[tier] ?? '#39cc14'
  const hair   = bikeColor   ?? '#1a1210'
  const jacket = jerseyJ     ?? '#2a2830'
  // fully bikes get slightly darker pants; coil suspension gets darker shoes
  const basePants = jerseyD ?? '#a8b8d0'
  const pants  = bikeType === 'fully' ? darken(basePants, 0.1) : basePants
  const shoes  = suspType === 'coil'  ? '#3a1e08' : '#4a2e10'

  const pal: Record<string, string> = {
    H: hair,
    S: '#d4a574',   // skin
    E: '#f0ede8',   // eye white
    I: iris,
    M: '#7a3015',   // mouth
    N: '#d4a574',   // neck = skin
    J: jacket,
    T: '#c8c0b0',   // collar
    D: darken(jacket, 0.35),
    L: pants,
    W: shoes,       // shoe color varies by suspType
  }

  const cols   = CHAR_ROWS[0].length
  const W      = cols * px
  const H      = CHAR_ROWS.length * px

  const rects = CHAR_ROWS.flatMap((row, ri) =>
    [...row].flatMap((ch, ci) =>
      ch === '.' ? [] : [
        <Rect
          key={`${ri}-${ci}`}
          x={ci * px}
          y={ri * px}
          width={px}
          height={px}
          fill={pal[ch] ?? '#fff'}
        />,
      ]
    )
  )

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {rects}
    </Svg>
  )
}

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.floor(((n >> 16) & 0xff) * (1 - amount)))
  const g = Math.max(0, Math.floor(((n >> 8)  & 0xff) * (1 - amount)))
  const b = Math.max(0, Math.floor(( n        & 0xff) * (1 - amount)))
  return `rgb(${r},${g},${b})`
}
