# Use the official Playwright image which has all browsers and deps pre-installed.
# Keep this tag in sync with the "playwright" version in package.json.
FROM mcr.microsoft.com/playwright:v1.64.1-jammy

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the port (Render will override this with process.env.PORT)
EXPOSE 4000

# Start the application
CMD ["node", "index.js"]
