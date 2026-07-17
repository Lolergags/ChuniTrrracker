FROM node:22-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install ALL dependencies so Vite and tsx are available
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the frontend via Vite
RUN npm run build

EXPOSE 3001

# Execute the TypeScript server directly using tsx, just like your old setup
CMD ["npx", "tsx", "server/index.ts"]