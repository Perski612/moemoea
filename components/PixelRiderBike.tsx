import Svg, { Circle, G, Path, Rect } from 'react-native-svg'
import type { BikeConfig } from '@/types'

type HairStyle = BikeConfig['hairStyle']

interface PixelRiderBikeProps {
  width?: number
  bikeColor?: string
  accentColor?: string
  hairColor?: string
  hairStyle?: HairStyle
  skinColor?: string
  eyeColor?: string
  shirtColor?: string
  pantsColor?: string
  bikeType?: 'hardtail' | 'enduro' | 'downhill'
  suspType?: 'air' | 'coil'
}

export function PixelRiderBike({
  width = 260,
  bikeColor = '#ef4444',
  accentColor = '#99EA57',
  hairColor = '#1a1210',
  hairStyle = 'short',
  skinColor = '#d4a574',
  eyeColor = '#60a5fa',
  shirtColor = '#f97316',
  pantsColor = '#1f2937',
  bikeType = 'hardtail',
  suspType = 'air',
}: PixelRiderBikeProps) {
  const height = Math.round(width * 0.72)
  const tire = '#060606'
  const rim = '#e5e7eb'
  const dark = '#111827'
  const shadow = darken(bikeColor, 0.28)

  return (
    <Svg width={width} height={height} viewBox="0 0 180 130">
      <Rect x={0} y={0} width={180} height={130} fill="transparent" />

      {/* trail shadow */}
      <Rect x={8} y={116} width={142} height={5} fill="rgba(0,0,0,0.25)" />

      {/* wheels */}
      <Circle cx={48} cy={92} r={27} stroke={tire} strokeWidth={9} fill="none" />
      <Circle cx={48} cy={92} r={18} stroke={rim} strokeWidth={3} fill="none" opacity={0.72} />
      <Circle cx={129} cy={60} r={27} stroke={tire} strokeWidth={9} fill="none" />
      <Circle cx={129} cy={60} r={18} stroke={rim} strokeWidth={3} fill="none" opacity={0.72} />
      {[48, 129].map((cx, i) => (
        <G key={cx}>
          <Path d={`M${cx},${i ? 60 : 92} l18,-12 M${cx},${i ? 60 : 92} l-18,12 M${cx},${i ? 60 : 92} l18,12 M${cx},${i ? 60 : 92} l-18,-12`} stroke={rim} strokeWidth={2} opacity={0.45} />
          <Circle cx={cx} cy={i ? 60 : 92} r={4} fill={rim} />
        </G>
      ))}

      {/* bike frame */}
      <Path d="M48,92 L80,87 L105,46 L129,60 L91,63 Z" stroke={bikeColor} strokeWidth={7} fill="none" strokeLinecap="square" strokeLinejoin="miter" />
      <Path d="M80,87 L129,60" stroke={shadow} strokeWidth={5} strokeLinecap="square" />
      <Path d="M105,46 L91,63" stroke={bikeColor} strokeWidth={8} strokeLinecap="square" />
      <Path d="M105,46 L116,42 L124,48" stroke={dark} strokeWidth={5} fill="none" strokeLinecap="square" />
      <Path d="M91,63 L80,87" stroke={bikeColor} strokeWidth={7} strokeLinecap="square" />
      <Path d="M100,44 L101,30" stroke="#9ca3af" strokeWidth={4} strokeLinecap="square" />
      <Path d="M94,29 L111,29" stroke={dark} strokeWidth={5} strokeLinecap="square" />
      <Path d="M120,50 L129,60" stroke={suspType === 'coil' ? accentColor : '#9ca3af'} strokeWidth={5} strokeLinecap="square" />
      {bikeType !== 'hardtail' && <Path d="M86,67 L104,57" stroke="#9ca3af" strokeWidth={5} strokeLinecap="square" />}
      <Circle cx={80} cy={87} r={8} stroke={accentColor} strokeWidth={4} fill={dark} />

      {/* rear leg / shoe */}
      <Rect x={58} y={73} width={31} height={13} fill={pantsColor} />
      <Rect x={47} y={82} width={20} height={12} fill={pantsColor} />
      <Rect x={44} y={92} width={18} height={8} fill={dark} />

      {/* front leg / shoe */}
      <Rect x={84} y={61} width={13} height={28} fill={skinColor} />
      <Rect x={93} y={83} width={14} height={8} fill={skinColor} />
      <Rect x={98} y={88} width={19} height={9} fill={shirtColor} />
      <Rect x={111} y={91} width={16} height={8} fill={dark} />

      {/* torso and arms */}
      <Rect x={36} y={40} width={48} height={29} fill={shirtColor} />
      <Rect x={28} y={50} width={18} height={37} fill={shirtColor} />
      <Rect x={30} y={82} width={26} height={10} fill={shirtColor} />
      <Rect x={55} y={48} width={46} height={10} fill={shirtColor} />
      <Rect x={90} y={45} width={22} height={11} fill={skinColor} />
      <Rect x={107} y={43} width={12} height={13} fill={dark} />
      <Rect x={48} y={61} width={39} height={8} fill={darken(shirtColor, 0.28)} />

      {/* neck / head */}
      <Rect x={50} y={28} width={13} height={13} fill={skinColor} />
      <Rect x={45} y={17} width={25} height={22} fill={skinColor} />
      <Rect x={65} y={21} width={12} height={14} fill={skinColor} />
      <Rect x={62} y={25} width={6} height={4} fill={eyeColor} />
      <Rect x={70} y={33} width={6} height={3} fill={darken(skinColor, 0.18)} />

      {/* hair */}
      <HairBlocks style={hairStyle} color={hairColor} />
    </Svg>
  )
}

function HairBlocks({ style, color }: { style?: HairStyle; color: string }) {
  if (style === 'long') {
    return (
      <G>
        <Rect x={40} y={10} width={31} height={9} fill={color} />
        <Rect x={36} y={18} width={13} height={24} fill={color} />
        <Rect x={49} y={15} width={31} height={10} fill={color} />
        <Rect x={71} y={23} width={9} height={13} fill={color} />
      </G>
    )
  }
  if (style === 'curly') {
    return (
      <G>
        <Rect x={39} y={8} width={8} height={8} fill={color} />
        <Rect x={47} y={5} width={9} height={9} fill={color} />
        <Rect x={56} y={7} width={10} height={9} fill={color} />
        <Rect x={65} y={12} width={10} height={9} fill={color} />
        <Rect x={38} y={16} width={38} height={10} fill={color} />
      </G>
    )
  }
  return (
    <G>
      <Rect x={39} y={10} width={31} height={10} fill={color} />
      <Rect x={36} y={19} width={18} height={10} fill={color} />
      <Rect x={62} y={18} width={17} height={8} fill={color} />
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
