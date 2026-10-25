// Maps Glass UI Kit's original OKLCH scales to Material's semantic roles.
export function glassThemeCss(palettes) {
  const lightAccent = scale => [500, 600, 700, 800, 900].find(stop => Number(scale[stop].match(/^oklch\(([\d.]+)/)?.[1]) <= 0.54)
  const declarations = (palette, dark) => {
    const tokens = {}
    for (const role of ['primary', 'secondary', 'tertiary', 'error']) {
      const scale = palette[role]
      tokens[role] = scale[dark ? 200 : lightAccent(scale)]
      tokens[`on-${role}`] = dark ? scale[900] : '#ffffff'
      tokens[`${role}-container`] = scale[dark ? 700 : 100]
      tokens[`on-${role}-container`] = scale[dark ? 50 : 900]
      if (role !== 'error') {
        tokens[`${role}-fixed`] = scale[100]
        tokens[`${role}-fixed-dim`] = scale[200]
        tokens[`on-${role}-fixed`] = scale[900]
        tokens[`on-${role}-fixed-variant`] = scale[700]
      }
    }
    const surface = palette.surface, ink = palette.ink
    Object.assign(tokens, {
      surface: dark ? ink[900] : surface[50],
      'surface-dim': dark ? ink[900] : surface[200],
      'surface-bright': dark ? ink[700] : surface[50],
      'surface-variant': dark ? ink[700] : surface[200],
      'surface-container-lowest': dark ? ink[900] : '#ffffff',
      'surface-container-low': dark ? `color-mix(in oklch, ${ink[800]} 80%, ${ink[900]})` : surface[50],
      'surface-container': dark ? ink[800] : surface[100],
      'surface-container-high': dark ? ink[700] : surface[200],
      'surface-container-highest': dark ? ink[600] : surface[300],
      'on-surface': dark ? surface[50] : ink[900],
      'on-surface-variant': dark ? surface[300] : ink[600],
      outline: dark ? surface[500] : ink[600],
      'outline-variant': dark ? ink[700] : surface[300],
      'inverse-surface': dark ? surface[100] : ink[800],
      'inverse-on-surface': dark ? ink[900] : surface[100],
      'inverse-primary': palette.primary[dark ? lightAccent(palette.primary) : 200],
    })
    return Object.entries(tokens).map(([name, value]) => `--mtrl-sys-color-${name}:${value};`).join('')
  }
  return '/*! Glass UI Kit 1.32.0 | Copyright (c) 2024-2026 ZiyaraGo Technologies LLC | MIT | See GLASS-UI-KIT-LICENSE */\n'
    + Object.entries(palettes).map(([name, palette]) => `[data-theme="${name}"]{${declarations(palette, false)}}[data-theme="${name}"][data-theme-mode="dark"]{${declarations(palette, true)}}`).join('\n')
}
