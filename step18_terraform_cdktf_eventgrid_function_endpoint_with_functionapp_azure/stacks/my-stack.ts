import { Construct } from "constructs";
import { TerraformStack, TerraformOutput } from "cdktf";

import { AzurermProvider } from "@cdktf/provider-azurerm/lib/provider";
import { ResourceGroup } from "@cdktf/provider-azurerm/lib/resource-group";
import { StorageAccount } from "@cdktf/provider-azurerm/lib/storage-account";

import { ApplicationInsights } from "@cdktf/provider-azurerm/lib/application-insights";
import { WindowsFunctionApp } from "@cdktf/provider-azurerm/lib/windows-function-app";
import { ServicePlan } from "@cdktf/provider-azurerm/lib/service-plan";

import { EventgridTopic } from "@cdktf/provider-azurerm/lib/eventgrid-topic";
import { EventgridEventSubscription } from "@cdktf/provider-azurerm/lib/eventgrid-event-subscription";

import { ApiManagement } from "@cdktf/provider-azurerm/lib/api-management";
import { ApiManagementApi } from "@cdktf/provider-azurerm/lib/api-management-api";
import { ApiManagementApiOperation } from "@cdktf/provider-azurerm/lib/api-management-api-operation";
// import {RoleAssignment} from "@cdktf/provider-azurerm/lib/role-assignment";
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
    const resourceGroup = new ResourceGroup(this, "MyEventGridResourceGroup", {
      name: "hasan123-api-resource-group",
      location: "Australia East", // Use the same location as your other resources
    });

    // Create a Storage Account for Function App
    const storageAccount = new StorageAccount(this, "myStorageAccount", {
      name: "mystorageaccouneventgrid", // Must be unique across Azure
      resourceGroupName: resourceGroup.name,
      location: resourceGroup.location,
      accountTier: "Standard",
      accountReplicationType: "LRS",
      timeouts: {
        create: "60m",
        update: "60m",
        delete: "60m",
      },
    });

    // Create an App Service Plan
    const appServicePlan = new ServicePlan(this, "my-app-service-plan", {
      name: "hasan123-my-app-service-plann",
      location: resourceGroup.location,
      resourceGroupName: resourceGroup.name,
      skuName: "B1", // Choose a valid SKU
      osType: "Windows", // Set the OS type to Windows
    });


    
    // =============================EVENT GRID TOPIC - START=====================================
    //==============================EVENT GRID TOPIC - START=====================================

    // Create an Event Grid Topic
    const eventGridTopic = new EventgridTopic(this, "myEventGridTopic", {
      name: "my-event-grid-topic",
      resourceGroupName: resourceGroup.name,
      location: resourceGroup.location,
      // inputSchema:"EventGridSchema",
      // lifecycle: {
      //   createBeforeDestroy: true,

      // },
    });


    
    // =============================EVENT GRID TOPIC - END=====================================
    //==============================EVENT GRID TOPIC - END=====================================


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
    const producerFunctionApp = new WindowsFunctionApp(
      this,
      "my-producer-function-app",
      {
        name: "producer-function-app-hasan123",
        location: resourceGroup.location,
        resourceGroupName: resourceGroup.name,
        servicePlanId: appServicePlan.id,
        storageAccountName: storageAccount.name, // Ensure this is globally unique
        storageAccountAccessKey: storageAccount.primaryAccessKey, // You'll need to retrieve this
        httpsOnly: true,
        identity: {
          type: "SystemAssigned",
        },
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
          WEBSITE_NODE_DEFAULT_VERSION: "~18", // Specifies the version of Node.js to use. You might need to adjust the version if you’re using a specific version.
          FUNCTION_APP_EDIT_MODE: "readwrite",
          APPINSIGHTS_INSTRUMENTATIONKEY: appInsights.instrumentationKey, // Enables Application Insights for logging and monitoring.
          AzureWebJobsStorage: `DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.primaryAccessKey};EndpointSuffix=core.windows.net`,
          SCM_DO_BUILD_DURING_DEPLOYMENT: "true", // Enable build during deployment
          WEBSITE_CORS_ALLOWED_ORIGINS: "*", // WEBSITE_CORS_ALLOWED_ORIGINS: "*", // Adjust as necessary
          WEBSITE_RUN_FROM_PACKAGE: "1", // This setting ensures that the Function App runs directly from the deployment package (function.zip).
          REMOTE_DEBUGGING_ENABLED: "true", // Additional setting for enabling remote debugging
          // "WEBSITE_RUN_FROM_ZIP": "1", // Important for running from zip
          // "FUNCTIONS_EXTENSION_VERSION": "~4" // Specify the Functions runtime version
          WEBSITE_AUTH_LEVEL: "Anonymous", // Set to Anonymous to make the function public
          EVENT_GRID_TOPIC_NAME: eventGridTopic.name,
          EVENT_GRID_KEY: eventGridTopic.primaryAccessKey,
        },

        zipDeployFile: path.resolve(
          __dirname,
          "../function-app",
          "producer.zip"
        ),
        builtinLoggingEnabled: true,
        enabled: true,
        timeouts: {
          create: "15m",
          update: "15m",
        },
        dependsOn: [appServicePlan, storageAccount], // Ensure dependencies
      }
    );

    const consumerFunctionApp = new WindowsFunctionApp(
      this,
      "my-consumer-function-app",
      {
        name: "consumer-function-app-hasan123",
        location: resourceGroup.location,
        resourceGroupName: resourceGroup.name,
        servicePlanId: appServicePlan.id,
        storageAccountName: storageAccount.name, // Ensure this is globally unique
        storageAccountAccessKey: storageAccount.primaryAccessKey, // You'll need to retrieve this
        httpsOnly: true,
        identity: {
          type: "SystemAssigned",
        },
        functionsExtensionVersion: "~4",
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
          FUNCTIONS_WORKER_RUNTIME_VERSION: "18",
          FUNCTION_APP_EDIT_MODE: "readwrite",
          WEBSITE_NODE_DEFAULT_VERSION: "~18", // Specifies the version of Node.js to use. You might need to adjust the version if you’re using a specific version.
          APPINSIGHTS_INSTRUMENTATIONKEY: appInsights.instrumentationKey, // Enables Application Insights for logging and monitoring.
          AzureWebJobsStorage: `DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.primaryAccessKey};EndpointSuffix=core.windows.net`,
          SCM_DO_BUILD_DURING_DEPLOYMENT: "true", // Enable build during deployment
          WEBSITE_CORS_ALLOWED_ORIGINS: "*", // WEBSITE_CORS_ALLOWED_ORIGINS: "*", // Adjust as necessary
          WEBSITE_RUN_FROM_PACKAGE: "1", // This setting ensures that the Function App runs directly from the deployment package (function.zip).
          REMOTE_DEBUGGING_ENABLED: "true", // Additional setting for enabling remote debugging
          //WEBSITE_RUN_FROM_ZIP: "1", // Important for running from zip
          // "FUNCTIONS_EXTENSION_VERSION": "~4" // Specify the Functions runtime version
          WEBSITE_AUTH_LEVEL: "Anonymous", // Set to Anonymous to make the function public
        },

        zipDeployFile: path.resolve(
          __dirname,
          "../function-app",
          "consumer.zip"
        ),
        builtinLoggingEnabled: true,
        enabled: true,
        timeouts: {
          create: "15m",
          update: "15m",
        },
        dependsOn: [appServicePlan, storageAccount], // Ensure dependencies
      }
    );

    // ===============================SERVERLESS FUNCTION - END===================================
    //================================SERVERLESS FUNCTION - END===================================

       // =============================API MANAGMENT -START=====================================
       //==============================API MANAGMENT -START=====================================
    const apiManagement = new ApiManagement(this, "ApiManagement", {
      name: "myApiManagementHasan",
      location: resourceGroup.location,
      resourceGroupName: resourceGroup.name,
      publisherEmail: "hasansattar650@example.com",
      publisherName: "Hasan Sattar",
      skuName: "Developer_1",
    });

    // API for Producer Lambda (Azure Function)
    const api = new ApiManagementApi(this, "Api", {
      name: "producerApiHasan",
      resourceGroupName: resourceGroup.name,
      apiManagementName: apiManagement.name,
      displayName: "Producer API",
      path: "producer",
      protocols: ["https"],
      serviceUrl: `https://${producerFunctionApp.defaultHostname}/api/producer`, // Point to the Function App
      revision: "1",
    });

    // POST method for the producer function
    new ApiManagementApiOperation(this, "ApiOperation", {
      apiName: api.name,
      resourceGroupName: resourceGroup.name,
      apiManagementName: apiManagement.name,
      operationId: "postEvent",
      description: "Posts an event to the event grid",
      displayName: "Post Event",
      method: "POST",
      urlTemplate: "/",

      request: { description: "Create a new event" },
      response: [{ statusCode: 200, description: "Event posted successfully" }],
    });


    // =============================API MANAGMENT - END=====================================
    //==============================API MANAGMENT - END=====================================


    
    // =============================EVENT GRID SUBSCRIPTION - START=====================================
    // =============================EVENT GRID SUBSCRIPTION - START=====================================

      // Event Subscription to the Consumer Function
      new EventgridEventSubscription(this, "EventGridSubscriptionFunctionEndpoint", {
        name: 'event-grid-event-subscription',
        scope: eventGridTopic.id, // Use the scope parameter to link the topic
         azureFunctionEndpoint: {
          functionId: `${consumerFunctionApp.id}/functions/eventGridTrigger`, //function_id - (Required) Specifies the ID of the Function where the Event Subscription will receive events. This must be the functions ID in format {function_app.id}/functions/{name}.
              
         }, 
        includedEventTypes: [
          'Microsoft.EventGrid.SubscriptionValidationEvent', // Required for validation
    'Microsoft.Storage.BlobCreated',                  // Event to trigger on Blob creation
    'Microsoft.Storage.BlobDeleted',         
          'Sample.EventType',     // Your event type
        ],    
      });
   
    // Role Assignment for Producer Function

    // new RoleAssignment(this, "ProducerHasanRoleAssignment", {
    //   scope: eventGridTopic.id,
    //   roleDefinitionName: "EventGrid Contributor",  // Role definition, e.g., "Contributor" ,"User Access Administrator , Owner , Role Based Access Control Administrator ,Access Review Operator Service Role  "
    //   principalId:  producerFunctionApp.identity.principalId,
    // });

    // // Role Assignment for Consumer Function

    // new RoleAssignment(this, "ConsumerHasanRoleAssignment", {
    //   scope:  eventGridTopic.id,
    //   roleDefinitionName: "EventGrid Contributor",  // Role definition, e.g., "Contributor" , "User Access Administrator, Owner, Role Based Access Control Administrator , Access Review Operator Service Role "
    //   principalId: consumerFunctionApp.identity.principalId
    // });


    // =============================EVENT GRID SUBSCRIPTION - END=====================================
    //==============================EVENT GRID SUBSCRIPTION - END=====================================



    // =============================OUTPUT - START=====================================
    //==============================OUTPUT - START=====================================

    // Output resources
    new TerraformOutput(this, "eventGridTopicId", {
      value: eventGridTopic.id,
    });
    new TerraformOutput(this, "producerFunctionAppUrl", {
      value: producerFunctionApp.defaultHostname,
    });
    new TerraformOutput(this, "consumerFunctionAppUrl", {
      value: consumerFunctionApp.defaultHostname,
    });

    new TerraformOutput(this, "apiManagementUrl", {
      value: `https://${apiManagement.gatewayUrl}`,
    });

    
    // =============================OUTPUT - END=====================================
    //==============================OUTPUT - END=====================================

  }
}
