# Build stage
FROM node:18 AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Production stage
FROM node:18

WORKDIR /app

# Create a non-root user
RUN groupadd -r nodejs && useradd -r -g nodejs -s /bin/false nodejs

# Install production dependencies and build tools
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm rebuild bcrypt --build-from-source && \
    npm rebuild sqlite3 --build-from-source

# Copy source code
COPY --from=builder /app/src ./src

# Create volume directory for SQLite database and set permissions
RUN mkdir -p /app/data && \
    chown -R nodejs:nodejs /app/data && \
    chmod 755 /app/data

# Set environment variables
ENV NODE_ENV=production
ENV DB_PATH=/app/data/database.sqlite

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "src/index.js"]