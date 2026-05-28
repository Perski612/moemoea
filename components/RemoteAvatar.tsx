import { Image, StyleSheet, View } from 'react-native'
import { DEFAULT_AVATAR_URL } from '@/constants/avatarPresets'

interface RemoteAvatarProps {
  url?: string | null
  size?: number
}

export function RemoteAvatar({ url, size = 144 }: RemoteAvatarProps) {
  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      <Image
        source={{ uri: url || DEFAULT_AVATAR_URL }}
        style={[styles.image, { imageRendering: 'pixelated' } as any]}
        resizeMode="stretch"
        resizeMethod="resize"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
})
