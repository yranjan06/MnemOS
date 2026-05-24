#!/bin/sh
set -e

# ── 1. Clean up stale locks ──────────────────────────────────────────────────
rm -f /tmp/.X99-lock /run/dbus/pid /var/run/dbus/pid /run/dbus/system_bus_socket
rm -f /root/.config/google-chrome/SingletonLock \
      /root/.config/google-chrome/SingletonCookie \
      /root/.config/google-chrome/SingletonSocket
rm -rf /root/.cache/at-spi /tmp/dbus-*

# ── 2. Start the D-Bus system bus ────────────────────────────────────────────
mkdir -p /run/dbus
dbus-daemon --system --fork

# ── 3. Launch everything inside a dbus session ───────────────────────────────
export DISPLAY=:99

exec dbus-run-session -- sh -c '
  export DISPLAY=:99

  Xvfb :99 -screen 0 1280x768x24 -ac &
  until xdpyinfo -display :99 >/dev/null 2>&1; do sleep 1; done
  echo "[entrypoint] Xvfb ready"

  xfce4-session &

  /usr/libexec/at-spi-bus-launcher --launch-immediately &
  /usr/libexec/at-spi2-registryd &

  x11vnc -display :99 -nopw -forever -shared -rfbport 5900 &
  websockify 6080 localhost:5900 &

  until wmctrl -m >/dev/null 2>&1; do sleep 1; done
  echo "[entrypoint] Desktop ready"

  exec python /app/backend.py
'
