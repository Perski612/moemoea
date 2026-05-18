import Svg, { Circle, G, Path, Rect } from 'react-native-svg'

interface PixelBikeProps {
  px?: number
  bikeColor?: string
  accentColor?: string
  bikeType?: 'hardtail' | 'enduro' | 'downhill'
  suspType?: 'air' | 'coil'
}

export function PixelBike({
  px = 3,
  bikeColor = '#ef4444',
  accentColor = '#99EA57',
  bikeType = 'hardtail',
  suspType = 'air',
}: PixelBikeProps) {
  const frame = bikeColor
  const frameDark = darken(frame, 0.32)
  const frameLight = lighten(frame, 0.22)
  const tire = '#020617'
  const rim = '#94a3b8'
  const hub = '#e5e7eb'
  const metal = '#64748b'
  const black = '#111827'

  return (
    <Svg width={36 * px} height={24 * px} viewBox="0 0 144 96">
      <Rect x={0} y={0} width={144} height={96} fill="transparent" />

      <PixelWheel cx={40} cy={67} tire={tire} rim={rim} hub={hub} />
      <PixelWheel cx={108} cy={45} tire={tire} rim={rim} hub={hub} />

      {/* chain */}
      <Path d="M62 68 L40 67" stroke={black} strokeWidth={6} strokeLinecap="square" />
      <Path d="M62 73 L40 71" stroke={metal} strokeWidth={3} strokeLinecap="square" />

      {/* frame main triangle */}
      <Path d="M40 67 L63 67 L83 32 L108 45 L74 50 L63 67" stroke={black} strokeWidth={10} fill="none" strokeLinejoin="miter" strokeLinecap="square" />
      <Path d="M40 67 L63 67 L83 32 L108 45 L74 50 L63 67" stroke={frame} strokeWidth={7} fill="none" strokeLinejoin="miter" strokeLinecap="square" />
      <Path d="M63 67 L108 45" stroke={frameDark} strokeWidth={5} strokeLinecap="square" />
      <Path d="M76 50 L84 32" stroke={frameLight} strokeWidth={4} strokeLinecap="square" />
      <Path d="M49 61 L65 61" stroke={frameLight} strokeWidth={3} strokeLinecap="square" />

      {/* seat cluster */}
      <Path d="M83 32 L87 16" stroke={metal} strokeWidth={5} strokeLinecap="square" />
      <Rect x={76} y={12} width={22} height={7} fill={black} />
      <Rect x={90} y={14} width={8} height={3} fill="#334155" />

      {/* cockpit */}
      <Path d="M91 30 L103 21 L116 26" stroke={black} strokeWidth={6} fill="none" strokeLinecap="square" strokeLinejoin="miter" />
      <Path d="M93 30 L103 22" stroke={metal} strokeWidth={3} strokeLinecap="square" />
      <Rect x={113} y={23} width={13} height={5} fill={black} />

      {/* fork */}
      <Path d="M98 34 L108 45" stroke={black} strokeWidth={8} strokeLinecap="square" />
      <Path d="M100 34 L108 45" stroke={metal} strokeWidth={5} strokeLinecap="square" />
      <Path d="M91 31 L108 45" stroke={metal} strokeWidth={4} strokeLinecap="square" />
      {suspType === 'coil' && (
        <G>
          <Rect x={100} y={36} width={11} height={2} fill={accentColor} />
          <Rect x={102} y={40} width={10} height={2} fill={accentColor} />
          <Rect x={104} y={44} width={8} height={2} fill={accentColor} />
        </G>
      )}

      {/* rear suspension */}
      {bikeType !== 'hardtail' && (
        <G>
          <Circle cx={70} cy={54} r={4} fill={hub} />
          <Path d="M69 53 L86 44" stroke={black} strokeWidth={8} strokeLinecap="square" />
          <Path d="M70 53 L86 44" stroke={metal} strokeWidth={5} strokeLinecap="square" />
          <Path d="M73 51 L84 46" stroke={suspType === 'coil' ? accentColor : hub} strokeWidth={2} strokeLinecap="square" />
        </G>
      )}

      {/* crank */}
      <Circle cx={63} cy={67} r={10} fill={accentColor} />
      <Circle cx={63} cy={67} r={5} fill={black} />
      <Path d="M63 67 L58 81" stroke={black} strokeWidth={5} strokeLinecap="square" />
      <Rect x={53} y={80} width={13} height={4} fill={hub} />

      {/* pixel highlights */}
      <Rect x={84} y={34} width={7} height={4} fill={frameLight} />
      <Rect x={94} y={42} width={12} height={4} fill={frameDark} />
      <Rect x={54} y={65} width={7} height={4} fill={frameDark} />
    </Svg>
  )
}

function PixelWheel({ cx, cy, tire, rim, hub }: { cx: number; cy: number; tire: string; rim: string; hub: string }) {
  return (
    <G>
      <Path
        d={`M${cx - 21} ${cy - 27} H${cx + 21} V${cy - 21} H${cx + 27} V${cy + 21} H${cx + 21} V${cy + 27} H${cx - 21} V${cy + 21} H${cx - 27} V${cy - 21} H${cx - 21} Z`}
        fill={tire}
      />
      <Path
        d={`M${cx - 15} ${cy - 19} H${cx + 15} V${cy - 15} H${cx + 19} V${cy + 15} H${cx + 15} V${cy + 19} H${cx - 15} V${cy + 15} H${cx - 19} V${cy - 15} H${cx - 15} Z`}
        fill="transparent"
        stroke={rim}
        strokeWidth={3}
      />
      <Path d={`M${cx} ${cy} L${cx - 14} ${cy - 14} M${cx} ${cy} L${cx + 14} ${cy - 14} M${cx} ${cy} L${cx - 14} ${cy + 14} M${cx} ${cy} L${cx + 14} ${cy + 14}`} stroke={rim} strokeWidth={2} opacity={0.5} />
      <Path d={`M${cx} ${cy - 17} V${cy + 17} M${cx - 17} ${cy} H${cx + 17}`} stroke={rim} strokeWidth={2} opacity={0.38} />
      <Circle cx={cx} cy={cy} r={5} fill={hub} />
      <Circle cx={cx} cy={cy} r={2.5} fill="#334155" />
    </G>
  )
}

function darken(hex: string, amount: number) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.floor(((n >> 16) & 0xff) * (1 - amount)))
  const g = Math.max(0, Math.floor(((n >> 8) & 0xff) * (1 - amount)))
  const b = Math.max(0, Math.floor((n & 0xff) * (1 - amount)))
  return `rgb(${r},${g},${b})`
}

function lighten(hex: string, amount: number) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.floor(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * amount))
  const g = Math.min(255, Math.floor(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * amount))
  const b = Math.min(255, Math.floor((n & 0xff) + (255 - (n & 0xff)) * amount))
  return `rgb(${r},${g},${b})`
}
