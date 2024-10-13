 Type of the Data Source. Valid values: 
 **``AWS_LAMBDA``**, **``AMAZON_DYNAMODB``**, **``AMAZON_ELASTICSEARCH``**, **``HTTP``**, **``NONE``**, **``RELATIONAL_DATABASE``**, **``AMAZON_EVENTBRIDGE``**, **``AMAZON_OPENSEARCH_SERVICE``**.



 If you want to use a None data source in AWS AppSync, it means you are not connecting to any external data source (like DynamoDB, Lambda, etc.). Instead, this is typically used when you want to implement custom logic directly in the request and response mapping templates, such as performing a data transformation or triggering an event.


This code is written in TypeScript and uses the CDK for Terraform (CDKTF) to create and manage infrastructure as code, specifically for an AWS AppSync API with None DataSource and custom GraphQL resolvers.


### 1. Imports
```typescript
import { Construct } from "constructs";
import { TerraformStack, TerraformOutput } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { AppsyncGraphqlApi } from "@cdktf/provider-aws/lib/appsync-graphql-api";
import { AppsyncDatasource } from "@cdktf/provider-aws/lib/appsync-datasource";
import { AppsyncResolver } from "@cdktf/provider-aws/lib/appsync-resolver";
import { AppsyncApiKey } from "@cdktf/provider-aws/lib/appsync-api-key";
import * as fs from "fs";
import * as path from "path";

```
- Construct, TerraformStack, TerraformOutput: These are base classes from the CDKTF library that help define the stack and output values.
- AwsProvider: Configures the AWS provider for the region, making resources deployable in AWS.
- AppsyncGraphqlApi, AppsyncDatasource, AppsyncResolver, AppsyncApiKey: These are classes for managing AWS AppSync resources (GraphQL API, Datasource, Resolver, and API Key).
- fs and path: Node.js modules for file system operations (to read the GraphQL schema file).


### 2. AWS Provider Setup

```typescript
new AwsProvider(this, "AWS", {
  region: "us-east-1",
});

```
- **AwsProvider**: This defines the AWS provider configuration. In this case, resources will be deployed in the us-east-1 region.

### 3. Load GraphQL Schema
```typescript
const schemaPath = path.resolve(__dirname, "../graphql-api/schema.graphql");
const schemaContent = fs.readFileSync(schemaPath, "utf-8");
console.log("schemaContent ==> ", schemaContent);

```
- The schema is loaded from a file located in the graphql-api folder.
- fs.readFileSync reads the file and returns its contents, which will be used to define the GraphQL schema in AppSync.

### 4. Define AppSync GraphQL API

```typescript
const api = new AppsyncGraphqlApi(this, "GRAPHQL_API", {
  name: "cdktf-api",
  authenticationType: "API_KEY",
  schema: schemaContent, 
  xrayEnabled: true,
});

```
AppsyncGraphqlApi: Creates the AppSync GraphQL API with the following parameters

- name: The name of the API is "cdktf-api".
- authenticationType: Uses API Key authentication.
- schema: The GraphQL schema is passed, which was loaded earlier.
- xrayEnabled: Enables AWS X-Ray tracing for the API.


### 5. Generate API Key
```typescript
const currentDate = new Date();
const expirationDate = new Date(currentDate);
expirationDate.setDate(currentDate.getDate() + 365); 
const expirationIsoString = expirationDate.toISOString();

const apiKey = new AppsyncApiKey(this, "AppSyncApiKey", {
  apiId: api.id,
  expires: expirationIsoString, 
});

```
- This generates an API key that expires one year (365 days) from the current date.
- AppsyncApiKey: Creates an API key linked to the AppSync API. The expiration date is set using ISO string format

### 6. Define None Data Source

```typescript
const noneDataSource = new AppsyncDatasource(this, "NoneDataSource", {
  apiId: api.id,
  name: "NoneDataSource",
  type: "NONE",
});

```
- AppsyncDatasource: This defines a data source with type: NONE. None data sources are used when you don't need to connect to external databases or services.
- In this case, it allows handling requests directly using custom resolvers without any backend data source.

### 7. Define AppSync Resolvers


```typescript
new AppsyncResolver(this, "getTodosResolver", {
  apiId: api.id,
  type: "Query",
  field: "readStatus",
  dataSource: noneDataSource.name,
  requestTemplate: `
    {
      "version" : "2018-05-29",
      "payload": {
        "message": "This is a custom resolver using None data source"
      }
    }
  `,
  responseTemplate: `{
    "status": "This is the status from readStatus query"
  }`,
});

```
AppsyncResolver: Defines the resolver for the Query field "readStatus"

- requestTemplate: A VTL (Velocity Template Language) string that specifies what is sent to the resolver. It includes a custom message.
- responseTemplate: A VTL string that formats the response from the resolver, returning a custom status message.


```typescript
new AppsyncResolver(this, "addTodoResolver", {
  apiId: api.id,
  type: "Mutation",
  field: "changeStatus",
  dataSource: noneDataSource.name,
  requestTemplate: `
    {
      "version" : "2018-05-29",
      "payload": $util.toJson($ctx.args)
    }
  `,
  responseTemplate: `
   {
    "status": "Status changed to: $ctx.args.status"
   }
  `,
});

```
Another resolver is created for the Mutation field "changeStatus". This accepts an argument (status) and returns a status message indicating the change.

- requestTemplate: Sends the input arguments to the resolver.
- responseTemplate: Returns a message indicating the new status.


#### 8. Output API URL and API Key

```typescript
new TerraformOutput(this, "APIGraphQlURL", {
  value: api.uris,
});

new TerraformOutput(this, "GraphQLAPIKey", {
  value: apiKey.id,
});

```
These two TerraformOutput instances output the GraphQL API URL and the generated API key, which are essential for accessing the API.


# Summary

This code defines a Terraform stack for deploying an AWS AppSync GraphQL API using CDKTF (Cloud Development Kit for Terraform). It starts by setting up the AWS provider and loading a GraphQL schema from a file, which is then used to create an AppSync API with API key authentication and AWS X-Ray tracing enabled. A None DataSource is defined, allowing the API to handle queries and mutations without a backend. Custom resolvers are created for two operations: readStatus (a query) and changeStatus (a mutation), both using the None DataSource. The request and response templates for these operations are specified using Velocity Template Language (VTL), allowing the API to respond with custom messages. An API key is generated with a one-year expiration, and Terraform outputs are created to display the GraphQL API's URL and the API key. This stack deploys a simple in-memory API, suitable for scenarios without backend data storage.

