# Execution Server Dockerfile - OPTIMIZED
# Uses Eclipse Temurin (pre-built Java) + Python

FROM eclipse-temurin:17-jdk-jammy

# Install Python and Node.js
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for python command
RUN ln -s /usr/bin/python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create temp directory for code execution
RUN mkdir -p /app/temp

# Expose port
EXPOSE 6001

# Environment variables
ENV PYTHON_PATH=/usr/bin/python3
ENV JAVA_PATH=/usr/bin/java
ENV JAVAC_PATH=/usr/bin/javac

# Start the server
CMD ["node", "server.js"]
