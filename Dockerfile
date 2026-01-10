# Base image with Node.js
FROM node:18-bullseye-slim

# Install Python, pip, and FFmpeg (System dependencies)
# We need python3-pip to install yt-dlp
# We need ffmpeg for the merging functionality
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp via pip
RUN python3 -m pip install -U yt-dlp

# Set working directory
WORKDIR /app

# Copy package.json and install Node dependencies
COPY package*.json ./
# We don't strictly need ffmpeg-static since we installed ffmpeg via apt, 
# but keeping it in package.json is fine (it might just consume space)
# or we can remove it. For now, we keep it simple.
RUN npm install

# Copy application source code
COPY . .

# Create downloads directory
RUN mkdir -p downloads

# Expose port (Render uses 10000 by default sometimes, but we can set PORT env)
ENV PORT=3000
EXPOSE 3000

# Start command
CMD ["node", "server.js"]
