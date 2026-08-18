# @keenpix/expo

Keenpix sources and props for Expo's recommended `expo-image` component.

```tsx
import { Image } from 'expo-image'
import { createExpoImageProps } from '@keenpix/expo'

const config = {
  baseUrl: 'https://images.example.com',
  projectId: 'project-id',
}

export function Avatar() {
  return (
    <Image
      {...createExpoImageProps(config, {
        alt: 'Profile photo',
        src: 'https://origin.example.com/avatar.jpg',
        width: 256,
        height: 256,
        fit: 'cover',
        cacheKey: 'profile-photo-v2',
        cachePolicy: 'memory-disk',
      })}
      style={{ width: 128, height: 128 }}
    />
  )
}
```

`createExpoImageSources` creates width-annotated sources for Expo web's static
responsive policy; pass `aspectRatio` when source heights are known. Install
`expo-image` with `npx expo install expo-image`.
Support status: stable for Expo SDK 50 and newer.
