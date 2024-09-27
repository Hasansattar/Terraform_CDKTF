To set up Azure credentials in the Windows Command Line Interface (CLI) for Terraform (or other tools like ``cdktf``), you'll need to create a Service Principal in Azure and then set the necessary environment variables. Here’s a step-by-step guide to get it set up:

## Step 1: Install Azure CLI
If you don’t already have the Azure CLI installed, you can download and install it by following the instructions [here](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-windows?tabs=azure-cli)
## Step 2: Log in to Azure CLI
Once Azure CLI is installed, open the command prompt and log in to your Azure account:

```bash
az login
```
This will open a browser where you can log in using your Azure account. After login, the CLI will display the list of subscriptions associated with your account.

## Step 3: Create a Service Principal

To authenticate Terraform with Azure, you need to create a Service Principal. Run the following command to create it:

```bash
az ad sp create-for-rbac --name "cdktf-terraform-sp" --role="Contributor" --scopes="/subscriptions/<your-subscription-id>"
```
Replace ``<your-subscription-id>`` with your Azure Subscription ID, which you can find by running:
```bash
az account show --query id --output tsv
```
The output of the service principal creation command will provide you with the necessary credentials in JSON format, like this:


```json
{
  "appId": "<client-id>",
  "displayName": "cdktf-terraform-sp",
  "password": "<client-secret>",
  "tenant": "<tenant-id>"
}
```
Make sure to copy these values.

## Step 4: Set Azure Environment Variables in Windows

To configure the credentials in your Windows CLI for Terraform, you'll need to set the following environment variables:

- ``ARM_CLIENT_ID``: This is the ``appId`` from the service principal creation.
- ``ARM_CLIENT_SECRET``: This is the ``password`` from the service principal creation.
- ``ARM_SUBSCRIPTION_ID``: This is your Azure ``subscription ID``.
- ``ARM_TENANT_ID``: This is the ``tenant ID`` from the service principal creation.


Set these environment variables in the Windows CLI using the following commands:

```bash
set ARM_CLIENT_ID=<client-id>
set ARM_CLIENT_SECRET=<client-secret>
set ARM_SUBSCRIPTION_ID=<subscription-id>
set ARM_TENANT_ID=<tenant-id>
```
For example:

```bash
set ARM_CLIENT_ID="12345678-1234-1234-1234-123456789abc"
set ARM_CLIENT_SECRET="abcdef12-1234-5678-abcdef12345678"
set ARM_SUBSCRIPTION_ID="87654321-4321-4321-4321-abcdefabcdef"
set ARM_TENANT_ID="abcdef12-ab12-cd34-ef56-abcdefabcdef"
```

## Step 5: Verify Environment Variables
To check if the environment variables are set correctly, run the following commands in the CLI:

```bash
echo %ARM_CLIENT_ID%
echo %ARM_CLIENT_SECRET%
echo %ARM_SUBSCRIPTION_ID%
echo %ARM_TENANT_ID%
```

Each command should return the respective value you set.
********************************************
**********************************************
Let's break down the provided CDKTF (Cloud Development Kit for Terraform) code step by step, including an explanation of each section and the purpose of the various components.

**Imports**
```typescript
import { Construct } from 'constructs';
import { TerraformStack, TerraformOutput } from 'cdktf';
import { AzurermProvider } from '@cdktf/provider-azurerm/lib/provider';
import { ResourceGroup } from '@cdktf/provider-azurerm/lib/resource-group';
import { StorageAccount } from '@cdktf/provider-azurerm/lib/storage-account';
import { StorageContainer } from '@cdktf/provider-azurerm/lib/storage-container';
import { StorageBlob } from '@cdktf/provider-azurerm/lib/storage-blob';
import { CdnProfile } from '@cdktf/provider-azurerm/lib/cdn-profile';
import { CdnEndpoint } from '@cdktf/provider-azurerm/lib/cdn-endpoint';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';  // Import dotenv package

```

- **Construct**: A base class for creating constructs, which are basic building blocks of a CDK application.
- **TerraformStack**: Represents a stack in Terraform, where you can define resources.
- **TerraformOutput**: Used to output values after the stack is created, useful for referencing resources created.
- **AzurermProvider**: This provider is used to manage Azure resources.
- **ResourceGroup, StorageAccount, StorageContainer, StorageBlob, CdnProfile, CdnEndpoint**: These are specific Azure resources that the code will create.
- **path**: A Node.js module used for handling file and directory paths.
- **fs**: Node.js module used for file system operations, such as reading and writing files.
- **dotenv**: A module used to load environment variables from a .env file into process.env.


**Loading Environment Variables**

```typescript
// Load environment variables from the .env file
const environmentVariable=dotenv.config();
console.log("environmentVariable===>",environmentVariable);

```
This code loads environment variables defined in a .env file. This is useful for keeping sensitive information (like API keys and IDs) out of the source code.

**Stack Definition**


```typescript
export class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

```
- **MyStack**: A class extending ``TerraformStack``, representing a stack where Azure resources will be defined.
- The constructor takes in ``scope`` and ``id``, which are common parameters for CDK constructs.

**Azure Provider Configuration**

```typescript
// Azure provider with region (location)
new AzurermProvider(this, 'AzureRM', {
  features: [{}],
  subscriptionId: environmentVariable.parsed?.ARM_SUBSCRIPTION_ID || "your-subscription-id",
  clientId: environmentVariable.parsed?.ARM_CLIENT_ID || "your-client-id",
  clientSecret: environmentVariable.parsed?.ARM_CLIENT_SECRET || "your-client-secret",
  tenantId: environmentVariable.parsed?.ARM_TENANT_ID || "your-tenant-id",
});

```
This initializes the Azure provider with necessary authentication parameters (subscription ID, client ID, client secret, and tenant ID), either from environment variables or defaults. It allows the stack to interact with Azure resources.

**Resource Group Creation**


```typescript
// Create a resource group
const resourceGroup = new ResourceGroup(this, 'MyResourceGroup', {
  name: 'my-resource-group',
  location: 'East US', // Use the same location as your other resources
});

```

- **ResourceGroup**: Creates a new Azure Resource Group, which is a logical container for Azure resources. The location should be consistent with the resources you will create.

**Storage Account Creation**


```typescript
// Create a storage account
const storageAccount = new StorageAccount(this, 'StorageAccount', {
  name: 'mystorageaccounthasan',
  resourceGroupName: resourceGroup.name, // Reference the resource group
  location: 'East US',  // Specify the Azure region for the storage account
  accountTier: 'Standard',
  accountReplicationType: 'LRS',
});

```

- **StorageAccount**: Creates a new Azure Storage Account, which will store blobs, files, and more. It specifies the name, resource group, location, tier, and replication type (Locally Redundant Storage in this case).


**Storage Container Creation**

```typescript
// Create a storage container
const container = new StorageContainer(this, 'StorageContainer', {
  name: 'website',
  storageAccountName: storageAccount.name,
  containerAccessType: 'blob',
});

```
- **StorageContainer**: Creates a blob storage container within the storage account. The container will hold the website files.


**Uploading Files to the Storage Container**
Uploading index.html


```typescript
// Upload index.html to the storage container
new StorageBlob(this, 'IndexFile', {
  name: 'index.html',
  storageAccountName: storageAccount.name,
  storageContainerName: container.name,
  type: 'Block',
  source: path.resolve(__dirname, 'website/index.html'),
  contentType: 'text/html', // Set Content-Type for HTML
});

```

- **StorageBlob**: Uploads a file (``index.html``) to the storage container. It sets the content type to HTML.


Uploading Additional Files
```typescript
// Upload additional files (CSS, JS, etc.)
const websiteFolder = path.resolve(__dirname, 'website');
const files = fs.readdirSync(websiteFolder);
files.forEach((file) => {
  if (file !== 'index.html') {
    new StorageBlob(this, file, {
      name: file,
      storageAccountName: storageAccount.name,
      storageContainerName: container.name,
      type: 'Block',
      source: path.resolve(websiteFolder, file),
      contentType: 'text/html', // Set Content-Type for HTML
    });
  }
});

```
- This block reads all files in the ``website`` directory (excluding ``index.html``) and uploads them to the storage container as blobs.


CDN Profile Creation
```typescript
// Create a CDN Profile
const cdnProfile = new CdnProfile(this, 'CdnProfile', {
  name: 'mycdnprofile',
  resourceGroupName: resourceGroup.name,
  location: 'East US',  // Specify the Azure region for the CDN profile
  sku: 'Standard_Microsoft',
});

```

- **CdnProfile**: Creates a Content Delivery Network (CDN) profile, which helps to distribute content globally. The SKU defines the pricing tier.

**CDN Endpoint Creation**


```typescript
// Create a CDN endpoint
const cdnEndpoint = new CdnEndpoint(this, 'CdnEndpoint', {
  name: 'mycdnendpoint',
  resourceGroupName: resourceGroup.name,
  profileName: cdnProfile.name,
  originHostHeader: storageAccount.primaryBlobHost,
  origin: [
    {
      name: 'blobOrigin',
      hostName: storageAccount.primaryBlobHost,
    },
  ],
  isHttpsAllowed: true,
  isHttpAllowed: false,
  location: 'East US',  // Fix: Add the missing 'location' field
});

```

- **CdnEndpoint**: Defines an endpoint for the CDN that connects to the storage account. It specifies whether HTTPS/HTTP is allowed and provides the origin details for where the content is served.

**Outputting the CDN Endpoint Domain Name**

```typescript
// Output the CDN endpoint domain name
new TerraformOutput(this, 'CdnEndpointDomainName', {
  value: cdnEndpoint.name ,// hostName,
  description: 'The domain name of the CDN endpoint',
});

```

- **TerraformOutput**: Outputs the CDN endpoint's name after the stack is deployed. This can be useful for accessing the CDN endpoint URL.

**Summary**

This code is a complete example of using CDKTF to deploy an Azure web application stack. It creates a resource group, a storage account for hosting website files, uploads the website files to the storage account, and sets up a CDN for faster content delivery. The use of environment variables ensures that sensitive information is not hardcoded into the application






### Deploy the Infrastructure

Install Dependencies: Run the following command to install the required dependencies:

```bash
npm install

```
**Compile the typescript code**
```bash
npm run build
```
Synthesize the Terraform Configuration: Run the synth command to generate the Terraform configuration files in the cdktf.out/ directory:

```bash
cdkft synth
```
Check the configuration plan
```bash
cdktf plan
```

Deploy the Infrastructure: Run the deploy command to apply the Terraform configuration and provision the AWS resources:

```bash
cdktf deploy
```

Destroy the Infrastructure: If you want to destroy the infrastructure, you can run the destroy command:

```bash
cdktf destroy
```
