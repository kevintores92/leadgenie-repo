FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./

RUN npm run build

EXPOSE 3000

CMD ["node_modules/.bin/serve", "-s", "dist/public", "-l", "3000"]
