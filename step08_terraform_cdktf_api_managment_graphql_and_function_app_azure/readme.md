





#### 1. Import Statements


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
import { ApiManagementApiSchema } from "@cdktf/provider-azurerm/lib/api-management-api-schema"; 

import * as fs from 'fs';
import * as dotenv from "dotenv";
import * as path from "path";

```
- **Imports** various modules from the CDKTF library for managing Azure resources, including resource groups, function apps, and API management.
- Imports fs for file system operations, ``dotenv`` for environment variable management, and ``path`` for handling file paths.


#### 2. Loading Environment Variables


```typescript
const environmentVariable = dotenv.config();
console.log("environmentVariable===>", environmentVariable);

```
Loads environment variables from a .env file using the dotenv package and logs them to the console. This is useful for keeping sensitive information like Azure credentials out of the code.


#### 3. Azure Provider Configuration

```typescript
new AzurermProvider(this, "AzureRM", {
  features: [{}],
  subscriptionId: environmentVariable.parsed?.ARM_SUBSCRIPTION_ID || "your-subscription-id",
  clientId: environmentVariable.parsed?.ARM_CLIENT_ID || "your-client-id",
  clientSecret: environmentVariable.parsed?.ARM_CLIENT_SECRET || "your-client-secret",
  tenantId: environmentVariable.parsed?.ARM_TENANT_ID || "your-tenant-id",
});

```
Initializes the Azure provider with credentials and configuration details for interacting with Azure resources. It retrieves the credentials from the environment variables or falls back to default placeholders.


#### 4. Creating a Resource Group


```typescript
const resourceGroup = new ResourceGroup(this, "MyAPIResourceGroup", {
  name: "hasan123-api-resource-group",
  location: "Australia East",
});

```
Creates an Azure Resource Group named hasan123-api-resource-group in the Australia East region, which will contain all the other resources.



### 5. Creating a Storage Account
```typescript
const storageAccount = new StorageAccount(this, "my-storage-account", {
  name: `storageaccounthasan123`,
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
  accountTier: "Standard",
  accountReplicationType: "LRS",
});

```
Defines a Storage Account with a globally unique name storageaccounthasan123. It specifies the resource group, location, account tier, and replication type.


### 6. Creating an App Service Plan
```typescript
const appServicePlan = new ServicePlan(this, "my-app-service-plan", {
  name: "hasan123-my-app-service-plan",
  location: resourceGroup.location,
  resourceGroupName: resourceGroup.name,
  skuName: "B1",
  osType: "Windows",
});

```
Creates an App Service Plan named hasan123-my-app-service-plan in the specified resource group and location. The SKU type is set to B1, and the operating system type is Windows.


### 7. Creating Application Insights

```typescript
const appInsights = new ApplicationInsights(this, "my-app-insights", {
  name: "my-app-insights-hasan123",
  location: resourceGroup.location,
  resourceGroupName: resourceGroup.name,
  applicationType: "web",
});

```
Sets up Application Insights for monitoring and logging, specifying the resource group and application type as ``web``


### 8. Creating a Function App



```typescript
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
  },
  zipDeployFile: path.resolve(__dirname, "../function-app", "function-serverlesss.zip"),
  builtinLoggingEnabled: true,
  enabled: true,
});

```
Creates a Windows Function App with the specified configuration, such as storage account, service plan, app settings, and site configuration, including CORS settings and remote debugging options. The function app code is deployed from a zip file.


### 9. Creating an API Management Instance

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
Sets up an Azure API Management instance, specifying the publisher email and name, along with the SKU type.


### 10. Creating a GraphQL API
```typescript
const apiManagementApi  = new ApiManagementApi(this, "my-graphql-api", {
  apiManagementName: apiManagement.name,
  resourceGroupName: resourceGroup.name,
  name: "graphql-api",
  path: "graphql",
  protocols: ["https"],
  displayName: "My GraphQL API",
  serviceUrl: `https://${functionApp.defaultHostname}/api/function-serverless`,
  revision: "1",
});
```
Creates a GraphQL API in API Management that routes requests to the Function App. It specifies the display name, URL path, and protocols.


### 11. Uploading the GraphQL Schema

```typescript
const graphqlSchemaPath = path.resolve(__dirname, "../graphql-api", "schema.graphql");
const graphqlSchemaContent = fs.readFileSync(graphqlSchemaPath, "utf-8");

new ApiManagementApiSchema(this, "GraphQLSchema", {
  apiManagementName: apiManagement.name,
  apiName: apiManagementApi.name,
  resourceGroupName: resourceGroup.name,
  schemaId: "graphqlSchema",
  contentType: "application/vnd.ms-azure-apim.graphql.schema",
  value: graphqlSchemaContent,
});

```
Reads a GraphQL schema file and uploads it to the API Management service as a schema for the created API.


### 12. Creating a GraphQL Operation

```typescript
new ApiManagementApiOperation(this, "graphql-query-operation", {
  resourceGroupName: resourceGroup.name,
  apiManagementName: apiManagement.name,
  apiName: apiManagementApi.name,
  operationId: "graphql-query-hello",
  displayName: "GraphQL Hello Query",
  method: "POST",
  urlTemplate: "/",
  response: [
    {
      statusCode: 200,
      description: "Query for hello",
    },
  ],
});

```
Defines a GraphQL operation for a "hello" query that can be called via a POST request to the API. The operation includes a response description for the successful response.

### 13. Terraform Outputs

```typescript
new TerraformOutput(this, "function_app_url", {
  value: `https://${functionApp.defaultHostname}/api/function-serverless`,
});

new TerraformOutput(this, "GraphQLApiUrl", {
  value: `https://${apiManagement.name}.azure-api.net/${apiManagementApi.path}`,
});

```

### 14. graphql schema

``graphql/schema.graphql``

```graphql
type Query {
  hello: String
  getUser(id: ID!): User

  
}

type Mutation {
  createUser(name: String!, email: String!): User
}

type User {
  id: ID!
  name: String!
  email: String!
}
```


### 15.  File Structure of Function in Function App


```typescript
function-serverless.zip
├── function-name/
│   ├── function.json
│   ├── index.js
│   ├── package.json
│   ├── node_modules/
└── host.json

```
Here’s how the file structure should look:

## Manual Testing Using Postman:

- Open Postman and create a new POST request.
- Set the request URL to your endpoint (assuming you're running this locally or on a cloud platform). 


##### 1. In the request body, add the GraphQL query as JSON in this format:

```graphql
{
  "query": "query { hello }"
}
```
Send the request, and check if you get the expected response: {"data": {"hello": "Hello, World!"}}.

##### 2. createUser:
```graphql
{
  "query": "mutation { createUser(name: \"John Doe\", email: \"john@example.com\") }"
}
```

##### 3. getUser:
```graphql
{
  "query": "query { getUser(id: \"<user-id>\") }"
}
```




# Conclusion
This code represents a comprehensive setup for deploying a serverless architecture on Azure using the CDK for Terraform. The configuration covers the necessary components to run a GraphQL API backed by Azure Functions, storage, monitoring, and API management. Each component is well-structured, ensuring that the deployment can be managed and updated effectively