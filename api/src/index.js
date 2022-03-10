const express = require('express');
const { ApolloServer } = require('apollo-server-express');
require('dotenv').config();

const db = require('./db');
const models = require('./models');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');

const port = process.env.PORT || 4000;
const DB_HOST = process.env.DB_HOST;

const app = express();

db.connect(DB_HOST);

// Настраиваем Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: () => {
    // Добавление моделей БД в контекст
    return { models };
  }
});

// Применяем промежуточное ПО Apollo GraphQL и указываем путь к /api
server.applyMiddleware({ app, path: '/api' });

app.listen({ port }, () =>
  console.log(
    `GraphQL Server running at http://localhost:${port} - ${server.graphqlPath}`
  )
);
