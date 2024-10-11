
The code provisions several resources including a CosmosDB account, Azure Function App, API Management with a GraphQL API, and other supporting services. Below is a detailed explanation of the code:.



### 1. Imports and Setup

```typescript
import { Construct } from "constructs";
import { TerraformStack, TerraformOutput } from "cdktf";
import { AzurermProvider } from "@cdktf/provider-azurerm/lib/provider";
import { ResourceGroup } from "@cdktf/provider-azurerm/lib/resource-group";
import { WindowsFunctionApp } from "@cdktf/provider-azurerm/lib/windows-function-app";
import { ApplicationInsights } from "@cdktf/provider-azurerm/lib/application-insights";
import { ServicePlan } from "@cdktf/provider-azurerm/lib/service-plan";
import { StorageAccount } from "@cdktf/provider-azurerm/lib/storage-account";
import { ApiManagement } from "@cdktf/provider-azurerm/lib/api-management";
import { ApiManagementApi } from "@cdktf/provider-azurerm/lib/api-management-api";
import { ApiManagementApiSchema } from "@cdktf/provider-azurerm/lib/api-management-api-schema";
import { CosmosdbAccount } from "@cdktf/provider-azurerm/lib/cosmosdb-account";
import { CosmosdbSqlDatabase } from "@cdktf/provider-azurerm/lib/cosmosdb-sql-database";
import { CosmosdbSqlContainer } from "@cdktf/provider-azurerm/lib/cosmosdb-sql-container";
import * as fs from "fs";
import * as dotenv from "dotenv";
import * as path from "path";

```
- The code begins by importing necessary modules and classes from the CDKTF library and Azure provider libraries.
- It imports fs for file system operations, dotenv to manage environment variables, and path for handling file paths.

### 2. Loading Environment Variables


```typescript
const environmentVariable = dotenv.config();

```
This line loads the environment variables defined in a .env file into environmentVariable, which can be used to retrieve sensitive Azure credentials.



### 3. Creating a Resource Group

```typescript
const resourceGroup = new ResourceGroup(this, "MyAPIResourceGroup", {
  name: "hasan123-api-resource-group",
  location: "Australia East",
});

```



### 4. Creating a Cosmos DB Account

```typescript
const cosmosAccount = new CosmosdbAccount(this, "cosmosAccount", {
  name: "cdktf-cosmosdb",
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
  offerType: "Standard",
  kind: "GlobalDocumentDB",
  automaticFailoverEnabled: true,
  geoLocation:[{
    location:"Australia East",
    failoverPriority: 0
  }],
  consistencyPolicy: {
    consistencyLevel: "Session",
  },
});

```
A Cosmos DB account is created with global document DB capabilities and automatic failover enabled. The consistency level is set to session.




### 5. Creating a SQL Database and Container

```typescript
const cosmosDatabase = new CosmosdbSqlDatabase(this, "cosmosDatabase", {
  name: "TodoDatabase",
  resourceGroupName: resourceGroup.name,
  accountName: cosmosAccount.name,
});

const cosmosConatiner= new CosmosdbSqlContainer(this, "cosmosContainer", {
  name: "Todos",
  resourceGroupName: resourceGroup.name,
  accountName: cosmosAccount.name,
  databaseName: cosmosDatabase.name,
  partitionKeyPaths: ["/id"],
});

```
A SQL database is created within the Cosmos DB account, along with a container for storing todo items.



### 6. Creating a Storage Account

```typescript
const storageAccount = new StorageAccount(this, "my-storage-account", {
  name: `storageaccounthasan123`,
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
  accountTier: "Standard",
  accountReplicationType: "LRS",
});

```
A storage account is created to store blobs and other data.



### 7. Creating an App Service Plan

```typescript
const appServicePlan = new ServicePlan(this, "my-app-service-plan", {
  name: "hasan123-my-app-service-plann",
  location: resourceGroup.location,
  resourceGroupName: resourceGroup.name,
  skuName: "B1",
  osType: "Windows",
});

```
An App Service plan is created to host the Function App.


### 8. Creating Application Insights and Function App

```typescript
const appInsights = new ApplicationInsights(this, "my-app-insights", {
  name: "my-app-insights-hasan123",
  location: resourceGroup.location,
  resourceGroupName: resourceGroup.name,
  applicationType: "web",
});

const functionApp = new WindowsFunctionApp(this, "my-function-app", {
  name: "my-function-app-hasan123",
  location: resourceGroup.location,
  resourceGroupName: resourceGroup.name,
  servicePlanId: appServicePlan.id,
  storageAccountName: storageAccount.name,
  storageAccountAccessKey: storageAccount.primaryAccessKey,
  httpsOnly: true,
  siteConfig: {
    alwaysOn: true,
    ftpsState: "AllAllowed",
    applicationStack: {
      nodeVersion: "~18",
    },
    cors: {
      allowedOrigins: ["*"],
    },
    remoteDebuggingEnabled: true,
    remoteDebuggingVersion: "VS2022",
  },
  appSettings: {
    FUNCTIONS_WORKER_RUNTIME: "node",
    WEBSITE_NODE_DEFAULT_VERSION: "18",
    APPINSIGHTS_INSTRUMENTATIONKEY: appInsights.instrumentationKey,
    AzureWebJobsStorage: `DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.primaryAccessKey};EndpointSuffix=core.windows.net`,
    SCM_DO_BUILD_DURING_DEPLOYMENT: "true",
    WEBSITE_CORS_ALLOWED_ORIGINS: "*",
    WEBSITE_RUN_FROM_PACKAGE: "1",
    REMOTE_DEBUGGING_ENABLED: "true",
    WEBSITE_AUTH_LEVEL: "Anonymous",
    COSMOS_CONNECTION_STRING: `AccountEndpoint=https://${cosmosAccount.name}.documents.azure.com:443/;AccountKey=${cosmosAccount.primaryKey};Database=${cosmosDatabase.name};`,
    DATABASE_NAME: cosmosDatabase.name,
    TODOS_CONTAINER: cosmosConatiner.name,
  },
  zipDeployFile: path.resolve(__dirname, "../function-app", "main-fn.zip"),
  builtinLoggingEnabled: true,
  enabled: true,
});


```
- Creates a Windows Function App named my-function-app-hasan123, linking it to the previously created storage account and service plan.
- Configures settings for application insights, CORS, runtime versions, and other application settings.
- The zipDeployFile property points to a deployment package.





### 9. Creating API Management 


```typescript
const apiManagement = new ApiManagement(this, "my-api-management", {
  name: `myapimanagement-hasan123`,
  location: resourceGroup.location,
  resourceGroupName: resourceGroup.name,
  publisherEmail: "hasansattar650@example.com",
  publisherName: "Hasan Sattar",
  skuName: "Developer_1",
});
```
- An API Management instance named myapimanagement-hasan123 is created to manage APIs with specified publisher information.


```typescript
const apiManagementApi = new ApiManagementApi(this, "my-graphql-api", {
  name: "hasan-graphql",
  resourceGroupName: resourceGroup.name,
  apiManagementName: apiManagement.name,
  protocols: ["https"],
  apiType: "graphQL",
  displayName: "Hasan GraphQL API",
  path: "graphql",
});
```
- A GraphQL API named hasan-graphql is created under the API Management instance, allowing secure access to the GraphQL endpoint.



### 10. Creating API Schema:

```typescript
 // // API Management Schema (Upload GraphQL Schema)
    new ApiManagementApiSchema(this, "GraphQLSchema", {
      apiManagementName: apiManagement.name,
      apiName: api.name,
      resourceGroupName: resourceGroup.name,
      schemaId: "graphqlSchema", // // Ensure this is a unique identifier for the schema
      contentType: "application/graphql", // GraphQL schema content type forexample=  contentType: "application/graphql"
      value: graphqlSchemaContent, // The schema content
      timeouts: {
        read: "20m",
        create: "20m", // Increase the timeout for creation to 10 minutes
        update: "20m", // Increase the timeout for updates to 10 minutes
      },
      dependsOn: [apiManagement, api],
    });

```


### 11. Graphql/schema.graphql

```graphql
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
```

### 12. Appollo server Function 

```typescript
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

```




# Summary:
This Terraform CDKTF script creates a full stack of Azure services for hosting a GraphQL API with a backend stored in Cosmos DB, including monitoring and logging capabilities. Each resource is carefully configured with dependencies and outputs, making the setup robust and maintainable.



### Testing the Function in azure console


**``Get Todo Graphql``**

```graphal
query {
  getTodos {
    id
    title
    done
  }
}

```
**``Get Todo JSON Object``**
```json
{
  "query": "query { getTodos { id title done } }"
}

```


**``Add Todo Grpahql``**
```graphal
mutation {
  addTodo(todo: {id: "1", title: "Finish the project", done: false}) {
    id
    title
    done
  }
}

```

**``Add Todo JSON Object``**
```json
{
  "query": "mutation addTodo($todo: TodoInput!) { addTodo(todo: $todo) { id title done } }",
  "variables": {
    "todo": {
      "id": "9",
      "title": "Finish the project",
      "done": false
    }
  }
}

```


**``Update Todo Graphql``**

```graphal
mutation {
  updateTodo(todo: {id: "1", title: "Finish the project", done: true}) {
    id
    title
    done
  }
}


```

**``Update Todo JSON Object``**
```json
{
  "query": "mutation { updateTodo(todo: {id: \"1\", title: \"Finish the project\", done: true}) { id title done } }"
}

```


**``Delete Todo Graphql``**


```graphal
mutation {
  deleteTodo(todoId: "1")
}


```
**``Delete Todo JSON Object``**

```json
{
  "query": "mutation deleteTodo($todoId: Int!) { deleteTodo(todoId: $todoId) }",
  "variables": {
    "todoId": 10
  }
}

```


