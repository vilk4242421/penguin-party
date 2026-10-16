FROM node:20-alpine
WORKDIR /app
COPY game ./game
COPY server ./server
WORKDIR /app/server
RUN npm install --omit=dev
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
