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

// Load environment variables from the .env file
dotenv.config();

export class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const subscriptionId =
      process.env.ARM_SUBSCRIPTION_ID || "your-subscription-id";
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

    // Create a Resource Group
    const resourceGroup = new ResourceGroup(this, "ResourceGroup", {
      location: "Australia East",
      name: "cdktf-rg",
      tags: {
        environment: "Production",
      },
    });

    // ===========================VIRTUAL NETWORK AND SUBNET============================
    // ===========================VIRTUAL NETWORK AND SUBNET============================

    // Create a virtual network
    const virtualNetwork = new VirtualNetwork(this, "my-vnet", {
      name: "my-vnet",
      addressSpace: ["10.0.0.0/16"],
      location: resourceGroup.location,
      resourceGroupName: resourceGroup.name,
    });

    // Data source for existing subnet
    // Create a subnet
    const subnet = new Subnet(this, "my-subnet", {
      name: "default",
      resourceGroupName: resourceGroup.name,
      virtualNetworkName: virtualNetwork.name,
      addressPrefixes: ["10.0.1.0/24"],
    });

    // ===========================VIRTUAL NETWORK AND SUBNET============================
    // ===========================VIRTUAL NETWOR AND SUBNETK============================

    // Create a public IP address
    const publicIp = new PublicIp(this, "my-public-ip", {
      name: "my-public-ip",
      resourceGroupName: resourceGroup.name,
      location: resourceGroup.location,
      sku: "Standard",
      allocationMethod: "Static", // Change this to Static
      tags: {
        environment: "Production",
      },
    });

    //  ================================Security Group ================================
    //  ================================Security Group ================================

    // Create a Network Security Group
    const nsg = new NetworkSecurityGroup(this, "NSG", {
      name: "cdktf-nsg",
      location: resourceGroup.location,
      resourceGroupName: resourceGroup.name,
      securityRule: [
        {
          name: "Allow-SSH", // Security rule to allow SSH access
          priority: 1000,
          direction: "Inbound",
          access: "Allow",
          protocol: "Tcp",
          sourcePortRange: "*",
          destinationPortRange: "22", // SSH port
          sourceAddressPrefix: "*", // Adjust this for better security
          destinationAddressPrefix: "*",
        },
        {
          name: "Allow-HTTP", // Additional security rule to allow HTTP access (optional)
          priority: 1100,
          direction: "Inbound",
          access: "Allow",
          protocol: "Tcp",
          sourcePortRange: "*",
          destinationPortRange: "80", // HTTP port
          sourceAddressPrefix: "*", // Adjust this for better security
          destinationAddressPrefix: "*",
        },
        {
          name: "Allow-HTTPS",
          priority: 1200,
          direction: "Inbound",
          access: "Allow",
          protocol: "Tcp",
          sourcePortRange: "*",
          destinationPortRange: "443", // HTTPS port
          sourceAddressPrefix: "*", // Adjust this for better security
          destinationAddressPrefix: "*",
        },
      ],

      tags: {
        environment: "Production",
      },
    });

    new SubnetNetworkSecurityGroupAssociation(
      this,
      "my-security-group-association",
      {
        networkSecurityGroupId: nsg.id,
        subnetId: subnet.id,
      }
    );

    //  ================================Security Group ================================
    //  ================================Security Group ================================

    //  ================================NETWORK INTERFACE ================================
    //  =================================NETWORK INTERFACE ================================

    // Create a network interface
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

    //  ================================NETWORK INTERFACE ================================
    //  =================================NETWORK INTERFACE ================================

    //  ================================LINUX VIRTUAL MACHINE ================================
    //  =================================LINUX VIRTUAL MACHINE ================================

    // Create a Virtual Machine with System Assigned Identity
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
        adminPassword: "P@ssw0rd1234", // Use a secure password
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
        type: "SystemAssigned", // Enable system-assigned identity
      },
      zones: ["1"],

      tags: {
        environment: "Production",
      },
    });

    //  ================================LINUX VIRTUAL MACHINE ================================
    //  =================================LINUX VIRTUAL MACHINE ================================

    //  ================================BLOB STORAGE ================================
    //  =================================BLOB STORAGE ================================

    // Create a Storage Account
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

    //  ================================BLOB STORAGE ================================
    //  =================================BLOB STORAGE ================================

    //  ================================ASSIGN SYSTEM INDENTITY ROLE ================================
    //  =================================ASSIGN SYSTEM INDENTITY ROLE ================================

    // Assign Role to Managed Identity to access Blob Storage
    new RoleAssignment(this, "RoleAssignment", {
      roleDefinitionName: "Storage Blob Data Owner",
      scope: storageAccount.id, // Ensure this scope is correct
      principalId: vm.identity.principalId, // Use the VM's identity principalId
      dependsOn: [vm],
    });

    //  ================================ASSIGN SYSTEM INDENTITY ROLE ================================
    //  =================================ASSIGN SYSTEM INDENTITY ROLE ================================

    //  ================================OUTPUT ================================
    //  =================================OUTPUT ================================

    new TerraformOutput(this, "PublicIpOutput", {
      value: publicIp.ipAddress,
      description: "Public IP address of the Virtual Machine",
    });

    //  ================================OUTPUT ================================
    //  =================================OUTPUT ================================
  }
}
