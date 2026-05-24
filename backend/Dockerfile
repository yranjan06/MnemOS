FROM ubuntu:24.04

ENV DISPLAY=:99
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    software-properties-common \
    build-essential \
    xvfb \
    x11-utils \
    xdotool \
    wmctrl \
    gnome-screenshot \
    avahi-daemon \
    gvfs \
    at-spi2-core \
    curl \
    wget \
    git \
    libx11-dev \
    libxtst-dev \
    libxinerama-dev \
    libxrandr-dev \
    libxi-dev \
    dbus-x11 \
    xclip \
    x11vnc \
    xterm \
    xfce4 \
    xfce4-terminal \
    xfce4-taskmanager \
    thunar \
    mousepad \
    libreoffice \
    gnome-calculator \
    adwaita-icon-theme \
    gnome-icon-theme \
    gtk2-engines-murrine \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y \
    python3 \
    python3-venv \
    python3-dev \
    python3-pip \
    python3-tk \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Google Chrome (bypasses Snap limitation)
RUN apt-get update && \
    wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    apt-get install -y ./google-chrome-stable_current_amd64.deb && \
    rm google-chrome-stable_current_amd64.deb && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Docker blocks the kernel namespaces Chrome's sandbox requires — --no-sandbox
# and --disable-dev-shm-usage are needed in every Docker environment regardless
# of which user runs the container. Wrap the binary so all launch paths get the flags.
RUN mv /usr/bin/google-chrome-stable /usr/bin/google-chrome-stable.real && \
    printf '#!/bin/sh\n# Clear stale profile lock left by previous container instance\nrm -f /root/.config/google-chrome/SingletonLock \\\n      /root/.config/google-chrome/SingletonCookie \\\n      /root/.config/google-chrome/SingletonSocket\nexec /usr/bin/google-chrome-stable.real --no-sandbox --disable-dev-shm-usage "$@"\n' \
        > /usr/bin/google-chrome-stable && \
    chmod +x /usr/bin/google-chrome-stable && \
    ln -sf /usr/bin/google-chrome-stable /usr/bin/google-chrome

ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN pip install --upgrade pip setuptools wheel websockify
RUN pip install --retries 5 --timeout 60 orbit-cua==0.2.47 python-dotenv pillow ddgs pandas fastapi uvicorn patchright croniter litellm hydradb-sdk
# pre-download embedding model so first run doesn't stall
RUN python3 -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')" 2>/dev/null || true
RUN apt-get update -o Acquire::Retries=3 && apt-get install -y fonts-ipafont-gothic fonts-freefont-ttf fonts-noto-color-emoji fonts-tlwg-loma-otf fonts-unifont fonts-wqy-zenhei xfonts-cyrillic || true && patchright install chromium --with-deps

# Pre-seed XFCE config running as root to avoid D-Bus permission issues
RUN mkdir -p /root/.config/xfce4/xfconf/xfce-perchannel-xml && \
    cat > /root/.config/xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<channel name="xfwm4" version="1.0">
  <property name="general" type="empty">
    <property name="theme" type="string" value="Default"/>
  </property>
</channel>
EOF

RUN touch /root/.Xauthority
RUN mkdir -p /root/Desktop /root/Downloads /root/Documents \
             /home/ubuntu/Desktop /home/ubuntu/Downloads /home/ubuntu/Documents \
             /home/computeruse/Desktop /home/computeruse/Downloads && \
    chmod -R 777 /root/Desktop /home/ubuntu /home/computeruse || true

# App code lives in /app — not mounted, never hidden by volumes
WORKDIR /app
COPY backend.py codegen.py state.py memory.py recovery.py /app/

# /workspace is the data directory — mounted as a volume by docker compose
RUN mkdir -p /workspace

EXPOSE 7878 6080 8000

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
