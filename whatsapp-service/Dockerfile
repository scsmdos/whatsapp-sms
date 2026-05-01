FROM node:18-slim

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy app source
COPY . .

# Expose port
EXPOSE 3001

# Start the application
CMD [ "node", "app.js" ]
