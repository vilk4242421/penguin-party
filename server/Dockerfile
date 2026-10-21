FROM node:20-alpine
WORKDIR /app
COPY game ./game
COPY server ./server
WORKDIR /app/server
RUN npm install --omit=dev
EXPOSE 8080
CMD ["node", "server.js"]
