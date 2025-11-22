FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for certificate generation
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Generate Prisma client
COPY src/db/schema.prisma ./prisma/schema.prisma
RUN npx prisma generate

# Build TypeScript
RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
