#!/bin/bash

# Define base directory for the files
BASE_DIR="public/static/libs"
DEV_DIR="$BASE_DIR/development"
PROD_DIR="$BASE_DIR/production"

# Create directories
mkdir -p "$DEV_DIR" "$PROD_DIR" "$FONTS_DIR"

# Define URLs for development scripts
declare -A DEV_LIBS=(
    ["react"]="https://unpkg.com/react@18/umd/react.development.js"
    ["react-dom"]="https://unpkg.com/react-dom@18/umd/react-dom.development.js"
    ["emotion-react"]="https://unpkg.com/@emotion/react@11/dist/emotion-react.umd.min.js"
    ["emotion-styled"]="https://unpkg.com/@emotion/styled@11/dist/emotion-styled.umd.min.js"
    ["axios"]="https://unpkg.com/axios@1/dist/axios.js"
)

# Define URLs for production scripts
declare -A PROD_LIBS=(
    ["react"]="https://unpkg.com/react@18/umd/react.production.min.js"
    ["react-dom"]="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"
    ["emotion-react"]="https://unpkg.com/@emotion/react@11/dist/emotion-react.umd.min.js"
    ["emotion-styled"]="https://unpkg.com/@emotion/styled@11/dist/emotion-styled.umd.min.js"
    ["axios"]="https://unpkg.com/axios@1/dist/axios.min.js"
)


# Function to download files
download_file() {
    local url=$1
    local dest=$2
    echo "Downloading $url -> $dest"
    curl -sSL "$url" -o "$dest"
    if [ $? -ne 0 ]; then
        echo "Failed to download $url"
        exit 1
    fi
}

# Download development scripts
for lib in "${!DEV_LIBS[@]}"; do
    download_file "${DEV_LIBS[$lib]}" "$DEV_DIR/$lib.development.js"
done

# Download production scripts
for lib in "${!PROD_LIBS[@]}"; do
    download_file "${PROD_LIBS[$lib]}" "$PROD_DIR/$lib.production.js"
done



echo "All files downloaded successfully."
