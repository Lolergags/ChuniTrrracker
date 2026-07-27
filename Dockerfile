FROM node:22-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install git, curl, and wget for the Update Manager, then install ALL dependencies
RUN apk add --no-cache git curl wget
RUN git config --global --add safe.directory '*'
ENV GIT_TERMINAL_PROMPT=0
RUN npm install

# Copy the rest of the application source code
COPY . .

# Guarantee the database directory exists
RUN mkdir -p server/data

# Build the frontend via Vite
RUN npm run build

EXPOSE 3001

# Execute the TypeScript server directly using tsx
CMD ["npx", "tsx", "server/index.ts"]