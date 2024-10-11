import { Construct } from "constructs";
import { TerraformStack, TerraformOutput } from "cdktf";
import { AzurermProvider } from "@cdktf/provider-azurerm/lib/provider";
import { ResourceGroup } from "@cdktf/provider-azurerm/lib/resource-group";
import { WindowsFunctionApp } from "@cdktf/provider-azurerm/lib/windows-function-app";
import { ApplicationInsights } from "@cdktf/provider-azurerm/lib/application-insights"; // Import Application Insights
import { ServicePlan } from "@cdktf/provider-azurerm/lib/service-plan";
import { StorageAccount } from "@cdktf/provider-azurerm/lib/storage-account";

import { ApiManagement } from "@cdktf/provider-azurerm/lib/api-management";
import { ApiManagementApi } from "@cdktf/provider-azurerm/lib/api-management-api";
import { ApiManagementApiSchema } from "@cdktf/provider-azurerm/lib/api-management-api-schema";

import { CosmosdbAccount } from "@cdktf/provider-azurerm/lib/cosmosdb-account";
import { CosmosdbSqlDatabase } from "@cdktf/provider-azurerm/lib/cosmosdb-sql-database";
import { CosmosdbSqlContainer } from "@cdktf/provider-azurerm/lib/cosmosdb-sql-container";

import * as fs from "fs";
import * as dotenv from "dotenv"; // Import dotenv package
import * as path from "path";

// Load environment variables from the .env file
const environmentVariable = dotenv.config();
console.log("environmentVariable===>", environmentVariable);

// Define a custom stack class extending TerraformStack
export class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // ===========================ENVIRNMENT VARIABLE - START=======================================
    //============================ENVIRNMENT VARIABLE - START=======================================

    // Azure provider with region (location)
    new AzurermProvider(this, "AzureRM", {
      features: [{}],
      subscriptionId:
        environmentVariable.parsed?.ARM_SUBSCRIPTION_ID ||
        "your-subscription-id",
      clientId: environmentVariable.parsed?.ARM_CLIENT_ID || "your-client-id",
      clientSecret:
        environmentVariable.parsed?.ARM_CLIENT_SECRET || "your-client-secret",
      tenantId: environmentVariable.parsed?.ARM_TENANT_ID || "your-tenant-id",
    });

    // =============================ENVIRNMENT VARIABLE - END=====================================
    //==============================ENVIRNMENT VARIABLE - END=====================================

    // Create a resource group
    const resourceGroup = new ResourceGroup(this, "MyAPIResourceGroup", {
      name: "hasan123-api-resource-group",
      location: "Australia East", // Use the same location as your other resources
    });

    //   // Create a Cosmos DB Account
    const cosmosAccount = new CosmosdbAccount(this, "cosmosAccount", {
      name: "cdktf-cosmosdb",
      resourceGroupName: resourceGroup.name,
      location: resourceGroup.location,
      offerType: "Standard",
      kind: "GlobalDocumentDB",
      automaticFailoverEnabled: true,
      geoLocation: [
        {
          location: "Australia East",
          failoverPriority: 0, // Set to 0 for single location // If you want to keep only one geo-location: You can set the failoverPriority to 0
        },
      ],
      consistencyPolicy: {
        consistencyLevel: "Session",
      },
    });

    // Create a SQL Database inside Cosmos DB
    const cosmosDatabase = new CosmosdbSqlDatabase(this, "cosmosDatabase", {
      name: "TodoDatabase",
      resourceGroupName: resourceGroup.name,
      accountName: cosmosAccount.name,
    });

    // Create a Container in the Cosmos DB SQL Database
    const cosmosConatiner = new CosmosdbSqlContainer(this, "cosmosContainer", {
      name: "Todos",
      resourceGroupName: resourceGroup.name,
      accountName: cosmosAccount.name,
      databaseName: cosmosDatabase.name,
      partitionKeyPaths: ["/id"], // Set the partition key for data
    });

    // Create a Storage Account
    const storageAccount = new StorageAccount(this, "my-storage-account", {
      name: `storageaccounthasan123`, // Ensure this is globally unique
      resourceGroupName: resourceGroup.name,
      location: resourceGroup.location,
      accountTier: "Standard",
      accountReplicationType: "LRS",
    });

    // Create an App Service Plan
    const appServicePlan = new ServicePlan(this, "my-app-service-plan", {
      name: "hasan123-my-app-service-plann",
      location: resourceGroup.location,
      resourceGroupName: resourceGroup.name,
      skuName: "B1", // Choose a valid SKU
      osType: "Windows", // Set the OS type to Windows
    });

    // =============================SERVERLESS FUNCTION -START=====================================
    //==============================SERVERLESS FUNCTION -START=====================================

    // Create Application Insights
    const appInsights = new ApplicationInsights(this, "my-app-insights", {
      name: "my-app-insights-hasan1234",
      location: resourceGroup.location,
      resourceGroupName: resourceGroup.name,
      applicationType: "web", // Use 'web' for function appServicePlan
    });

    // Create a Function App
    const functionApp = new WindowsFunctionApp(this, "my-function-app", {
      name: "my-function-app-hasan123",
      location: resourceGroup.location,
      resourceGroupName: resourceGroup.name,
      servicePlanId: appServicePlan.id,
      storageAccountName: storageAccount.name, // Ensure this is globally unique
      storageAccountAccessKey: storageAccount.primaryAccessKey, // You'll need to retrieve this
      httpsOnly: true,

      siteConfig: {
        // Add siteConfig property
        alwaysOn: true, // You can set this to true or false as needed
        ftpsState: "AllAllowed", // Users can connect to the Function App using either unsecured FTP or secured FTPS. other option is "FTPSOnly" and "Disabled"
        applicationStack: {
          nodeVersion: "~18",
        }, //  Stack settings typically involve configuring the runtime, language version, and other related settings
        cors: {
          allowedOrigins: ["*"],
          //allowedOrigins: ["https://portal.azure.com"], // Allow requests from Azure Portal
        },
        // Enable remote debugging
        remoteDebuggingEnabled: true, // Enable remote debugging
        remoteDebuggingVersion: "VS2022", // Specify Visual Studio version (VS2019, VS2022)
      },

      appSettings: {
        FUNCTIONS_WORKER_RUNTIME: "node", // This tells Azure which language runtime to use (node for Node.js).
        WEBSITE_NODE_DEFAULT_VERSION: "18", // Specifies the version of Node.js to use. You might need to adjust the version if you’re using a specific version.
        APPINSIGHTS_INSTRUMENTATIONKEY: appInsights.instrumentationKey, // Enables Application Insights for logging and monitoring.
        AzureWebJobsStorage: `DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.primaryAccessKey};EndpointSuffix=core.windows.net`,
        SCM_DO_BUILD_DURING_DEPLOYMENT: "true", // Enable build during deployment
        WEBSITE_CORS_ALLOWED_ORIGINS: "*", // WEBSITE_CORS_ALLOWED_ORIGINS: "*", // Adjust as necessary
        WEBSITE_RUN_FROM_PACKAGE: "1", // This setting ensures that the Function App runs directly from the deployment package (function.zip).
        REMOTE_DEBUGGING_ENABLED: "true", // Additional setting for enabling remote debugging
        // "WEBSITE_RUN_FROM_ZIP": "1", // Important for running from zip
        // "FUNCTIONS_EXTENSION_VERSION": "~4" // Specify the Functions runtime version
        WEBSITE_AUTH_LEVEL: "Anonymous", // Set to Anonymous to make the function public

        COSMOS_CONNECTION_STRING:
          `AccountEndpoint=https://${cosmosAccount.name}.documents.azure.com:443/;AccountKey=${cosmosAccount.primaryKey};Database=${cosmosDatabase.name};` ||
          "your-cosmos-connection-string",
        DATABASE_NAME: cosmosDatabase.name || "your-database-name",
        TODOS_CONTAINER: cosmosConatiner.name || "your-todos-container-name",
      },

      zipDeployFile: path.resolve(__dirname, "../function-app", "main-fn.zip"),
      builtinLoggingEnabled: true,
      enabled: true,
    });

    // ===============================SERVERLESS FUNCTION - END===================================
    //================================SERVERLESS FUNCTION - END===================================

    // ==============================API-MANAGMENT AZURE GRAPHQL- START===================================
    //===============================API-MANAGMENT AZURE GRAPHQL - START===================================

    // // Create an API Management instance

    const apiManagement = new ApiManagement(this, "my-api-management", {
      name: `myapimanagement-hasan123`, // Make the name unique
      location: resourceGroup.location,
      resourceGroupName: resourceGroup.name,
      publisherEmail: "hasansattar650@example.com",
      publisherName: "Hasan Sattar",
      skuName: "Developer_1",
    });

    // // Create a GraphQL API in API Management
    const api = new ApiManagementApi(this, "my-graphql-api", {
      name: "todo-graphql-api",
      displayName: "Todo GraphQL API",
      apiManagementName: apiManagement.name,
      resourceGroupName: resourceGroup.name,
      apiType: "graphql",
      path: "my-api",
      protocols: ["https"],
      serviceUrl: `https://${functionApp.defaultHostname}/api/main`, // Point to the Function App
      revision: "1",
      dependsOn: [apiManagement],
    });

    // // GraphQL Schema (using ApiManagementApiSchema)
    const graphqlSchemaPath = path.resolve(
      __dirname,
      "../graphql",
      "schema.graphql"
    );
    const graphqlSchemaContent = fs.readFileSync(graphqlSchemaPath, "utf-8");

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

    // ==============================API-MANAGMENT AZURE GRAPHQL- END===================================
    //===============================API-MANAGMENT AZURE GRAPHQL -END===================================

    // ===========================OUTPUT -START=======================================
    //============================OUTPUT -START=======================================

    //  OUTPUT
    new TerraformOutput(this, "Graph_Appollo_url", {
      value: `https://${functionApp.defaultHostname}/api/main`, // URL to access the Function App Graphql Server
    });

    // ============================OUTPUT - END======================================
    //=============================OUTPUT - END======================================
  }
}
