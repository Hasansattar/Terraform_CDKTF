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
The provided code is a TypeScript file using Terraform CDK (CDKTF) to deploy resources on Microsoft Azure. It automates the process of creating an Azure storage account and uploading website files (HTML, CSS, JS, etc.) from a local folder into an Azure Blob Storage container. Let's break down and explain the code step by step

**1. Imports**
```typescript
import { Construct } from "constructs";
import { TerraformStack, TerraformOutput } from "cdktf";
import { AzurermProvider } from "@cdktf/provider-azurerm/lib/provider";
import { ResourceGroup } from "@cdktf/provider-azurerm/lib/resource-group";
import { StorageAccount } from "@cdktf/provider-azurerm/lib/storage-account";
import { StorageContainer } from "@cdktf/provider-azurerm/lib/storage-container";
import { StorageBlob } from "@cdktf/provider-azurerm/lib/storage-blob";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";
```

- **TerraformStack**: A base class to define infrastructure as code using CDK for Terraform.
- **AzurermProvider**: Allows Terraform to manage Azure resources.
- **ResourceGroup, StorageAccount, StorageContainer, StorageBlob**: Resources for managing Azure infrastructure (storage account, container, and individual blobs).
- **fs (file system) and path**: Native Node.js modules for file system operations and path handling.
- **dotenv**: To load environment variables from a .env file for sensitive information like Azure credentials.


**2. Loading Environment Variables**

```typescript
// Load environment variables from the .env file
const environmentVariable=dotenv.config();
console.log("environmentVariable===>",environmentVariable);

```
This code loads environment variables defined in a .env file. This is useful for keeping sensitive information (like API keys and IDs) out of the source code.

**3. MyStack Class**

This is the core class where the Azure resources and logic are defined. It extends **TerraformStack**, which is used to define and deploy infrastructure.

**``a) Azure Provider Initialization``**


```typescript
new AzurermProvider(this, "AzureRM", {
  features: [{}],
  subscriptionId: environmentVariable.parsed?.ARM_SUBSCRIPTION_ID || "your-subscription-id",
  clientId: environmentVariable.parsed?.ARM_CLIENT_ID || "your-client-id",
  clientSecret: environmentVariable.parsed?.ARM_CLIENT_SECRET || "your-client-secret",
  tenantId: environmentVariable.parsed?.ARM_TENANT_ID || "your-tenant-id",
});

```

- **AzurermProvider**: Sets up the connection to Azure. It uses environment variables to authenticate with Azure. If the environment variables are not available, fallback default values like ``"your-subscription-id"`` are used (although it’s recommended to configure these properly in ``.env``).


**``b) Resource Group``**

```typescript
const resourceGroup = new ResourceGroup(this, "MyResourceGroup", {
  name: "my-resource-group",
  location: "East US",
});
```
- A **ResourceGroup** is created in **East US**. A resource group in Azure serves as a logical container for all related resources (like storage accounts, virtual machines, etc.).



**``c) Storage Account``**


```typescript
const storageAccount = new StorageAccount(this, "StorageAccount", {
  name: "mystorageaccounthasan",
  resourceGroupName: resourceGroup.name,
  location: "East US",
  accountTier: "Standard",
  accountReplicationType: "LRS",
});


```
The **StorageAccount** resource defines the storage account in Azure

- **name**: The name of the storage account (must be globally unique in Azure).
- **location**: Must match the resource group's location.
- **accountTier**: Determines the storage performance (Standard or Premium).
- **accountReplicationType**: Controls how Azure replicates your data (LRS - Locally Redundant Storage, which means data is replicated within the same region).





**``d) Storage Container``**


```typescript
/const container = new StorageContainer(this, "StorageContainer", {
  name: "website",
  storageAccountName: storageAccount.name,
  containerAccessType: "blob",
});

```
**StorageContainer** represents the Azure Blob Storage container.

- **name**: The name of the container (here, ``"website"``).
- **storageAccountName**: Links to the storage account created earlier.
- **containerAccessType**: Controls the access level (here ``"blob"`` means public read access for blobs).





**``e) Uploading Files (Website Content)``**: 

```typescript
const websiteFolder = path.resolve(__dirname, "website");
uploadDirectory(websiteFolder, container, storageAccount);

```

- A local folder called ``"website"`` (which holds the CSS, JS, HTML files, etc.) is uploaded to the Blob Storage container.
- ``uploadDirectory``: This helper function recursively uploads files and folders to the Azure storage container.



**4. StorageContainer**: 


```typescript
function uploadDirectory(
  directory: string,
  container: StorageContainer,
  storageAccount: StorageAccount
) {
  const files = fs.readdirSync(directory);
  
  files.forEach((file) => {
    const filePath = path.resolve(directory, file);
    
    if (fs.statSync(filePath).isDirectory()) {
      uploadDirectory(filePath, container, storageAccount);
    } else {
      const relativePath = path.relative(
        path.resolve(__dirname, "website"),
        filePath
      );
      const contentType = getContentType(file);
      
      new StorageBlob(container, relativePath, {
        name: relativePath.split(path.sep).join("/"),
        storageAccountName: storageAccount.name,
        storageContainerName: container.name,
        type: "Block",
        source: filePath,
        contentType: contentType,
      });
      console.log(`Uploaded ${relativePath} to blob storage.`);
    }
  });
}
```

- **fs.readdirSync**: Reads all files and folders in the given directory.
- **Recursion**: If it finds a subfolder, the function calls itself to traverse deeper, ensuring all files and subfolders are uploaded.
- **StorageBlob**: Represents each individual file (or blob) in the storage container. Each file is uploaded as a blob in the Azure container, and its virtual path (folder structure) is preserved using / as the directory separator.



**5. getContentType Helper Function**: 


```typescript
function getContentType(file: string): string {
  const ext = path.extname(file).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html";
    case ".css":
      return "text/css";
    case ".js":
      return "application/javascript";
    case ".png":
      return "image/png";
    case ".jpg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}


```

- This function determines the MIME type (content type) of each file based on its extension (.html, .css, .js, etc.).
- The correct MIME type is important so the browser knows how to interpret the file when accessed.




**6. Terraform Outputs**: 




```typescript
const staticWebsiteUrl = `https://${storageAccount.name}.blob.core.windows.net/${container.name}/index.html`;
new TerraformOutput(this, "StaticWebsiteUrl", {
  value: staticWebsiteUrl,
  description: "The URL of the static website",
});

new TerraformOutput(this, "CdnEndpointDomainName", {
  value: storageAccount.name,
  description: "The domain name of the CDN endpoint",
});
```
**TerraformOutput:** Outputs key information after the infrastructure is deployed.

- **StaticWebsiteUrl**: Provides the URL of the static website hosted in Azure Blob Storage. The URL points to the ``index.html`` file.
- **CdnEndpointDomainName**: Could later be used for an Azure CDN (if integrated). For now, it returns the storage account name.



**Summary**

The provided TypeScript code uses Terraform CDK (CDKTF) to automate the deployment of a static website on Microsoft Azure. It creates an Azure resource group, a storage account, and a blob storage container where website files (HTML, CSS, JS) are stored. The code reads files from a local "website" directory, uploads them recursively into the Azure Blob Storage container, and preserves the folder structure. Additionally, it determines the MIME type for each file based on its extension to ensure correct browser interpretation. The Azure connection details, such as subscription ID and client credentials, are securely loaded from environment variables. Once the infrastructure is deployed, the code outputs the URL where the static website can be accessed. This setup allows users to host a static website with minimal effort on Azure.




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
