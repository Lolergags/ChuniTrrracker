FROM node:22-alpine

# Install git and bash for the Update Manager and entrypoint
RUN apk add --no-cache git bash python3 make g++ 

# Copy the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /app

EXPOSE 3001
CMD ["/entrypoint.sh"]
