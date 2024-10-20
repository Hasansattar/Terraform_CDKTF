This code defines a **Terraform CDK (Cloud Development Kit)** stack using TypeScript to deploy infrastructure resources in Microsoft Azure. It utilizes the AzureRM provider and provisions resources like virtual networks, subnets, network interfaces, virtual machines, security groups, and storage accounts. Here’s a breakdown of each section:

### 1. Import Statements
```typescript
import { Construct } from "constructs";
import {
  TerraformStack,
  TerraformAsset,
  AssetType,
  TerraformOutput,
} from "cdktf";
import { AzurermProvider } from "@cdktf/provider-azurerm/lib/provider";
import { ResourceGroup } from "@cdktf/provider-azurerm/lib/resource-group";

import { VirtualNetwork } from "@cdktf/provider-azurerm/lib/virtual-network";
import { Subnet } from "@cdktf/provider-azurerm/lib/subnet";
import { VirtualMachine } from "@cdktf/provider-azurerm/lib/virtual-machine";
import { PublicIp } from "@cdktf/provider-azurerm/lib/public-ip";

import { NetworkInterface } from "@cdktf/provider-azurerm/lib/network-interface";
import { NetworkSecurityGroup } from "@cdktf/provider-azurerm/lib/network-security-group";
import { SubnetNetworkSecurityGroupAssociation } from "@cdktf/provider-azurerm/lib/subnet-network-security-group-association";

import { StorageAccount } from "@cdktf/provider-azurerm/lib/storage-account";
import { StorageBlob } from "@cdktf/provider-azurerm/lib/storage-blob";
import { StorageContainer } from "@cdktf/provider-azurerm/lib/storage-container";
import { RoleAssignment } from "@cdktf/provider-azurerm/lib/role-assignment";
import * as dotenv from "dotenv";
import * as path from "path";


```

Here you import several modules:

- **constructs**: The base class for defining infrastructure in CDK.
- **cdktf**: The Terraform CDK library for creating stacks, assets, and outputs.
- **provider-azurerm**: Azure Resource Manager (AzureRM) provider for creating Azure resources like Virtual Networks, Virtual Machines, Storage Accounts, and so on.
- **dotenv**: Used to load environment variables from a .env file.
- **path**: Used for working with file and directory paths.



### 2. Azure Provider Configuration
```typescript
    const subscriptionId = process.env.ARM_SUBSCRIPTION_ID || "your-subscription-id";
    const clientId = process.env.ARM_CLIENT_ID || "your-client-id";
    const clientSecret = process.env.ARM_CLIENT_SECRET || "your-client-secret";
    const tenantId = process.env.ARM_TENANT_ID || "your-tenant-id";

    new AzurermProvider(this, "AzureRM", {
      features: [{}],
      subscriptionId: subscriptionId,
      clientId: clientId,
      clientSecret: clientSecret,
      tenantId: tenantId,
    });


```
This part configures the Azure provider by pulling credentials and settings from environment variables. The AzurermProvider is responsible for creating Azure resources.



### 3. Resource Group
```typescript
    const resourceGroup = new ResourceGroup(this, "ResourceGroup", {
      location: "Australia East",
      name: "cdktf-rg",
      tags: {
        environment: "Production",
      },
    });


```
Creates a Resource Group in the Azure region Australia East and assigns a tag environment: Production. The resource group is a container that holds related Azure resources.




### 4. Virtual Network and Subnet
```typescript
    const virtualNetwork = new VirtualNetwork(this, "my-vnet", {
      name: "my-vnet",
      addressSpace: ["10.0.0.0/16"],
      location: resourceGroup.location,
      resourceGroupName: resourceGroup.name,
    });

    const subnet = new Subnet(this, "my-subnet", {
      name: "default",
      resourceGroupName: resourceGroup.name,
      virtualNetworkName: virtualNetwork.name,
      addressPrefixes: ["10.0.1.0/24"],
    });


```
- A **Virtual Network (VNet)** is created with the address space ``10.0.0.0/16``.
- A **Subnet** is created within the VNet with the address range `10.0.1.0/24`.




### 5. Public IP
```typescript
    const publicIp = new PublicIp(this, "my-public-ip", {
      name: "my-public-ip",
      resourceGroupName: resourceGroup.name,
      location: resourceGroup.location,
      sku: "Standard",
      allocationMethod: "Static",
      tags: {
        environment: "Production",
      },
    });


```

Creates a **Public IP Address** that is associated with the virtual machine. The allocation method is set to Static, meaning the public IP address won't change.




### 6. Network Security Group
```typescript
    const nsg = new NetworkSecurityGroup(this, "NSG", {
      name: "cdktf-nsg",
      location: resourceGroup.location,
      resourceGroupName: resourceGroup.name,
      securityRule: [
        {
          name: "Allow-SSH",
          priority: 1000,
          direction: "Inbound",
          access: "Allow",
          protocol: "Tcp",
          sourcePortRange: "*",
          destinationPortRange: "22",
          sourceAddressPrefix: "*",
          destinationAddressPrefix: "*",
        },
        {
          name: "Allow-HTTP",
          priority: 1100,
          direction: "Inbound",
          access: "Allow",
          protocol: "Tcp",
          sourcePortRange: "*",
          destinationPortRange: "80",
          sourceAddressPrefix: "*",
          destinationAddressPrefix: "*",
        },
        {
          name: "Allow-HTTPS",
          priority: 1200,
          direction: "Inbound",
          access: "Allow",
          protocol: "Tcp",
          sourcePortRange: "*",
          destinationPortRange: "443",
          sourceAddressPrefix: "*",
          destinationAddressPrefix: "*",
        },
      ],
      tags: {
        environment: "Production",
      },
    });


```
Defines a **Network Security Group (NSG)** with security rules to allow SSH (port 22), HTTP (port 80), and HTTPS (port 443) traffic.




### 7. Subnet-Network Security Group Association
```typescript
    new SubnetNetworkSecurityGroupAssociation(this, "my-security-group-association", {
      networkSecurityGroupId: nsg.id,
      subnetId: subnet.id,
    });


```
Associates the NSG with the previously created subnet.



### 8. Network Interface
```typescript
    const networkInterface = new NetworkInterface(this, "my-nic", {
      name: "my-nic",
      location: resourceGroup.location,
      resourceGroupName: resourceGroup.name,
      ipConfiguration: [
        {
          name: "my-ip-config",
          subnetId: subnet.id,
          privateIpAddressAllocation: "Dynamic",
          publicIpAddressId: publicIp.id,
        },
      ],
      tags: {
        environment: "Production",
      },
    });


```
Creates a **Network Interface** and associates it with the subnet and public IP. The IP allocation is dynamic, meaning the private IP is automatically assigned.




### 8. Virtual Machine
```typescript
    const vm = new VirtualMachine(this, "my-vm", {
      name: "my-vm",
      location: resourceGroup.location,
      resourceGroupName: resourceGroup.name,
      networkInterfaceIds: [networkInterface.id],
      vmSize: "Standard_B1s",
      deleteOsDiskOnTermination: true,
      osProfile: {
        computerName: "hostname",
        adminUsername: "adminuser",
        adminPassword: "P@ssw0rd1234",
      },
      osProfileLinuxConfig: {
        disablePasswordAuthentication: false,
      },
      storageOsDisk: {
        name: "my-os-disk",
        caching: "ReadWrite",
        createOption: "FromImage",
      },
      storageImageReference: {
        publisher: "Canonical",
        offer: "UbuntuServer",
        sku: "18.04-LTS",
        version: "latest",
      },
      identity: {
        type: "SystemAssigned",
      },
      zones: ["1"],
      tags: {
        environment: "Production",
      },
    });


```

Creates a Linux Virtual Machine (VM):

- Uses the Ubuntu 18.04 image.
- Allocates the VM a dynamic IP address.
- Configures the VM with SSH access.
- System-assigned identity is enabled for the VM.




### 9.  Creating a Storage Account and Blob
```typescript
const storageAccount = new StorageAccount(this, "StorageAccount", {
      name: "cdktfstorageacct",
      resourceGroupName: resourceGroup.name,
      location: resourceGroup.location,
      accountTier: "Standard",
      accountReplicationType: "LRS",
      tags: {
        environment: "Production",
      },
    });



  // Create a Blob Storage Container
    const container = new StorageContainer(this, "StorageContainer", {
      name: "cdktfcontainer",
      storageAccountName: storageAccount.name,
      containerAccessType: "container",
    });


 // // Upload a file to Blob Storage
    const file = new TerraformAsset(this, "BlobFile", {
      path: path.resolve(__dirname, "testing.txt"), // Ensure the path is correct
      type: AssetType.FILE,
    });

    new StorageBlob(this, "StorageBlob", {
      name: "myblob.txt", // Ensure the name ends with .txt
      storageAccountName: storageAccount.name,
      storageContainerName: container.name,
      type: "Block",
      source: file.path,
    });

    console.log("file.path", file.path);

```

- A storage account (cdktftestsa) is created in the resource group.
- A private container (testcontainer) is created within the storage account.
- A storage blob (myblob) is uploaded from a local file myfile.txt.




### 10.
```typescript
   // Assign Role to Managed Identity to access Blob Storage
    new RoleAssignment(this, "RoleAssignment", {
      roleDefinitionName: "Storage Blob Data Owner",
      scope: storageAccount.id, // Ensure this scope is correct
      principalId: vm.identity.principalId, // Use the VM's identity principalId
      dependsOn: [vm],
    });

```
The virtual machine's system-assigned identity is granted the Storage Blob Data Owner role, allowing the VM to manage blob storage in the Storage Account.




### 13.
```typescript
  new TerraformOutput(this, "PublicIpOutput", {
      value: publicIp.ipAddress,
      description: "Public IP address of the Virtual Machine",
    });

```


The public IP address of the VM is outputted for reference after deployment, making it easy to connect to the VM.


# Summary 
This code demonstrates how to set up Azure infrastructure using Terraform CDK in TypeScript. The stack provisions a virtual network, security group, virtual machine, public IP, storage account, and blob storage, all managed under a single resource group. It also shows how to use system-assigned identities to assign roles for secure access to resources like blob storage.






## Testing the stack code using these commands on virtual machine to get data into blob storage using Virtual Machine

## Commands to access Blob from the Virtual Machine

####   Fetch the access token

```bash
access_token=$(curl 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fstorage.azure.com%2F' -H Metadata:true | jq -r '.access_token')
```

#### Access the blob from Virtual Machine

```bash
curl "https://$storage_account_name.blob.core.windows.net/$container_name/$blob_name" -H "x-ms-version: 2017-11-09" -H "Authorization: Bearer $access_token"
```







# Azure Role Assignment and Permissions for Terraform

## Overview

When deploying resources using Terraform on Azure, it is essential to ensure that your Service Principal has the necessary permissions to create and manage resources. This document provides steps to check and assign the required roles in the Azure Portal.

## Steps to Check and Assign Permissions

### 1. Access the Azure Portal
- Go to the [Azure Portal](https://portal.azure.com).

### 2. Navigate to the Subscription
- On the left sidebar, click on **Subscriptions**.
- Select the subscription you are working with to access the subscription overview page.

### 3. Check Role Assignments
- In the subscription overview page, look for the **Access control (IAM)** section in the left sidebar and click on it.
- Click on the **Role assignments** tab. This section lists all users, groups, and service principals assigned roles within the subscription.

### 4. Identify Your Service Principal
- Look for your service principal (e.g., `cdktf-terraform-sp` or `myServicePrincipal`) in the list.
- Ensure it has the necessary roles, which may include:
  - **Owner**
  - **User Access Administrator**
  - **Contributor** (may not be sufficient for role assignments)

### 5. Assign Required Roles (if necessary)
- If the service principal does not have the required permissions:
  - Click on **+ Add** > **Add role assignment** at the top.
  - In the **Role** dropdown, select **Owner** or **User Access Administrator**.
  - In the **Assign access to** dropdown, select **Azure AD user, group, or service principal**.
  - Search for your service principal name (e.g., `cdktf-terraform-sp`).
  - Select it, then click **Save** to assign the role.

### 6. Verify Role Scope
- Ensure that the role assignment is at the correct scope. Ideally, the role should be assigned at the subscription level or at least at the resource group level if that’s where you are creating resources.

### 7. Refresh Credentials
- After assigning the role, wait a few minutes for the changes to take effect. You may also want to log out and log back in to the Azure CLI or refresh the credentials if you’re using a service principal in Terraform.

## Example Role Assignment

Here’s how your role assignment might look after verifying or modifying it:

| Name                     | Type              | Role                          | Scope                              |
|--------------------------|-------------------|-------------------------------|------------------------------------|
| Muhammad Hassan Sattar   | User              | Owner                         | This subscription                  |
| cdktf-terraform-sp       | Service Principal  | Owner                         | This subscription                  |
| myServicePrincipal        | Service Principal  | User Access Administrator      | This subscription                  |

## Conclusion
After ensuring your service principal has the necessary roles, re-run your Terraform script. If you still encounter issues, check the specific error messages for further guidance. For additional assistance, feel free to reach out.
