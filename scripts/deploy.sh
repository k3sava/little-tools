#!/usr/bin/env bash
# Build static bundle and publish to the gh-pages branch.
# GH Pages serves tools.iamkesava.com from that branch.
set -euo pipefail

cd "$(dirname "$0")/.."
repo_root=$(pwd)

echo "→ build"
npm run build

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

cp -R out/. "$work/"
touch "$work/.nojekyll"
echo "tools.iamkesava.com" > "$work/CNAME"

cd "$work"
git init -q -b gh-pages
git remote add origin "$(git -C "$repo_root" config --get remote.origin.url)"
git add -A
git -c user.name="deploy" -c user.email="deploy@iamkesava.com" commit -q -m "deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push -f origin gh-pages
echo "✓ deployed to gh-pages"
