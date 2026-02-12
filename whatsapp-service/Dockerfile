FROM ghcr.io/puppeteer/puppeteer:22.4.1

# Switch to root to install dependencies if needed (Puppeteer image handles most)
USER root

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies (ignoring scripts to speed up)
RUN npm ci --only=production

# Copy app source
COPY . .

# Environment variables
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Expose port
EXPOSE 3001

# Start the application
CMD [ "node", "index.js" ]
