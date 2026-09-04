FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
ENV RESULT_OUTBOX_PATH=/data/result-outbox.json
EXPOSE 3005
CMD ["npm", "start"]
