# Dockerfile for nginx reverse proxy
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 8080 (as per your nginx.conf)
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
