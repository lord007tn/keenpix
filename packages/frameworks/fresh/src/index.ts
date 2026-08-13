import {
  createImageAttributes,
  type KeenpixConfig,
  type KeenpixImageInput,
} from '@keenpix/core'
import { h } from 'preact'

export * from '@keenpix/core'

export interface KeenpixFreshImageProps extends KeenpixImageInput {
  className?: string
  config: KeenpixConfig
  crossOrigin?: '' | 'anonymous' | 'use-credentials'
  decoding?: 'async' | 'auto' | 'sync'
  fetchPriority?: 'auto' | 'high' | 'low'
  loading?: 'eager' | 'lazy'
  referrerPolicy?: ReferrerPolicy
}

export function createFreshImageProps(
  config: KeenpixConfig,
  input: KeenpixImageInput,
) {
  return createImageAttributes(config, input)
}

export function KeenpixImage(props: KeenpixFreshImageProps) {
  const {
    className,
    config,
    crossOrigin,
    decoding,
    fetchPriority,
    loading,
    referrerPolicy,
    ...input
  } = props

  return h('img', {
    ...createImageAttributes(config, input),
    class: className,
    crossOrigin,
    decoding,
    fetchPriority,
    loading,
    referrerPolicy,
  })
}

export function createKeenpixImage(config: KeenpixConfig) {
  return (props: Omit<KeenpixFreshImageProps, 'config'>) =>
    h(KeenpixImage, { ...props, config })
}
