import { Construct } from "constructs";
import { TerraformStack, TerraformOutput } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { AppsyncGraphqlApi } from "@cdktf/provider-aws/lib/appsync-graphql-api";

import { AppsyncDatasource } from "@cdktf/provider-aws/lib/appsync-datasource";
import { AppsyncResolver } from "@cdktf/provider-aws/lib/appsync-resolver";
import { AppsyncApiKey } from "@cdktf/provider-aws/lib/appsync-api-key";

import { DynamodbTable } from "@cdktf/provider-aws/lib/dynamodb-table";

import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
import { IamPolicy } from "@cdktf/provider-aws/lib/iam-policy";
import { IamPolicyAttachment } from "@cdktf/provider-aws/lib/iam-policy-attachment";

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
    const dynamoDBTable = new DynamodbTable(this, "CDKTodosTable", {
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

    // ======================Appsync Role and Permissions - START=================
    // ======================Appsync Role and Permissions - START=================

    // you create an AWS AppSync data source of type AWS_LAMBDA, you need to ensure that the Lambda function has permission to be invoked by AppSync.

    // IAM Role for AppSync to access DynamoDB
    const appsyncRole = new IamRole(this, "AppSyncInvokeDynamoDBRole", {
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

    // IAM Policy to allow AppSync to invoke DynamoDB actions
    const dynamoDBPolicy = new IamPolicy(this, "DynamoDBPolicy", {
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Resource: dynamoDBTable.arn,
            Action: [
              "dynamodb:Query",
              "dynamodb:Scan",
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:DeleteItem",
              "dynamodb:UpdateItem",
            ],
          },
        ],
      }),
    });

    // Attach the policy to the AppSync role
    new IamPolicyAttachment(this, "AppSyncPolicyAttachment", {
      name: "AppSyncPolicyAttachment",
      policyArn: dynamoDBPolicy.arn,
      roles: [appsyncRole.name],
    });

    // ======================Appsync Role and Permissions - END=================
    // ======================Appsync Role and Permissions - END=================

    // DataSource for AppSync API - linking DynamoDB
    const dbDataSource = new AppsyncDatasource(this, "DynamoDBDataSource", {
      apiId: api.id,
      name: "DynamoDBDataSource",
      type: "AMAZON_DYNAMODB",
      dynamodbConfig: {
        tableName: dynamoDBTable.name, // DataSource for AppSync API - linking DynamoDB
        region: "us-east-1", // specify your AWS region
      },
      serviceRoleArn: appsyncRole.arn, // Assign the role to AppSync
    });

    // ===========================AppsyncResolver - START===========================
    // ===========================AppsyncResolver - START===========================

    // AppSync Resolvers
    new AppsyncResolver(this, "getTodosResolver", {
      apiId: api.id,
      type: "Query",
      field: "getTodos",
      dataSource: dbDataSource.name,
      requestTemplate: `
        {
          "version" : "2018-05-29",
          "operation" : "Scan"
        }
      `,
      responseTemplate: "$util.toJson($ctx.result.items)",
    });

    new AppsyncResolver(this, "addTodoResolver", {
      apiId: api.id,
      type: "Mutation",
      field: "addTodo",
      dataSource: dbDataSource.name,
      requestTemplate: `
        {
          "version" : "2018-05-29",
          "operation" : "PutItem",
          "key" : {
            "id": $util.dynamodb.toDynamoDBJson($ctx.args.todo.id),
          },
          "attributeValues" : $util.dynamodb.toMapValuesJson($ctx.args.todo)
        }
      `,
      responseTemplate: "$util.toJson($ctx.result)",
    });

    new AppsyncResolver(this, "deleteTodoResolver", {
      apiId: api.id,
      type: "Mutation",
      field: "deleteTodo",
      dataSource: dbDataSource.name,
      requestTemplate: `
       {
      "version": "2017-02-28",
      "operation": "DeleteItem",
      "key": {
        "id": $util.dynamodb.toDynamoDBJson($context.arguments.todoId)
      }
    }
      `,
      responseTemplate: "$util.toJson($ctx.result)",
    });

    new AppsyncResolver(this, "updateTodoResolver", {
      apiId: api.id,
      type: "Mutation",
      field: "updateTodo",
      dataSource: dbDataSource.name,
      requestTemplate: `
        {
      "version": "2017-02-28",
      "operation": "UpdateItem",
      "key": {
        "id": $util.dynamodb.toDynamoDBJson($context.arguments.todo.id)
      },
      "update": {
        "expression": "set title = :title, done = :done",
        "expressionValues": {
          ":title": $util.dynamodb.toDynamoDBJson($context.arguments.todo.title),
          ":done": $util.dynamodb.toDynamoDBJson($context.arguments.todo.done)
        }
      }
    }
      `,
      responseTemplate: "$util.toJson($ctx.result)",
    });

    // ===========================AppsyncResolver - END===========================
    // ===========================AppsyncResolver - END===========================

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
