#!/bin/bash
# Run the development Soloist ("AUD Dev") in Docker. Sound goes to the default output of this computer's
# PulseAudio. Needs setup-dev-soloist.sh run once and SOLOIST_API_KEY in .env.dev.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEV_DIR="$SCRIPT_DIR/.dev-soloist"
NAME="uxp-dev-soloist"

if [ -f "$SCRIPT_DIR/.env.dev" ]; then
    set -o allexport
    source "$SCRIPT_DIR/.env.dev"
    set +o allexport
fi

if [ -z "$SOLOIST_API_KEY" ]; then
    echo "SOLOIST_API_KEY is not set in .env.dev"
    exit 1
fi
if ! docker image inspect "$NAME" >/dev/null 2>&1; then
    echo "Run ./setup-dev-soloist.sh first"
    exit 1
fi

SOLOIST=$(find "$DEV_DIR/soloist" -type f -name soloist | head -1)
PULSE_DIR="/run/user/$(id -u)/pulse"

docker rm -f "$NAME" >/dev/null 2>&1
exec docker run --rm --name "$NAME" --network host --user "$(id -u)" \
    -v "$(dirname "$SOLOIST"):/opt/soloist:ro" \
    -v "$DEV_DIR/data:/data" \
    -v "$PULSE_DIR:/host-pulse" \
    "$NAME" /opt/soloist/soloist -n "AUD Dev" -d host_pulse -i 100 -w 127.0.0.1:8765 \
    -D /data -C /data/cache -k "$SOLOIST_API_KEY"
