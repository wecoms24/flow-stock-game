# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve (non-root for security)
FROM nginx:alpine
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN chown -R appuser:appgroup /var/cache/nginx /var/log/nginx /var/run && \
    sed -i 's/listen 80/listen 8080/' /etc/nginx/conf.d/default.conf
EXPOSE 8080
USER appuser
CMD ["nginx", "-g", "daemon off;"]
