# Standalone IRMA relay image — for Fly.io, Railway, or any container host.
# Build context = the relay/ directory.
#   fly launch        (then: fly deploy)
#   railway up
FROM node:24-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.mjs ./
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.mjs"]
