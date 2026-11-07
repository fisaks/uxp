#!/bin/bash
# Set up a Soloist (Spotify Connect player) for development, playing on this computer's speakers.
# Downloads the Soloist build into .dev-soloist/ and builds the Docker image that runs it
# (the build needs a newer glibc than many development machines have).
# Run once, and again when the build has expired (after about 90 days).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEV_DIR="$SCRIPT_DIR/.dev-soloist"
URL="https://soloist-builds.spotifycdn.com/soloist_release_x86_64.tar.gz"

set -e
mkdir -p "$DEV_DIR/data" "$DEV_DIR/soloist"

echo "Downloading Soloist..."
curl -fL "$URL" -o "$DEV_DIR/soloist.tar.gz"
tar -xzf "$DEV_DIR/soloist.tar.gz" -C "$DEV_DIR/soloist"
rm "$DEV_DIR/soloist.tar.gz"

SOLOIST=$(find "$DEV_DIR/soloist" -type f -name soloist | head -1)
if [ -z "$SOLOIST" ]; then
    echo "No soloist program found in the download."
    exit 1
fi
chmod +x "$SOLOIST"

echo "Building the Docker image..."
docker build -t uxp-dev-soloist "$SCRIPT_DIR/dev-soloist"

echo ""
echo "Soloist is ready in $DEV_DIR/"
echo ""
echo "Next:"
echo "  1. Put your Soloist API key in .env.dev as SOLOIST_API_KEY=..."
echo "  2. Start the dev server (./devserver.sh start); the aud window runs Soloist as \"XAUD Dev\"."
echo "  3. Pair the house device once: open Spotify on a phone, pick \"XAUD Dev (do not use)\" in the device list."
echo "     Use an account of its own, not the one of the production house device and not your personal one:"
echo "     two Soloists on one account disturb each other. The public device \"XAUD Dev\" needs no pairing,"
echo "     it plays as whichever account picks it."
echo "  To pair another account, delete $DEV_DIR/data-house/ and pair again."
