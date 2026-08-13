import {
  createImageAttributes,
  type KeenpixConfig,
  type KeenpixImageInput,
} from '@keenpix/core'
import { html } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'

export * from '@keenpix/core'

export interface KeenpixLitImageInput extends KeenpixImageInput {
  className?: string
  decoding?: 'async' | 'auto' | 'sync'
  fetchPriority?: 'auto' | 'high' | 'low'
  loading?: 'eager' | 'lazy'
  referrerPolicy?: ReferrerPolicy
}

export function createLitImageAttributes(
  config: KeenpixConfig,
  input: KeenpixLitImageInput,
) {
  const {
    className,
    decoding,
    fetchPriority,
    loading,
    referrerPolicy,
    ...imageInput
  } = input

  return {
    ...createImageAttributes(config, imageInput),
    className,
    decoding,
    fetchPriority,
    loading,
    referrerPolicy,
  }
}

export function keenpixImage(
  config: KeenpixConfig,
  input: KeenpixLitImageInput,
) {
  const attributes = createLitImageAttributes(config, input)

  return html`<img
    alt=${attributes.alt}
    class=${ifDefined(attributes.className)}
    decoding=${ifDefined(attributes.decoding)}
    fetchpriority=${ifDefined(attributes.fetchPriority)}
    height=${ifDefined(attributes.height)}
    loading=${ifDefined(attributes.loading)}
    referrerpolicy=${ifDefined(attributes.referrerPolicy)}
    sizes=${ifDefined(attributes.sizes)}
    src=${attributes.src}
    srcset=${ifDefined(attributes.srcSet)}
    width=${ifDefined(attributes.width)}
  />`
}
