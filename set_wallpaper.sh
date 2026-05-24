#!/bin/bash
# Get DBUS address from xfce4-session process (PID 21)
PID=21
eval $(cat /proc/$PID/environ 2>/dev/null | tr '\0' '\n' | grep DBUS_SESSION_BUS_ADDRESS | sed 's/^/export /')
export DISPLAY=:99

echo "DBUS: $DBUS_SESSION_BUS_ADDRESS"

WALL="/usr/share/backgrounds/mnemos/dark.png"

for WS in 0 1 2 3; do
    xfconf-query -c xfce4-desktop \
        -p /backdrop/screen0/monitorscreen/workspace${WS}/last-image \
        -s "$WALL"
    xfconf-query -c xfce4-desktop \
        -p /backdrop/screen0/monitorscreen/workspace${WS}/image-style \
        -t int -s 5
done

xfdesktop --reload 2>/dev/null || true
echo "Done"
