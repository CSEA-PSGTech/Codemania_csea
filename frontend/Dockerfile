FROM node:20-alpine AS build

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build-time env vars — set to empty so API calls become relative paths
# (e.g. /api/*, /execute, /health) which the frontend nginx will proxy
ARG VITE_CORE_BACKEND_URL=""
ARG VITE_EXECUTION_SERVER_URL=""

ENV VITE_CORE_BACKEND_URL=$VITE_CORE_BACKEND_URL
ENV VITE_EXECUTION_SERVER_URL=$VITE_EXECUTION_SERVER_URL

# Build the production bundle
RUN npm run build

# ── Stage 2: Serve with nginx ────────────────────────────────────────
FROM nginx:alpine

# Remove default nginx site
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from the build stage
# vite outputs to dist/ by default; served under /codemania/ base path
COPY --from=build /app/dist /usr/share/nginx/html/codemania

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
