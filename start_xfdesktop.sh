#!/bin/bash
pkill xfdesktop 2>/dev/null
sleep 0.5
DBUS=$(cat /proc/1/environ 2>/dev/null | tr '\0' '\n' | grep DBUS_SESSION_BUS_ADDRESS | head -1)
export DISPLAY=:99
export $DBUS
xfdesktop --sm-client-disable &
sleep 1
echo "xfdesktop started"
