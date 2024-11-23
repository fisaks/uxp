#!/bin/bash
npm run build

# Build the bff stage
docker build --target bff -t bff:latest .

# Build the web stage
docker build --target web -t web:latest .
