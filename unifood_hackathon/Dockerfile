FROM node:18-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ sqlite-dev

# Copy package files
COPY package*.json ./

# Clean install dependencies
RUN rm -rf node_modules && npm cache clean --force && npm install

# Copy source code
COPY . .

# Remove local node_modules if they exist and reinstall
RUN rm -rf node_modules && npm install

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]