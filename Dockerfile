FROM node:20-bookworm-slim

# Install PostgreSQL and required deps
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        postgresql \
        postgresql-client \
        openssl \
        gosu && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/prisma ./prisma/
RUN npx prisma generate

COPY backend/ .
RUN npm run build

ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/booking_service?schema=public
ENV PORT=8080
ENV PGDATA=/var/lib/postgresql/data

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

CMD ["/entrypoint.sh"]
