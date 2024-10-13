import { Construct } from "constructs";
import { TerraformStack, TerraformOutput } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { AppsyncGraphqlApi } from "@cdktf/provider-aws/lib/appsync-graphql-api";

import { AppsyncDatasource } from "@cdktf/provider-aws/lib/appsync-datasource";
import { AppsyncResolver } from "@cdktf/provider-aws/lib/appsync-resolver";
import { AppsyncApiKey } from "@cdktf/provider-aws/lib/appsync-api-key";

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

    // Define a None Data Source
    const noneDataSource = new AppsyncDatasource(this, "NoneDataSource", {
      apiId: api.id,
      name: "NoneDataSource",
      type: "NONE",
    });

    // ===========================AppsyncResolver - START===========================
    // ===========================AppsyncResolver - START===========================

    // AppSync Resolvers
    // In none data source their is no need to add "Operation" 
    new AppsyncResolver(this, "getTodosResolver", {
      apiId: api.id,
      type: "Query",
      field: "readStatus",
      dataSource: noneDataSource.name, // Use None data source
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

    new AppsyncResolver(this, "addTodoResolver", {
      apiId: api.id,
      type: "Mutation",
      field: "changeStatus",
      dataSource: noneDataSource.name, // Use None data source
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
