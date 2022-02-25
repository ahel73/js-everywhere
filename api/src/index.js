// index.js
// This is the main entry point of our application
const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');

const port = process.env.PORT || 4000;

// Схема с помощью языка схем GraphQl
const typeDefs = gql`
  type Query {
    hello: String
  }
`;

// Распознователь полей схемы
const resolvers = {
  Query: {
    hello: () => 'Hello world!!!!'
  }
};

const app = express();

// Настраиваем Apollo Server
const server = new ApolloServer({ typeDefs, resolvers });

server.applyMiddleware({ app, path: '/api' });

app.listen({ port }, () =>
  console.log(
    `GraphQL Server running at http://localhost:${port} - ${server.graphqlPath}`
  )
);
