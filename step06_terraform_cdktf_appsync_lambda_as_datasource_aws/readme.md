Let's break down the provided Terraform CDK code step by step. This code defines an AWS infrastructure stack using the CDK for Terraform (CDKTF) to set up an AWS AppSync API integrated with a Lambda function.

## Overview
The stack consists of:

1.  **AWS Provider**: Configures AWS as the cloud provider.
2. **AppSync API**: Defines a GraphQL API.
3. **Lambda Function**: A serverless function that acts as a data source for the API.
4. **IAM Roles and Policies**: Permissions for the Lambda function and AppSync to invoke each other.
5. **AppSync Data Source**: Connects the Lambda function to the AppSync API.
6. **AppSync Resolvers**: Links GraphQL queries and mutations to the Lambda function.



### Breakdown of Code

1. **Imports**


```typescript
import { Construct } from "constructs";
import { TerraformStack, TerraformOutput } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { AppsyncGraphqlApi } from '@cdktf/provider-aws/lib/appsync-graphql-api';
import { LambdaFunction } from '@cdktf/provider-aws/lib/lambda-function';
import { AppsyncDatasource } from '@cdktf/provider-aws/lib/appsync-datasource';
import { AppsyncResolver } from '@cdktf/provider-aws/lib/appsync-resolver';
import { AppsyncApiKey } from '@cdktf/provider-aws/lib/appsync-api-key';
import { IamPolicyAttachment } from '@cdktf/provider-aws/lib/iam-policy-attachment';
import { IamRole } from '@cdktf/provider-aws/lib/iam-role';
import { IamPolicy } from '@cdktf/provider-aws/lib/iam-policy';
import * as fs from 'fs';
import * as path from 'path';

```
This section imports necessary modules from the CDKTF libraries for AWS services and other utilities.


2. **Define the Stack Class**

```typescript
export class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

```


3. **AWS Provider Configuration**

```typescript
new AwsProvider(this, 'AWS', {
  region: 'us-east-1',
});

```

Initializes the AWS provider, specifying the region (``us-east-1``).



4. **GraphQL API**
 - **Load Schema**:

```typescript
const schemaPath = path.resolve(__dirname, '../graphql/schema.gql');
const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

```
``graphql/schema.gql``

```gql
type Query { 
  products: [String]
  customProduct(title: String!): String!
}

input ProductInput {
  name: String
  price: Int
}

type Product {
  name: String
  price: Int
}

type Mutation {
  addProduct(product: ProductInput): Product
}

```

 Loads the GraphQL schema from a file.


- **Create AppSync API**:


```typescript
const api = new AppsyncGraphqlApi(this, 'GRAPHQL_API', {
  name: 'cdktf-api',
  authenticationType: 'API_KEY',
  schema: schemaContent,
  xrayEnabled: true,
});

```
 Creates an AppSync API with API key authentication, enabling AWS X-Ray for monitoring.


- **Define API Key**:

```typescript
const apiKey = new AppsyncApiKey(this, 'AppSyncApiKey', {
  apiId: api.id,
  expires: expirationIsoString,
});

```
 Creates an API key for the AppSync API, set to expire in one year.


5. **Outputs**


```typescript
new TerraformOutput(this, 'APIGraphQlURL', {
  value: api.uris,
});

new TerraformOutput(this, 'GraphQLAPIKey', {
  value: apiKey.id,
});

```
Outputs the URL of the GraphQL API and the API key.

6. **Lambda Role and Permissions**
- IAM Role for Lambda:


```typescript
const lambdaRole = new IamRole(this, 'LambdaExecutionRole', {
  assumeRolePolicy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'sts:AssumeRole',
        Principal: {
          Service: 'lambda.amazonaws.com',
        },
        Effect: 'Allow',
      },
    ],
  }),
});

```

Creates an IAM role for the Lambda function


- **IAM Policy for Lambda**:
```typescript
const lambdaPolicy = new IamPolicy(this, 'LambdaPolicy', {
  policy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        Resource: '*',
        Effect: 'Allow',
      },
    ],
  }),
});

```
Defines a policy allowing the Lambda function to create logs.




- **Attach Policy to Role**


```typescript
new IamPolicyAttachment(this, 'LambdaPolicyAttachment', {
  name: 'LambdaPolicyAttachment',
  policyArn: lambdaPolicy.arn,
  roles: [lambdaRole.name],
});

```
Attaches the IAM policy to the Lambda role.

7. **Lambda Function**

```typescript
const lambdaFunction = new LambdaFunction(this, 'LambdaFunction', {
  functionName: 'lambda-function',
  role: lambdaRole.arn,
  handler: 'index.handler',
  runtime: 'nodejs18.x',
  memorySize: 128,
  filename: path.resolve(__dirname, '../Lambda/index.zip'),
  sourceCodeHash: fs.readFileSync(path.resolve(__dirname, '../Lambda/index.zip')).toString('base64'),
  timeout: 10,
});

```

``lambda/index.zip``

Creates the Lambda function, specifying its handler, runtime, memory size, and source code location.

8. **AppSync Role and Permissions**
- **IAM Role for AppSync**:

```typescript
const appsyncRole = new IamRole(this, 'AppSyncInvokeLambdaRole', {
  assumeRolePolicy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'sts:AssumeRole',
        Principal: {
          Service: 'appsync.amazonaws.com',
        },
        Effect: 'Allow',
      },
    ],
  }),
});

```
Creates a role that allows AppSync to invoke the Lambda function.


- **Policy for AppSync**:

```typescript
const appsyncPolicy = new IamPolicy(this, 'AppSyncInvokeLambdaPolicy', {
  policy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'lambda:InvokeFunction',
        Resource: lambdaFunction.arn,
        Effect: 'Allow',
      },
    ],
  }),
});

```
Defines a policy allowing AppSync to invoke the Lambda function.


- **Attach Policy**:

```typescript
new IamPolicyAttachment(this, 'AppSyncPolicyAttachment', {
  name: 'AppSyncPolicyAttachment',
  policyArn: appsyncPolicy.arn,
  roles: [appsyncRole.name],
});

```
Attaches the AppSync policy to the AppSync role.


9. **AppSync Data Source**:

```typescript
const lambdaDatasource = new AppsyncDatasource(this, 'LambdaDatasource', {
  apiId: api.id,
  name: 'LambdaDatasource',
  type: 'AWS_LAMBDA',
  lambdaConfig: {
    functionArn: lambdaFunction.arn,
  },
  serviceRoleArn: appsyncRole.arn,
});

```

Creates a data source in AppSync that points to the Lambda function.




10. **Resolvers**


```typescript
new AppsyncResolver(this, 'QueryResolver1', {
  apiId: api.id,
  type: 'Query',
  field: 'products',
  dataSource: lambdaDatasource.name,
});

new AppsyncResolver(this, 'QueryResolver2', {
  apiId: api.id,
  type: 'Query',
  field: 'customProduct',
  dataSource: lambdaDatasource.name,
});

new AppsyncResolver(this, 'MutationResolver', {
  apiId: api.id,
  type: 'Mutation',
  field: 'addProduct',
  dataSource: lambdaDatasource.name,
});

```
Defines resolvers for the queries and mutations that link the API to the Lambda function.



### Summary

This CDKTF code sets up a basic serverless architecture using AWS services. It establishes an AppSync API with a Lambda function as the data source, including IAM roles and permissions for secure communication between services. The use of outputs allows for easy access to the API URL and key after deployment.







**Commands**


```bash
# Compile TypeScript code to JavaScript
npm run build

# Synthesize the Terraform configuration
cdktf synth

# Plan the deployment to preview changes
cdktf plan

# Deploy the stack to AWS
cdktf deploy

# Destroy the stack and remove all resources
cdktf destroy


```








