# Stage 1: Build the frontend
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Run the TSX server
FROM node:22-alpine
WORKDIR /app

# Install dependencies including dev dependencies (since tsx is used to run the app)
COPY package*.json ./
RUN npm ci

# Explicitly rebuild better-sqlite3 for the current architecture
RUN npm rebuild better-sqlite3

# Copy the server and shared logic
COPY server/ ./server/
COPY src/lib/calc/ ./src/lib/calc/
COPY src/lib/types/ ./src/lib/types/

# Copy the built frontend
COPY --from=build /app/dist ./dist

# Create a data directory for the SQLite database
RUN mkdir -p server/data

EXPOSE 3001
CMD ["npx", "tsx", "server/index.ts"]
