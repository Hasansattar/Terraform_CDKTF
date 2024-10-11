import { ApolloServer } from "apollo-server-azure-functions";
import { gql } from "apollo-server-core";
import { CosmosClient } from "@azure/cosmos";
import { Context } from "@azure/functions";

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING as string);
const database = client.database(process.env.DATABASE_NAME as string);
const container = database.container(process.env.TODOS_CONTAINER as string);

// GraphQL Schema
const typeDefs = gql`
  type Todo {
    id: ID!
    title: String!
    done: Boolean!
  }

  input TodoInput {
    id: ID!
    title: String!
    done: Boolean!
  }

  type Query {
    getTodos: [Todo]
  }

  type Mutation {
    addTodo(todo: TodoInput!): Todo
    updateTodo(todo: TodoInput!): Todo
    deleteTodo(todoId: String!): String
  }
`;

// Resolvers
const resolvers = {
  Query: {
    getTodos: async (_: any, __: any, context: Context) => {
      context.log("Fetching all todos...");
      try {
        const { resources } = await container.items.readAll().fetchAll();
        context.log(`Successfully fetched ${resources.length} todos.`);
        const listOfData = resources.map((todo: any) => ({
          id: todo.id,
          title: todo.title,
          done: todo.done,
        }));

        context.log(`Successfully fetched List`, listOfData);
        return listOfData;
      } catch (error) {
        context.log("Error fetching todos:", error);
        throw new Error("Failed to fetch todos.");
      }
    },
  },
  Mutation: {
    addTodo: async (_: any, { todo }: any, context: Context) => {
      context.log("Adding a new todo...");
      console.log("Adding a new todo...");
      const newTodo = {
        id: todo.id,
        title: todo.title,
        done: todo.done || false, // Default value for done
      };
      try {
        const { resource } = await container.items.create(newTodo);
        context.log("Todo added successfully:", resource);
        if (!resource) {
          throw new Error("Failed to create todo.");
        }

        return {
          id: resource.id,
          title: resource.title,
          done: resource.done,
        };
      } catch (error) {
        context.log("Error adding todo:", error);
        throw new Error("Failed to add todo.");
      }
    },
    updateTodo: async (_: any, { todo }: any, context: Context) => {
      context.log(`Updating todo with ID: ${todo.id}`);
      try {
        const partitionKeyValue = todo.id;
        const { resource } = await container
          .item(todo.id, partitionKeyValue)
          .read();
        const updatedTodo = { ...resource, title: todo.title, done: todo.done };

        const { resource: updatedResource } = await container
          .item(todo.id, partitionKeyValue)
          .replace(updatedTodo);
        context.log("Todo updated successfully:", updatedResource);
        return updatedResource;
      } catch (error) {
        context.log("Error updating todo:", error);
        throw new Error("Failed to update todo.");
      }
    },
    deleteTodo: async (_: any, { todoId }: any, context: Context) => {
      context.log(`Deleting todo with ID: ${todoId}`);

      try {
        // Replace `<partitionKeyValue>` with the actual partition key value for the todos.
        const partitionKeyValue = todoId; // Assuming `id` is used as the partition key
        const { resource: existingTodo } = await container
          .item(todoId, partitionKeyValue)
          .read();

        if (!existingTodo) {
          context.log(`Todo with ID ${todoId} does not exist.`);
          throw new Error(`Todo with ID ${todoId} does not exist.`);
        }

        await container.item(todoId, partitionKeyValue).delete();

        context.log(`Todo with ID ${todoId} deleted successfully.`);
        return todoId;
      } catch (error) {
        context.log("Error deleting todo:", error);
        throw new Error("Failed to delete todo.");
      }
    },
  },
};

// Apollo Server setup
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ context }: { context: Context }) => context,
});

export const main = (context: Context, req: any) => {
  context.log("Received request:", req.body);
  return server.createHandler()(context, req);
};
