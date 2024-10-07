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

// Load environment variables from the .env file
const environmentVariable = dotenv.config();
console.log("environmentVariable===>", environmentVariable);

export class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

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

    // Create a resource group
    const resourceGroup = new ResourceGroup(this, "MyResourceGroup", {
      name: "my-resource-group",
      location: "East US", // Use the same location as your other resources
    });

    // Create a storage account
    const storageAccount = new StorageAccount(this, "StorageAccount", {
      name: "mystorageaccounthasan",
      resourceGroupName: resourceGroup.name, // Reference the resource group
      location: "East US", // Specify the Azure region for the storage account
      accountTier: "Standard",
      accountReplicationType: "LRS",
    });

    // Create a storage container
    const container = new StorageContainer(this, "StorageContainer", {
      name: "website",
      storageAccountName: storageAccount.name,
      containerAccessType: "blob",
    });

    const websiteFolder = path.resolve(__dirname, "website");
    uploadDirectory(websiteFolder, container, storageAccount);

    // Helper function to upload all files recursively from a directory
    function uploadDirectory(
      directory: string,
      container: StorageContainer,
      storageAccount: StorageAccount
    ) {
      const files = fs.readdirSync(directory);

      files.forEach((file) => {
        const filePath = path.resolve(directory, file);

        // Check if it's a directory, recursively upload its content
        if (fs.statSync(filePath).isDirectory()) {
          uploadDirectory(filePath, container, storageAccount);
        } else {
          // If it's a file, upload it
          const relativePath = path.relative(
            path.resolve(__dirname, "website"),
            filePath
          );
          const contentType = getContentType(file);

          new StorageBlob(container, relativePath.replace(/[\/\\]/g, "-"), {
            name: relativePath.split(path.sep).join("/"), // Use '/' as the separator for virtual directories in blob storage
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

    //   // Upload index.html to the storage container
    //   new StorageBlob(this, 'IndexFile', {
    //     name: 'index.html',
    //     storageAccountName: storageAccount.name,
    //     storageContainerName: container.name,
    //     type: 'Block',
    //     source: path.resolve(__dirname, 'website/index.html'),
    //     contentType: 'text/html', // Set Content-Type for HTML
    //   });

    //  //  Upload additional files (CSS, JS, etc.)
    //    const websiteFolder = path.resolve(__dirname, 'website');
    //   const files = fs.readdirSync(websiteFolder);

    //   files.forEach((file) => {
    //     if (file !== 'index.html') {
    //       const filePath = path.resolve(websiteFolder, file);

    //       if (fs.existsSync(filePath)) {
    //         const contentType = getContentType(file);
    //         new StorageBlob(this, file, {
    //           name: file,
    //           storageAccountName: storageAccount.name,
    //           storageContainerName: container.name,
    //           type: 'Block',
    //           source: filePath,
    //           contentType: contentType,
    //         });
    //       } else {
    //         console.error('File not found:', filePath);
    //       }
    //     }
    //   });

    // Function to get content type based on file extension
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
          return "application/octet-stream"; // Default type
      }
    }

    // Output the URL of the static website
    const staticWebsiteUrl = `https://${storageAccount.name}.blob.core.windows.net/${container.name}/index.html`;
    new TerraformOutput(this, "StaticWebsiteUrl", {
      value: staticWebsiteUrl,
      description: "The URL of the static website",
    });

    // Output the CDN endpoint domain name
    new TerraformOutput(this, "CdnEndpointDomainName", {
      value: storageAccount.name, // hostName,
      description: "The domain name of the CDN endpoint",
    });
  }
}
