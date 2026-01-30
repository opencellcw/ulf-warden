FROM nikolaik/python-nodejs:python3.11-nodejs20

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | \
    gpg --dearmor -o /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | \
    tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && \
    apt-get install -y gh && \
    rm -rf /var/lib/apt/lists/*

# Create data directory for persistence
RUN mkdir -p /data/logs

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev for build)
RUN npm install

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Environment
ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV LOGS_DIR=/data/logs

# Volume for persistent data (if using Render persistent disk)
VOLUME ["/data"]

# Start
CMD ["npm", "start"]
