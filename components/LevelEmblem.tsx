import { Image } from 'react-native'
import { getEmblemForLevel } from '@/lib/emblems'

interface Props {
  level: number
  size?: number
}

export function LevelEmblem({ level, size = 32 }: Props) {
  const emblem = getEmblemForLevel(level)
  const scaled = Math.round(size * (emblem.sizeFactor ?? 1))
  return (
    <Image
      source={emblem.source}
      style={{ width: scaled, height: scaled }}
      resizeMode="contain"
    />
  )
}
