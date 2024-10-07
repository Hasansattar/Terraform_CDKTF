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


// Load environment variables from the .env file
const environmentVariable=dotenv.config();
console.log("environmentVariable===>",environmentVariable);

export class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Azure provider with region (location)
    new AzurermProvider(this, 'AzureRM', {
      features: [{}],
      subscriptionId: environmentVariable.parsed?.ARM_SUBSCRIPTION_ID || "your-subscription-id",
      clientId: environmentVariable.parsed?.ARM_CLIENT_ID || "your-client-id",
      clientSecret: environmentVariable.parsed?.ARM_CLIENT_SECRET || "your-client-secret",
      tenantId: environmentVariable.parsed?.ARM_TENANT_ID || "your-tenant-id",
    });

    // Create a resource group
     const resourceGroup = new ResourceGroup(this, 'MyResourceGroup', {
       name: 'my-resource-group',
       location: 'East US', // Use the same location as your other resources
     });

    // Create a storage account
    const storageAccount = new StorageAccount(this, 'StorageAccount', {
      name: 'mystorageaccounthasan',
      resourceGroupName: resourceGroup.name, // Reference the resource group
      location: 'East US',  // Specify the Azure region for the storage account
      accountTier: 'Standard',
      accountReplicationType: 'LRS',
    });

    // Create a storage container
    const container = new StorageContainer(this, 'StorageContainer', {
      name: 'website',
      storageAccountName: storageAccount.name,
      containerAccessType: 'blob',
    });

    // Upload index.html to the storage container
    new StorageBlob(this, 'IndexFile', {
      name: 'index.html',
      storageAccountName: storageAccount.name,
      storageContainerName: container.name,
      type: 'Block',
      source: path.resolve(__dirname, 'website/index.html'),
      contentType: 'text/html', // Set Content-Type for HTML
    });

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

    // Create a CDN Profile
    const cdnProfile = new CdnProfile(this, 'CdnProfile', {
      name: 'mycdnprofile',
      resourceGroupName: resourceGroup.name,
      location: 'East US',  // Specify the Azure region for the CDN profile
      sku: 'Standard_Microsoft',
    });

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

    // Output the CDN endpoint domain name
    new TerraformOutput(this, 'CdnEndpointDomainName', {
      value: cdnEndpoint.name ,// hostName,
      description: 'The domain name of the CDN endpoint',
    });
  }
}