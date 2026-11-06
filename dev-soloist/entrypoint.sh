#!/bin/bash
export XDG_RUNTIME_DIR=/tmp/xdg; mkdir -p $XDG_RUNTIME_DIR; chmod 700 $XDG_RUNTIME_DIR
pipewire & 
sleep 1
dbus-run-session -- wireplumber &
sleep 2
exec "$@"
