FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
COPY apps/api/package.json ./apps/api/
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn workspace @myshule/api build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
RUN yarn install --production --frozen-lockfile
EXPOSE 4000
CMD ["node", "dist/main.js"]
