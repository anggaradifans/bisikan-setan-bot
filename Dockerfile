# Use the official Node.js runtime as the base image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install the application dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy the rest of the application code
COPY . .

# Create a non-root user to run the application
RUN addgroup -g 1001 -S nodejs && \
    adduser -S botuser -u 1001

# Change ownership of the working directory to the botuser
RUN chown -R botuser:nodejs /app
USER botuser

# Expose the port the app runs on (if needed for health checks)
EXPOSE 3000

# Command to run the application
CMD ["node", "index.js"]
