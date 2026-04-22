FROM node:20-alpine

# Install dependencies for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/prisma ./prisma/
RUN npx prisma generate

COPY backend/ .
RUN npm run build

EXPOSE 3001

ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/booking_service?schema=public
ENV PORT=3001

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run db:seed && npm start"]
