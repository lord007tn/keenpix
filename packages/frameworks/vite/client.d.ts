declare module 'virtual:keenpix' {
  export const config: import('@keenpix/core').KeenpixConfig
  export const keenpix: ReturnType<typeof import('@keenpix/core').createKeenpix>
  export default keenpix
}
