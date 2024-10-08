Creates a serverless application consisting of an AWS AppSync GraphQL API, a Lambda function, a DynamoDB table, and necessary permissions.

#### 1. Imports
```typescript
import { Construct } from "constructs";
import { TerraformStack, TerraformOutput } from "cdktf";

import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { AppsyncGraphqlApi } from "@cdktf/provider-aws/lib/appsync-graphql-api";
import { LambdaFunction } from "@cdktf/provider-aws/lib/lambda-function";
import { AppsyncDatasource } from "@cdktf/provider-aws/lib/appsync-datasource";
import { AppsyncResolver } from "@cdktf/provider-aws/lib/appsync-resolver";
import { AppsyncApiKey } from "@cdktf/provider-aws/lib/appsync-api-key";
import { IamPolicyAttachment } from "@cdktf/provider-aws/lib/iam-policy-attachment";

import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
import { IamPolicy } from "@cdktf/provider-aws/lib/iam-policy";

import { DynamodbTable } from "@cdktf/provider-aws/lib/dynamodb-table";
import { LambdaPermission } from "@cdktf/provider-aws/lib/lambda-permission";
import { LambdaLayerVersion } from "@cdktf/provider-aws/lib/lambda-layer-version";
import { IamRolePolicyAttachment } from "@cdktf/provider-aws/lib/iam-role-policy-attachment";

import * as fs from "fs";
import * as path from "path";

```
- The code imports necessary modules and classes from the CDKTF library and AWS providers to define infrastructure components.
- The fs and path modules are used for file system operations and path resolution, respectively.


### 2. Defining the Stack
```typescript
export class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

```
- A new class MyStack extends TerraformStack, allowing you to define a new stack of resources.
- The constructor accepts scope and id, calling the parent class constructor with these values.

### 3. AWS Provider Configuration
```typescript
    new AwsProvider(this, "AWS", {
      region: "us-east-1",
    });

```
Configures the AWS provider to use the us-east-1 region.


### 4. DynamoDB Table Creation
```typescript
    const todosTable = new DynamodbTable(this, "CDKTodosTable", {
      name: "TodoTable",
      billingMode: "PAY_PER_REQUEST",
      hashKey: "id",
      attribute: [
        {
          name: "id",
          type: "S",
        },
      ],
    });

```
Creates a DynamoDB table named ``TodoTable`` with a hash key id of type string ``(S)`` and sets the billing mode to ``PAY_PER_REQUEST``.


### 5. AppSync GraphQL API Creation

```typescript
    const schemaPath = path.resolve(__dirname, "../graphql-api/schema.graphql");
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");
    console.log("schemaContent ==> ", schemaContent);

    const api = new AppsyncGraphqlApi(this, "GRAPHQL_API", {
      name: "cdktf-api",
      authenticationType: "API_KEY",
      schema: schemaContent, // Pass the loaded schema
      xrayEnabled: true,
    });

```
- Loads the GraphQL schema from a file and creates an AppSync GraphQL API named ``cdktf-api``.
- The authentication type is set to ``API_KEY``, and AWS X-Ray tracing is enabled.


### 6. AppSync API Key

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
Creates an API key for the AppSync API with a one-year expiration.


### 7. Lambda Role and Permissions

```typescript
    const lambdaRole = new IamRole(this, "LambdaExecutionRole", {
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Action: "sts:AssumeRole",
            Principal: {
              Service: "lambda.amazonaws.com",
            },
            Effect: "Allow",
          },
        ],
      }),
    });

    const lambdaPolicy = new IamPolicy(this, "LambdaPolicy", {
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Action: [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents",
            ],
            Resource: "*",
            Effect: "Allow",
          },
        ],
      }),
    });

    new IamPolicyAttachment(this, "LambdaPolicyAttachment", {
      name: "LambdaPolicyAttachment",
      policyArn: lambdaPolicy.arn,
      roles: [lambdaRole.name],
    });

```

- Creates an IAM role for the Lambda function with a policy allowing it to be assumed by the Lambda service.
- Defines a policy that allows the Lambda function to write logs and attaches it to the Lambda role.


### 8. Lambda Functions Creation
```typescript
    const myLayer = new LambdaLayerVersion(this, "MyLambdaLayer", {
      layerName: "my-lambda-layer",
      compatibleRuntimes: ["nodejs18.x"],
      filename: path.resolve(__dirname, "../Lambda/my-layers.zip"),
      description: "A shared Lambda layer with dependencies",
    });

    const lambdaFunction = new LambdaFunction(this, "LambdaFunction", {
      functionName: "lambda-function",
      role: lambdaRole.arn,
      handler: "main/main.handler",
      runtime: "nodejs18.x",
      memorySize: 1024,
      timeout: 60,
      filename: path.resolve(__dirname, "../Lambda/lambda.zip"),
      environment: {
        variables: {
          TODOS_TABLE: todosTable.name,
        },
      },
      layers: [myLayer.arn],
    });

```
- Creates a Lambda layer for shared dependencies.
- Defines the Lambda function with specified properties such as function name, role, handler, runtime, memory size, and environment variables.

### 9. AppSync Role and Permissions
```typescript
    const appsyncRole = new IamRole(this, "AppSyncInvokeLambdaRole", {
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Action: "sts:AssumeRole",
            Principal: {
              Service: "appsync.amazonaws.com",
            },
            Effect: "Allow",
          },
        ],
      }),
    });

    const appsyncPolicy = new IamPolicy(this, "AppSyncInvokeLambdaPolicy", {
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Action: "lambda:InvokeFunction",
            Resource: lambdaFunction.arn,
            Effect: "Allow",
          },
        ],
      }),
    });

    new IamPolicyAttachment(this, "AppSyncPolicyAttachment", {
      name: "AppSyncPolicyAttachment",
      policyArn: appsyncPolicy.arn,
      roles: [appsyncRole.name],
    });

```

- Creates an IAM role for AppSync that allows it to invoke the Lambda function.
- Defines a policy that grants permission to invoke the Lambda function and attaches it to the AppSync role.


### 10. Setting Up the AppSync Data Source
```typescript
    const lambdaDatasource = new AppsyncDatasource(this, "LambdaDatasource", {
      apiId: api.id,
      name: "LambdaDatasource",
      type: "AWS_LAMBDA",
      lambdaConfig: {
        functionArn: lambdaFunction.arn,
      },
      serviceRoleArn: appsyncRole.arn,
    });

```
Configures the Lambda function as a data source for the AppSync API.

### 11. AppSync Resolvers Creation

```typescript
    new AppsyncResolver(this, "getTodosResolver", {
      apiId: api.id,
      type: "Query",
      field: "getTodos",
      dataSource: lambdaDatasource.name,
    });

    new AppsyncResolver(this, "addTodoResolver", {
      apiId: api.id,
      type: "Mutation",
      field: "addTodo",
      dataSource: lambdaDatasource.name,
    });

    new AppsyncResolver(this, "deleteTodoResolver", {
      apiId: api.id,
      type: "Mutation",
      field: "deleteTodo",
      dataSource: lambdaDatasource.name,
    });

    new AppsyncResolver(this, "updateTodoResolver", {
      apiId: api.id,
      type: "Mutation",
      field: "updateTodo",
      dataSource: lambdaDatasource.name,
    });

```

Creates resolvers for different GraphQL operations (``getTodos``, ``addTodo``, `deleteTodo`, and ``updateTodo``) and links them to the Lambda data source.


### 12. Granting Lambda Permissions



```typescript
    new LambdaPermission(this, "DynamoDBAccess", {
      functionName: lambdaFunction.functionName,
      principal: "dynamodb.amazonaws.com",
      sourceArn: todosTable.arn,
    });

```
Grants the Lambda function permission to access the DynamoDB table.

### 13. Outputs
```typescript
    new TerraformOutput(this, "graphqlEndpoint", {
      value: api.uris["GRAPHQL"],
    });

    new TerraformOutput(this, "APIKey", {
      value: apiKey.id,
    });

```
Outputs the GraphQL endpoint and API key after the stack is deployed.



# Summary:

- The code sets up a serverless application on AWS with a GraphQL API using AppSync, backed by a Lambda function for processing requests and a DynamoDB table for data storage.
- It includes IAM roles and permissions necessary for secure operation, ensuring that the various components can communicate with each other.
- The use of outputs provides easy access to important information like the GraphQL endpoint and API key after deployment.