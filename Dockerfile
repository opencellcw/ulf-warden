FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy app
COPY . .

# Runtime
ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
