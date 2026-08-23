# ---- Stage 1: build the static React app ----
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

# VITE_API_URL is baked in at build time — pass it via --build-arg in CI/CD
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---- Stage 2: serve with nginx ----
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# The official nginx image runs envsubst on every file in
# /etc/nginx/templates/*.template at container startup, writing the result
# to /etc/nginx/conf.d/. Restricting the filter to just BACKEND_URL means
# nginx's own runtime variables ($host, $remote_addr, etc.) in the template
# are left alone and only our one placeholder gets replaced.
ENV NGINX_ENVSUBST_FILTER=BACKEND_URL
# Sensible default so the image also runs standalone without extra config;
# override this per-environment (see README) to point at a real backend.
ENV BACKEND_URL=http://localhost:8020

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
