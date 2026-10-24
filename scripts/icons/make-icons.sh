#!/usr/bin/env bash
# Makes the three PWA icons in public/icons/ with ImageMagick.
# Run it by hand when the barbell changes, then commit the PNG files.
# The build does not run this script.
#
#   any 192 and 512: public/favicon.svg (rounded square, as in the browser tab)
#   maskable 512:    scripts/icons/maskable.svg (full square, barbell inside the
#                    central circle of 80 % of the width)
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
out="$root/public/icons"
mkdir -p "$out"

# The SVG sources are 64 px wide. A high density makes ImageMagick render at the
# target size, and -resize pins the exact pixel size.
render() {
  local source="$1" size="$2" target="$3"
  convert -background none -density 1200 "$source" -resize "${size}x${size}" \
    -define png:exclude-chunk=date,time "PNG32:$target"
}

render "$root/public/favicon.svg" 192 "$out/pwa-192x192.png"
render "$root/public/favicon.svg" 512 "$out/pwa-512x512.png"
render "$root/scripts/icons/maskable.svg" 512 "$out/maskable-512x512.png"
