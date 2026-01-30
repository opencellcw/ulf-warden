FROM nikolaik/python-nodejs:python3.11-nodejs20

WORKDIR /app

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

# Start
CMD ["npm", "start"]
