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

// Define a custom stack class extending TerraformStack
export class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // AWS provider
    new AwsProvider(this, "AWS", {
      region: "us-east-1",
    });

    // ============================DynamoDB Table - Start============================
    // ===========================DynamoDB Table - Start============================

    // DynamoDB Table
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

    // ===========================DynamoDB Table - End============================
    // ===========================DynamoDB Table - End============================

    // ========================Graphql API - START====================
    // ========================Graphql API - START====================

    // Load the schema from the graphql/schema.gql file
    const schemaPath = path.resolve(__dirname, "../graphql-api/schema.graphql");
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");
    console.log("schemaContent ==> ", schemaContent);

    // AppSync API
    const api = new AppsyncGraphqlApi(this, "GRAPHQL_API", {
      name: "cdktf-api",
      authenticationType: "API_KEY",
      schema: schemaContent, // Pass the loaded schema
      xrayEnabled: true,
    });

    const currentDate = new Date(); // Add 365 days for one year expiration
    const expirationDate = new Date(currentDate);
    expirationDate.setDate(currentDate.getDate() + 365); // Set 1 year later
    const expirationIsoString = expirationDate.toISOString(); // Convert to ISO 8601 string format

    // Define the AppSync API Key
    const apiKey = new AppsyncApiKey(this, "AppSyncApiKey", {
      apiId: api.id,
      expires: expirationIsoString, // Set expiration to 365 days from now
    });

    // ========================Graphql API - END====================
    // ========================Graphql API - END====================

    // ======================Lambda Role and Permissions - START=================
    // ======================Lambda Role and Permissions - START=================

    // IAM Role for Lambda
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

    // IAM Policy for Lambda
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

    // Attach the policy to the Lambda role
    new IamPolicyAttachment(this, "LambdaPolicyAttachment", {
      name: "LambdaPolicyAttachment", // Add a unique name for the attachment
      policyArn: lambdaPolicy.arn,
      roles: [lambdaRole.name],
    });

    // ======================Lambda Role and Permissions - END=================
    // ======================Lambda Role and Permissions - END=================

    // =======================Lambda Functions - START=======================
    // =======================Lambda Functions - START=======================

    // Create the Lambda layer version
    const myLayer = new LambdaLayerVersion(this, "MyLambdaLayer", {
      layerName: "my-lambda-layer",
      compatibleRuntimes: ["nodejs18.x"], // Specify compatible runtimes
      filename: path.resolve(__dirname, "../Lambda/my-layers.zip"), // Path to your zipped layer code
      description: "A shared Lambda layer with dependencies",
    });

    // Lambda Function
    const lambdaFunction = new LambdaFunction(this, "LambdaFunction", {
      functionName: "lambda-function",
      role: lambdaRole.arn,
      handler: "main/main.handler",
      runtime: "nodejs18.x",
      memorySize: 1024,
      timeout: 60,
      // Point to the folder containing the transpiled JavaScript files
      filename: path.resolve(__dirname, "../Lambda/lambda.zip"), // // Adjust this path to point to your Lambda ZIP file.

      environment: {
        variables: {
          TODOS_TABLE: todosTable.name,
        },
      },
      layers: [myLayer.arn], // Attach Lambda Layer here
    });

    // ===========================Lambda Functions - END==========================
    // ===========================Lambda Functions - END==========================

    // ======================Appsync Role and Permissions - START=================
    // ======================Appsync Role and Permissions - START=================

    // you create an AWS AppSync data source of type AWS_LAMBDA, you need to ensure that the Lambda function has permission to be invoked by AppSync.

    // IAM Role for AppSync to invoke Lambda
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

    // IAM Policy to allow AppSync to invoke the Lambda function
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

    // Attach the policy to the AppSync role
    new IamPolicyAttachment(this, "AppSyncPolicyAttachment", {
      name: "AppSyncPolicyAttachment",
      policyArn: appsyncPolicy.arn,
      roles: [appsyncRole.name],
    });

    // ======================Appsync Role and Permissions - END=================
    // ======================Appsync Role and Permissions - END=================

    // Set Lambda as a DataSource for AppSync
    const lambdaDatasource = new AppsyncDatasource(this, "LambdaDatasource", {
      apiId: api.id,
      name: "LambdaDatasource",
      type: "AWS_LAMBDA",
      lambdaConfig: {
        functionArn: lambdaFunction.arn,
      },
      serviceRoleArn: appsyncRole.arn, // assign lambda data source to invoke appsync service
    });

    // ===========================AppsyncResolver - START===========================
    // ===========================AppsyncResolver - START===========================

    // AppSync Resolvers
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

    // ===========================AppsyncResolver - END===========================
    // ===========================AppsyncResolver - END===========================


    // ==================Grant Permission Lambda to Access DynamoDB - START================
    // ==================Grant Permission Lambda to Access DynamoDB - START================

    // Grant full access to DynamoDB table for the Lambda function
    new LambdaPermission(this, "DynamoDBAccess", {
      functionName: lambdaFunction.functionName,
      principal: "dynamodb.amazonaws.com",
      sourceArn: todosTable.arn,
      action: "lambda:InvokeFunction",
    });

    // Grant AppSync permission to invoke the Lambda function
    new LambdaPermission(this, "AppSyncInvokePermission", {
      functionName: lambdaFunction.functionName,
      principal: "appsync.amazonaws.com",
      sourceArn: api.arn, // Allow only the specific AppSync API to invoke
      action: "lambda:InvokeFunction",
    });

    // Create an IAM policy to allow all actions on the DynamoDB table
    const lambdaDynamoDBPolicy = new IamPolicy(this, "LambdaDynamoDBPolicy", {
      name: "LambdaDynamoDBFullAccess",
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "dynamodb:*",
            Resource: todosTable.arn,
          },
        ],
      }),
    });

    // Attach the policy to the role
    new IamRolePolicyAttachment(this, "LambdaDynamoDBPolicyAttachment", {
      role: lambdaRole.name,
      policyArn: lambdaDynamoDBPolicy.arn,
    });



    // ==================Grant Permission Lambda to Access DynamoDB - END================
    // ==================Grant Permission Lambda to Access DynamoDB - END================


    // ==========================Output - START=========================
    // ==========================Output - START=========================

    // Output the GraphQL API URL and API Key
    new TerraformOutput(this, "APIGraphQlURL", {
      value: api.uris,
    });

    new TerraformOutput(this, "GraphQLAPIKey", {
      value: apiKey.id,
    });

    // ==========================Output - END=========================
    // ==========================Output - END=========================
  }
}
