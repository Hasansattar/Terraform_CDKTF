import { Construct } from "constructs";
import { TerraformStack,TerraformOutput } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { AppsyncGraphqlApi  } from '@cdktf/provider-aws/lib/appsync-graphql-api';
import {  LambdaFunction } from '@cdktf/provider-aws/lib/lambda-function';
import {  AppsyncDatasource } from '@cdktf/provider-aws/lib/appsync-datasource';
import {  AppsyncResolver} from '@cdktf/provider-aws/lib/appsync-resolver';
import { AppsyncApiKey } from '@cdktf/provider-aws/lib/appsync-api-key';
import { IamPolicyAttachment } from '@cdktf/provider-aws/lib/iam-policy-attachment';

import { IamRole } from '@cdktf/provider-aws/lib/iam-role';
import {  IamPolicy } from '@cdktf/provider-aws/lib/iam-policy';

import * as fs from 'fs';
import * as path from 'path';




// Define a custom stack class extending TerraformStack
export class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    
 // AWS provider
new AwsProvider(this, 'AWS', {
  region: 'us-east-1',
});


// ========================Graphql API - START====================
// ========================Graphql API - START====================


   // Load the schema from the graphql/schema.gql file
    const schemaPath = path.resolve(__dirname, '../graphql/schema.gql');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    console.log("schemaContent ==> ",schemaContent)

// AppSync API
const api = new AppsyncGraphqlApi(this, 'GRAPHQL_API', {
  name: 'cdktf-api',
  authenticationType: 'API_KEY',
  schema: schemaContent,  // Pass the loaded schema
  xrayEnabled: true,
});


const currentDate = new Date(); // Add 365 days for one year expiration
const expirationDate = new Date(currentDate);
expirationDate.setDate(currentDate.getDate() + 365); // Set 1 year later
const expirationIsoString = expirationDate.toISOString();// Convert to ISO 8601 string format

// Define the AppSync API Key
const apiKey = new AppsyncApiKey(this, 'AppSyncApiKey', {
  apiId: api.id,
  expires: expirationIsoString // Set expiration to 365 days from now
});

// ========================Graphql API - END====================
// ========================Graphql API - END====================

// ==========================Output - START=========================
// ==========================Output - START=========================

// Output the GraphQL API URL and API Key
new TerraformOutput(this, 'APIGraphQlURL', {
  value: api.uris,
});

new TerraformOutput(this, 'GraphQLAPIKey', {
  value: apiKey.id,
});


// ==========================Output - END=========================
// ==========================Output - END=========================



// ======================Lambda Role and Permissions - START=================
// ======================Lambda Role and Permissions - START=================


// IAM Role for Lambda
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

// IAM Policy for Lambda
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

// Attach the policy to the Lambda role
new IamPolicyAttachment(this, 'LambdaPolicyAttachment', {
  name: 'LambdaPolicyAttachment',  // Add a unique name for the attachment
  policyArn: lambdaPolicy.arn,
  roles: [lambdaRole.name],
});

// ======================Lambda Role and Permissions - END=================
// ======================Lambda Role and Permissions - END=================




// =======================Lambda Functions - START=======================
// =======================Lambda Functions - START=======================



// Lambda Function
const lambdaFunction = new LambdaFunction(this, 'LambdaFunction', {
  functionName: 'lambda-function',
  role: lambdaRole.arn,
  handler: 'index.handler',
  runtime: 'nodejs18.x',
  memorySize: 128,
  // Point to the folder containing the transpiled JavaScript files
   filename: path.resolve(__dirname, '../Lambda/index.zip'), // Update the path to point outside stacks
   sourceCodeHash: fs.readFileSync(path.resolve(__dirname, '../Lambda/index.zip')).toString('base64'),
  timeout: 10
});


// ===========================Lambda Functions - END==========================
// ===========================Lambda Functions - END==========================



// ======================Appsync Role and Permissions - START=================
// ======================Appsync Role and Permissions - START=================
// you create an AWS AppSync data source of type AWS_LAMBDA, you need to ensure that the Lambda function has permission to be invoked by AppSync.



// IAM Role for AppSync to invoke Lambda
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

// IAM Policy to allow AppSync to invoke the Lambda function
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

// Attach the policy to the AppSync role
new IamPolicyAttachment(this, 'AppSyncPolicyAttachment', {
  name: 'AppSyncPolicyAttachment',
  policyArn: appsyncPolicy.arn,
  roles: [appsyncRole.name],
})


// ======================Appsync Role and Permissions - END=================
// ======================Appsync Role and Permissions - END=================



// Set Lambda as a DataSource for AppSync
const lambdaDatasource = new AppsyncDatasource(this, 'LambdaDatasource', {
  apiId: api.id,
  name: 'LambdaDatasource',
  type: 'AWS_LAMBDA',
  lambdaConfig: {
    functionArn: lambdaFunction.arn,
  },
  serviceRoleArn: appsyncRole.arn,   // assign lambda data source to invoke appsync service
});



// ===========================AppsyncResolver - START===========================
// ===========================AppsyncResolver - START===========================


// Create Resolvers
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


// ===========================AppsyncResolver - END===========================
// ===========================AppsyncResolver - END===========================


}
}