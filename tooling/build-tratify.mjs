import { prepareTratify } from './prepare-tratify.mjs'

await import('./build-material.mjs')
await prepareTratify()
console.log('tratify: Material runtime, themes, types and licenses prepared. No archive or publication was created.')
