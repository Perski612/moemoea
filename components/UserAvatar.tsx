import { useQuery } from '@tanstack/react-query'
import { RemoteAvatar } from './RemoteAvatar'
import { databases, DB_ID, BIKE_CONFIGS_ID } from '@/lib/appwrite'
import type { BikeConfig } from '@/types'

interface UserAvatarProps {
  userId?: string | null
  size?: number
}

async function fetchAvatarUrl(userId: string): Promise<string | null> {
  const doc = await databases.getDocument(DB_ID, BIKE_CONFIGS_ID, userId).catch(() => null)
  return (doc as unknown as BikeConfig | null)?.avatarUrl ?? null
}

export function UserAvatar({ userId, size = 34 }: UserAvatarProps) {
  const { data: avatarUrl } = useQuery({
    queryKey: ['user-avatar', userId],
    queryFn: () => fetchAvatarUrl(userId!),
    enabled: Boolean(userId),
    retry: false,
    staleTime: 60_000,
  })

  return <RemoteAvatar url={avatarUrl} size={size} />
}
