# JOBBIE Admin build assets

| File | Purpose |
|------|---------|
| `icon.svg` | Source artwork (JOBBIE greens + shield + “JA”) |
| `icon-1024.png` | Master raster (regenerate with script) |
| `icon.ico` | Windows / electron-builder `win.icon` |
| `icon.icns` | macOS / electron-builder `mac.icon` |

Regenerate after editing the SVG:

```bash
cd jobbie-admin
npm run icons:generate
```

On macOS you can alternatively run `iconutil -c icns build/icon.iconset` if you maintain an `.iconset` folder; the repo ships committed `.ico` / `.icns` so friends and CI do not need ImageMagick.
