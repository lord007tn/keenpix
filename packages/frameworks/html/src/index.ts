import {
  createImageAttributes,
  type KeenpixConfig,
  type KeenpixImageInput,
} from '@keenpix/core'

export * from '@keenpix/core'

export interface KeenpixHtmlImageInput extends KeenpixImageInput {
  className?: string
  decoding?: 'async' | 'auto' | 'sync'
  fetchPriority?: 'auto' | 'high' | 'low'
  loading?: 'eager' | 'lazy'
  referrerPolicy?: ReferrerPolicy
}

const ATTRIBUTE_CHARACTERS = /[&<>"']/g

const ESCAPED_CHARACTERS = {
  '"': '&quot;',
  '&': '&amp;',
  "'": '&#39;',
  '<': '&lt;',
  '>': '&gt;',
} as const

function escapeHtmlAttribute(value: string | number) {
  return String(value).replace(
    ATTRIBUTE_CHARACTERS,
    (character) =>
      ESCAPED_CHARACTERS[character as keyof typeof ESCAPED_CHARACTERS],
  )
}

export function createHtmlImageAttributes(
  config: KeenpixConfig,
  input: KeenpixHtmlImageInput,
) {
  const {
    className,
    decoding,
    fetchPriority,
    loading,
    referrerPolicy,
    ...imageInput
  } = input
  const attributes = createImageAttributes(config, imageInput)

  return {
    alt: attributes.alt,
    class: className,
    decoding,
    fetchpriority: fetchPriority,
    height: attributes.height,
    loading,
    referrerpolicy: referrerPolicy,
    sizes: attributes.sizes,
    src: attributes.src,
    srcset: attributes.srcSet,
    width: attributes.width,
  }
}

export function renderKeenpixImage(
  config: KeenpixConfig,
  input: KeenpixHtmlImageInput,
) {
  const attributes = createHtmlImageAttributes(config, input)
  const serializedAttributes = Object.entries(attributes)
    .filter(([, value]) => value !== undefined)
    .map(
      ([name, value]) =>
        `${name}="${escapeHtmlAttribute(value as string | number)}"`,
    )
    .join(' ')

  return `<img ${serializedAttributes}>`
}
