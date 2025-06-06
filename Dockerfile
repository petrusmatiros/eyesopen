FROM node:20-alpine

# Create working dir
WORKDIR /app

# Copy package files and install prod dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code
COPY . .

# App listens on 3000 internally
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
