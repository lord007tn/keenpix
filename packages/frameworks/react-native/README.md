# @keenpix/react-native

Keenpix network sources and props for React Native's built-in `Image`.

```tsx
import { Image } from 'react-native'
import { createReactNativeImageProps } from '@keenpix/react-native'

const config = {
  baseUrl: 'https://images.example.com',
  projectId: 'project-id',
}

export function Avatar() {
  return (
    <Image
      {...createReactNativeImageProps(config, {
        alt: 'Profile photo',
        src: 'https://origin.example.com/avatar.jpg',
        width: 256,
        height: 256,
        fit: 'cover',
        cache: 'force-cache',
      })}
      style={{ width: 128, height: 128 }}
    />
  )
}
```

React Native requires layout dimensions for network images; set `style.width`
and `style.height` even when the Keenpix transform also declares pixel
dimensions. `createReactNativeImageSources` creates dimensioned alternatives
for native source selection. Support status: stable for React Native 0.72+.
