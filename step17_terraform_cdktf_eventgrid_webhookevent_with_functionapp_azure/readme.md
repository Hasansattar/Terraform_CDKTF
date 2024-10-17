This CDKTF (Cloud Development Kit for Terraform) code automates the setup of an Azure infrastructure designed for a serverless application that processes events. It begins by defining a resource group and then creates a storage account for data storage. An App Service Plan is established to host two Windows Function Apps: a producer that generates events and a consumer that processes these events. The code also sets up an Event Grid Topic to facilitate the event-driven architecture and Application Insights for monitoring application performance. Additionally, it creates an API Management service to manage and secure the APIs, allowing interaction with the function apps. The Event Grid Subscription is configured to connect the Event Grid Topic with the consumer function app's webhook endpoint, enabling it to receive all published events. Finally, Terraform outputs are defined to provide easy access to the resource identifiers and URLs after deployment, streamlining the management and integration of the application components.

#### 1. Imports

```typescript
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
import * as dotenv from "dotenv"; // Import dotenv package
import * as path from "path";

```

- **Constructs and CDKTF Imports**: The code imports necessary modules from the CDKTF library, including constructs for creating the Azure provider, resources like resource groups and storage accounts, and services like Application Insights and Azure Functions.
- **Dotenv and Path**: The ``dotenv`` package is used to load environment variables from a ``.env`` file, while ``path`` helps in resolving file paths.


#### 2. Azure Provider Configuration

```typescript
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

```

- **AzurermProvider**: This initializes the Azure provider with credentials loaded from the environment variables. It sets up the necessary configuration to manage Azure resources



#### 3. Resource Group Creation

```typescript
const resourceGroup = new ResourceGroup(this, "MyEventGridResourceGroup", {
  name: "hasan123-api-resource-group",
  location: "Australia East",
});

```
- **Resource Group**: This creates an Azure Resource Group named "hasan123-api-resource-group" in the "Australia East" region, serving as a container for all resources.


#### 4. Storage Account Creation

```typescript
const storageAccount = new StorageAccount(this, "myStorageAccount", {
  name: "mystorageaccouneventgrid",
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

```
- **Storage Account**: A storage account is created to store data for the Azure Function App. It has specific configurations for the name, location, account tier, and replication type.



#### 5. App Service Plan Creation

```typescript
const appServicePlan = new ServicePlan(this, "my-app-service-plan", {
  name: "hasan123-my-app-service-plann",
  location: resourceGroup.location,
  resourceGroupName: resourceGroup.name,
  skuName: "B1",
  osType: "Windows",
});

```
- **Service Plan**: This sets up an Azure App Service Plan where the function app will run. It specifies the pricing tier (SKU) and the OS type (Windows).


#### 6. Event Grid Topic Creation

```typescript
const eventGridTopic = new EventgridTopic(this, "myEventGridTopic", {
  name: "my-event-grid-topic",
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
});

```
- **Event Grid Topic**: An Event Grid topic is created to publish events that can be consumed by the function apps.


#### 7. Application Insights Creation

```typescript
const appInsights = new ApplicationInsights(this, "my-app-insights", {
  name: "my-app-insights-hasan1234",
  location: resourceGroup.location,
  resourceGroupName: resourceGroup.name,
  applicationType: "web",
});

```
- **Application Insights**: This resource is set up for monitoring and logging the function apps' performance and usage.


#### 8. Producer Function App Creation

```typescript
const producerFunctionApp = new WindowsFunctionApp(
  this,
  "my-producer-function-app",
  {
    name: "producer-function-app-hasan123",
    location: resourceGroup.location,
    resourceGroupName: resourceGroup.name,
    servicePlanId: appServicePlan.id,
    storageAccountName: storageAccount.name,
    storageAccountAccessKey: storageAccount.primaryAccessKey,
    httpsOnly: true,
    identity: {
      type: "SystemAssigned",
    },
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
      WEBSITE_NODE_DEFAULT_VERSION: "~18",
      APPINSIGHTS_INSTRUMENTATIONKEY: appInsights.instrumentationKey,
      AzureWebJobsStorage: `DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.primaryAccessKey};EndpointSuffix=core.windows.net`,
      SCM_DO_BUILD_DURING_DEPLOYMENT: "true",
      WEBSITE_RUN_FROM_PACKAGE: "1",
      WEBSITE_AUTH_LEVEL: "Anonymous",
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
    dependsOn: [appServicePlan, storageAccount],
  }
);

```
- **Producer Function App**: This defines a Windows Function App that will handle the production of events. It specifies configurations like HTTPS enforcement, CORS settings, application settings, and deployment options.



#### 9. Consumer Function App Creation

```typescript
const consumerFunctionApp = new WindowsFunctionApp(
  this,
  "my-consumer-function-app",
  {
    name: "consumer-function-app-hasan123",
    location: resourceGroup.location,
    resourceGroupName: resourceGroup.name,
    servicePlanId: appServicePlan.id,
    storageAccountName: storageAccount.name,
    storageAccountAccessKey: storageAccount.primaryAccessKey,
    httpsOnly: true,
    identity: {
      type: "SystemAssigned",
    },
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
      FUNCTIONS_WORKER_RUNTIME_VERSION: "18",
      APPINSIGHTS_INSTRUMENTATIONKEY: appInsights.instrumentationKey,
      AzureWebJobsStorage: `DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.primaryAccessKey};EndpointSuffix=core.windows.net`,
      SCM_DO_BUILD_DURING_DEPLOYMENT: "true",
      WEBSITE_RUN_FROM_PACKAGE: "1",
      WEBSITE_AUTH_LEVEL: "Anonymous",
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
    dependsOn: [appServicePlan, storageAccount],
  }
);

```
- **Consumer Function App**: Similar to the producer, this sets up another Windows Function App to consume events. It has its own settings for logging, CORS, and deployment.


#### 10. API Management Creation

```typescript
const apiManagement = new ApiManagement(this, "ApiManagement", {
  name: "myApiManagementHasan",
  location: resourceGroup.location,
  resourceGroupName: resourceGroup.name,
  publisherEmail: "hasansattar650@example.com",
  publisherName: "Hasan Sattar",
  skuName: "Developer_1",
});

```
- **API Management**: This resource manages the APIs for the Azure functions, providing a way to publish and secure APIs.



#### 11. API Management API Creation

```typescript
const apiManagementApi = new ApiManagementApi(this, "ApiManagementApi", {
  name: "myApiManagementApi",
  resourceGroupName: resourceGroup.name,
  apiManagementName: apiManagement.name,
  protocols: ["https"],
  path: "api",
});

```
- **API**: Defines an API within the API Management service, specifying the protocols and path.


#### 12. API Operation Creation

```typescript
const apiManagementApiOperation = new ApiManagementApiOperation(
  this,
  "ApiManagementApiOperation",
  {
    apiManagementName: apiManagement.name,
    apiName: apiManagementApi.name,
    resourceGroupName: resourceGroup.name,
    name: "myApiOperation",
    method: "GET",
    urlTemplate: "/hello",
    response: [
      {
        statusCode: 200,
        body: `{"message": "Hello from API!"}`,
        contentType: "application/json",
      },
    ],
  }
);

```
- **API Operation**: This creates an operation for the defined API, specifying the HTTP method and response format.



#### 13. Event Grid Subscription Creation

```typescript
  // Event Subscription to the Consumer Function
    new EventgridEventSubscription(this, "EventHasanGridSubscription", {
      name: "my-event-grid-event-subscription",
      scope: eventGridTopic.id, // Use the scope parameter to link the topic

      webhookEndpoint: {
        url: `https://${consumerFunctionApp.defaultHostname}/api/events`, // Replace with your webhook URL
      },
      includedEventTypes: [
        "Microsoft.EventGrid.SubscriptionValidationEvent", // Required for validation
        "Microsoft.Storage.BlobCreated", // Event to trigger on Blob creation
        "Microsoft.Storage.BlobDeleted", // Event to trigger on Blob deletion
        "Sample.EventType", // Your event type
      ],
      advancedFilteringOnArraysEnabled: false, // Enable or disable advanced filtering
      retryPolicy: {
        maxDeliveryAttempts: 30, // Max delivery attempts for retries
        eventTimeToLive: 60, // 60 min==> 24 hours is the maximum allowed value in minutes
      },
      timeouts: {
        read: "15m",
        update: "15m",
        create: "15m",
      },

      dependsOn: [consumerFunctionApp],
    });
```
- **Event Grid Subscription**: Creates a subscription for the Event Grid topic, pointing to the consumer function app's webhook endpoint, allowing it to receive ``Microsoft.EventGrid.SubscriptionValidationEvent``, ``Microsoft.Storage.BlobCreated``, ``Microsoft.Storage.BlobDeleted``, and ``Sample.EventType`` event types.


#### 14. Terraform Outputs

```typescript
new TerraformOutput(this, "eventGridTopicId", {
  value: eventGridTopic.id,
});
new TerraformOutput(this, "producerFunctionAppUrl", {
  value: producerFunctionApp.defaultHostname,
});
new TerraformOutput(this, "consumerFunctionAppUrl", {
  value: consumerFunctionApp.defaultHostname,
});

```


# Summary

This Azure infrastructure stack creates a serverless event-driven application using various components. It begins with a ``Resource Group`` to organize resources, followed by a ``Storage Account`` for data storage. The ``App Service Plan`` hosts two ``Function Apps``: a ``Producer`` that generates and publishes events to an ``Event Grid Topic``, and a ``Consumer`` that processes those events. ``Application Insights`` is integrated for monitoring and performance analysis, while`` API Management`` secures and manages the APIs exposed by the function apps. An ``Event Grid Subscription ``connects the topic to the consumer app, ensuring it receives and reacts to published events. Overall, this stack facilitates real-time event processing and includes monitoring and management features.

************************************************
********************************************


# Event Grid
### https://learn.microsoft.com/en-us/azure/event-grid/event-schema


## Handling Event Grid Subscription Validation in Azure Function

#### Validation Process Overview:

##### 1. Event Subscription Validation:

- When you create or update an Event Grid subscription, Azure Event Grid sends a validation event (``Microsoft.EventGrid.SubscriptionValidationEvent``) to your endpoint.
- This validation event contains a ``validationCode`` that your endpoint needs to echo back to Event Grid.
- The event body also includes a ``validationUrl`` for manual validation if the automatic handshake fails.

##### 2. Response Requirements:

- Your Azure Function must check if the incoming request is a subscription validation event.
- If it is, your function must return the ``validationCode`` in the correct format to confirm the subscription.

Here is an updated example that matches the format of the validation event you've provided:


```typescript
import {  Context, HttpRequest } from "@azure/functions";

module.exports = async function (context:Context, req:HttpRequest) {
  const body = req.body;

  // Check if the request contains a validation event
  if (body && body[0] && body[0].data && body[0].eventType === "Microsoft.EventGrid.SubscriptionValidationEvent") {
      const validationCode = body[0].data.validationCode;
      context.log(`Received validation request. Validation code: ${validationCode}`);

      // Return the validation code in the correct format
      context.res = {
          status: 200,
          body: {
              validationResponse: validationCode
          }
      };
  } else {
      // Handle actual event data
      context.log('Event received', body);

      context.res = {
          status: 200,
          body: "Events processed successfully."
      };
  }
};
```

##### Key Points:
- **Event Validation**: The code checks if the incoming event has eventType set to Microsoft.EventGrid.SubscriptionValidationEvent.
- **Validation Response**: If a validation event is received, the Azure Function returns the validationCode inside the validationResponse field, which confirms the subscription.
- **Other Events**: If the request is not a validation event, it simply logs and processes the event as usual.

##### Example Validation Event (as per your details):


```typescript
[
  {
    "id": "2d1781af-3a4c-4d7c-bd0c-e34b19da4e66",
    "topic": "/subscriptions/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "subject": "",
    "data": {
      "validationCode": "512d38b6-c7b8-40c8-89fe-f46f9e9622b6",
      "validationUrl": "https://rp-eastus2.eventgrid.azure.net:553/eventsubscriptions/myeventsub/validate?id=0000000000-0000-0000-0000-00000000000000&t=2022-10-28T04:23:35.1981776Z&apiVersion=2018-05-01-preview&token=1A1A1A1A"
    },
    "eventType": "Microsoft.EventGrid.SubscriptionValidationEvent",
    "eventTime": "2022-10-28T04:23:35.1981776Z",
    "metadataVersion": "1",
    "dataVersion": "1"
  }
]

```









```typescript
{
  "subject": "New Sensor Data",
  "eventType": "Sample.EventType",
  "data": {
    "sensorId": "sensor-123",
    "temperature": 25.6
  },
  "dataVersion": "1.0"
}

```