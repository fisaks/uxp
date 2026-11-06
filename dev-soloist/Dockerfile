FROM ubuntu:24.04
RUN apt-get update && apt-get install -y --no-install-recommends libatomic1 libpulse0 pipewire wireplumber ca-certificates dbus && rm -rf /var/lib/apt/lists/*
COPY tunnel.conf /etc/pipewire/pipewire.conf.d/50-host-pulse.conf
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
