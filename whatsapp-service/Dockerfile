FROM ghcr.io/puppeteer/puppeteer:21.5.2

# Puppeteer image runs as 'pptruser' by default. We switch to root to install deps if needed, 
# then back to pptruser. But for simple node deps, we can just use the user.

USER root
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
# Using npm ci for clean install
RUN npm ci

# Copy app source
COPY . .

# Create necessary directories for whatsapp-web.js and set permissions
RUN mkdir -p .wwebjs_auth .wwebjs_cache uploads \
    && chown -R pptruser:pptruser /usr/src/app

# Switch back to non-root user for security and Puppeteer compatibility
USER pptruser

# Expose port (Render sets PORT env var, but good to document)
EXPOSE 3001

# Start the application
CMD [ "node", "index.js" ]
