#!/bin/bash
# Generate trusted dev certificates for HTTPS access from mobile devices.
# Requires mkcert: go install filippo.io/mkcert@latest
# Run once, then install the root CA on your phone.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="$SCRIPT_DIR/nginx/dev-certs"
LOCAL_IP=$(hostname -I | awk '{print $1}')

MKCERT=$(command -v mkcert || echo "$HOME/go/bin/mkcert")

if [ ! -x "$MKCERT" ]; then
    echo "mkcert not found. Install with: go install filippo.io/mkcert@latest"
    exit 1
fi

# Install the local CA (only needed once per machine)
$MKCERT -install 2>/dev/null || true

echo "Generating certs for: localhost, $LOCAL_IP"
$MKCERT -cert-file "$CERT_DIR/cert.pem" -key-file "$CERT_DIR/key.pem" \
    localhost 127.0.0.1 "$LOCAL_IP"

echo ""
echo "Certificates written to $CERT_DIR/"
echo ""
echo "To trust on your phone, copy the root CA to your device:"
echo "  $($MKCERT -CAROOT)/rootCA.pem"
echo ""
echo "Then install it as a trusted certificate on your phone:"
echo "  Android: Copy .pem and rename to .crt → Settings → Security → Install from storage"
