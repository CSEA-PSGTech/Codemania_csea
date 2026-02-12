FROM node:20-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Define build arguments for environment variables
ARG VITE_CORE_BACKEND_URL
ARG VITE_EXECUTION_SERVER_URL

# Set environment variables from build args for Vite build
ENV VITE_CORE_BACKEND_URL=${VITE_CORE_BACKEND_URL}
ENV VITE_EXECUTION_SERVER_URL=${VITE_EXECUTION_SERVER_URL}

RUN npm run build

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
