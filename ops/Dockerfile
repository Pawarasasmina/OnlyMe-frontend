FROM node:22-alpine
WORKDIR /monitor
COPY ops/package*.json ./
RUN npm ci --omit=dev
COPY ops/monitor.mjs ./monitor.mjs
USER node
CMD ["node", "monitor.mjs"]
