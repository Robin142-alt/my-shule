FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY apps/sms-relay/package*.json ./
COPY apps/sms-relay/tsconfig.json ./tsconfig.json
COPY apps/sms-relay/src ./src
RUN npm install --no-save --no-audit --no-fund typescript@5.7.2 @types/node@22.10.2

FROM deps AS build
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
