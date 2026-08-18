FROM node:18-slim

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    libx11-6 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libnss3 \
    libxss1 \
    libxtst6 \
    libxshmfence1 \
    libglu1-mesa \
    libxi6 \
    libgdk-pixbuf2.0-0 \
    libxrender1 \
    libfontconfig1 \
    libfreetype6 \
    libxext6 \
    libxfixes3 \
    libxinerama1 \
    libxcursor1 \
    libxkbcommon0 \
    libxkbcommon-x11-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome
RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get install -y ./google-chrome-stable_current_amd64.deb \
    && rm google-chrome-stable_current_amd64.deb

# Install Node dependencies
COPY package.json .
RUN npm install

# Copy app files
COPY . .

# Start server
CMD ["node", "index.js"]
