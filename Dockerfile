FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
# Install dependencies. Ignore scripts to prevent issues, then explicitly rebuild better-sqlite3
RUN npm ci
RUN npm rebuild better-sqlite3

# Need to copy ts files so tsx can run them (or build them)
# For simplicity with the plan, we'll just run it with tsx in production too
# To properly build, we'd compile the server directory with tsc. 
# But let's just use tsx for now.
COPY server/ ./server/
COPY src/lib/calc/ ./src/lib/calc/
COPY src/lib/types/ ./src/lib/types/

# Ensure data directory exists
RUN mkdir -p data

EXPOSE 3001
CMD ["npx", "tsx", "server/index.ts"]
