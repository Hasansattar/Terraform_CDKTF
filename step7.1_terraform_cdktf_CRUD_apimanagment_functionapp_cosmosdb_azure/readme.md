
This TypeScript code provides a robust setup for deploying a serverless architecture on Azure. It creates a resource group, Cosmos DB for data storage, a storage account, an App Service plan, a Function App, Application Insights for monitoring, and API Management for handling requests. Each resource is configured with relevant settings, making it a comprehensive deployment script.



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
import { ApiManagementApiOperation } from "@cdktf/provider-azurerm/lib/api-management-api-operation";
import { CosmosdbAccount } from "@cdktf/provider-azurerm/lib/cosmosdb-account";
import { CosmosdbSqlDatabase } from "@cdktf/provider-azurerm/lib/cosmosdb-sql-database";
import { CosmosdbSqlContainer } from "@cdktf/provider-azurerm/lib/cosmosdb-sql-container";
import * as dotenv from "dotenv"; 
import * as path from "path";

```
- **Constructs**: A base class from the constructs library for defining reusable components in CDK.
- **TerraformStack**: A class that represents a single stack in Terraform.
- **Providers**: Various Azure resources are imported from the @cdktf/provider-azurerm package, allowing the code to define and manage Azure services.
- **dotenv**: Used to load environment variables from a .env file, allowing for sensitive information management (like credentials).
- **path**: A Node.js module to handle file and directory paths.


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
  zipDeployFile: path.resolve(
    __dirname,
    "../function-app",
    "function.zip"
  ),
  builtinLoggingEnabled: true,
  enabled: true,
});

```
- Application Insights: Creates an Application Insights resource for monitoring.
- Function App: Creates a Windows Function App, configuring various settings, including the runtime stack (Node.js), CORS settings, and application settings for connecting to other services like Cosmos DB and Storage.





### 9. Creating API Management and API Operations


```typescript
const apiManagement = new ApiManagement(this, "my-api-management", {
  name: `myapimanagement-hasan123`,
  location: resourceGroup.location,
  resourceGroupName: resourceGroup.name,
  publisherEmail: "hasansattar650@example.com",
  publisherName: "Hasan Sattar",
  skuName: "Developer_1",
});

// Create a GraphQL API in API Management
const api = new ApiManagementApi(this, "my-graphql-api", {
  name: "todo-graphql-api",
  apiManagementName: apiManagement.name,
  resourceGroupName: resourceGroup.name,
  path: "my-api",
  protocols: ["https"],
  displayName: "Todo GraphQL API",
  serviceUrl: `https://${functionApp.defaultHostname}/api/main`,
  revision: "1",
});

```
- An API Management instance is created to manage APIs.
- A GraphQL API is defined, pointing to the Function App's endpoint.



### 10. Defining API Operations

```typescript
new ApiManagementApiOperation(this, "getTodosOperation", {
  apiName: api.name,
  resourceGroupName: resourceGroup.name,
  apiManagementName: apiManagement.name,
  operationId: "getTodos",
  displayName: "Get Todos",
  method: "GET",
  urlTemplate: "/",
  request: {
    queryParameter: []
  },
  response: [{
    statusCode: 200,
    description: "List of Todos",
    representation: [{
      contentType: "application/json",
    }]
  }],
});

```
Defines various operations (GET, POST, PUT, DELETE) for the API. Each operation includes details about the request and response.




### 11. Output Variables

```typescript
new TerraformOutput(this, "function_app_url", {
  value: functionApp.defaultHostname,
});

```



### Testing the Function in azure console


**``Add Todo``**

```json
{
  "info": {
    "fieldName": "addTodo"
  },
  "arguments": {
    "todo": {
      "id": "1",
      "title": "Test Todo",
      "done": false
    }
  }
}

```
**``Delete Todo``**

```json
{
  "info": {
    "fieldName": "deleteTodo"
  },
  "arguments": {
    "todoId": "2"
  }
}

```

**``Get Todo``**

```json
{
  "info": {
    "fieldName": "getTodos"
  }
}
```

**``Update Todo``**

```json
{
  "info": {
    "fieldName": "updateTodo"
  },
  "arguments": {
    "todo": {
      "id": "1",
      "title": "hasan Todo",
      "done": true
    }
  }
}
```