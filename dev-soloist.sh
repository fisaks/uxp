#!/bin/bash
# Run a development Soloist in Docker. Sound goes to the default output of this computer's PulseAudio.
# Needs setup-dev-soloist.sh run once and SOLOIST_API_KEY in .env.dev.
#   ./dev-soloist.sh          the public device "XAUD Dev" (WebSocket 127.0.0.1:8765), picked from phones
#   ./dev-soloist.sh house    the house device "XAUD Dev (do not use)" (127.0.0.1:8766), logged in as its own
#                             Spotify account, used for everything that is started from aud
# Both use the same Soloist build and API key, but each has its own data directory and so its own Spotify login.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEV_DIR="$SCRIPT_DIR/.dev-soloist"

case "${1:-public}" in
    public) NAME="uxp-dev-soloist"; DEVICE="XAUD Dev"; WS="127.0.0.1:8765"; DATA="$DEV_DIR/data" ;;
    house) NAME="uxp-dev-soloist-house"; DEVICE="XAUD Dev (do not use)"; WS="127.0.0.1:8766"; DATA="$DEV_DIR/data-house" ;;
    *) echo "Usage: $0 [public|house]"; exit 1 ;;
esac

if [ -f "$SCRIPT_DIR/.env.dev" ]; then
    set -o allexport
    source "$SCRIPT_DIR/.env.dev"
    set +o allexport
fi

if [ -z "$SOLOIST_API_KEY" ]; then
    echo "SOLOIST_API_KEY is not set in .env.dev"
    exit 1
fi
if ! docker image inspect uxp-dev-soloist >/dev/null 2>&1; then
    echo "Run ./setup-dev-soloist.sh first"
    exit 1
fi

SOLOIST=$(find "$DEV_DIR/soloist" -type f -name soloist | head -1)
PULSE_DIR="/run/user/$(id -u)/pulse"

mkdir -p "$DATA"
docker rm -f "$NAME" >/dev/null 2>&1
exec docker run --rm --name "$NAME" --network host --user "$(id -u)" \
    -v "$(dirname "$SOLOIST"):/opt/soloist:ro" \
    -v "$DATA:/data" \
    -v "$PULSE_DIR:/host-pulse" \
    uxp-dev-soloist /opt/soloist/soloist -n "$DEVICE" -d host_pulse -i 100 -w "$WS" \
    -D /data -C /data/cache -k "$SOLOIST_API_KEY"
