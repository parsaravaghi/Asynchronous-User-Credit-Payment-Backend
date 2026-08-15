FROM node:26-alpine

COPY package*.json .

RUN npm i

COPY . .

EXPOSE 3000

CMD [ "npm", "start" ]