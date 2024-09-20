The directory structure in Terraform CDKTF (Cloud Development Kit for Terraform) and AWS CDK (Cloud Development Kit) share similarities because both are code-first IaC tools. However, they differ primarily due to the underlying infrastructure they target and their state management systems. Let's explore the typical directory structure for both:

# 1. AWS CDK (with TypeScript)
AWS CDK is primarily for AWS infrastructure and uses CloudFormation to provision resources.

```python
my-aws-cdk-project/
│
├── bin/
│   └── my-app.ts                # Entry point of the CDK app
│
├── lib/
│   └── my-app-stack.ts           # AWS CDK Stack with resource definitions
│
├── cdk.out/                      # CloudFormation templates synthesized by CDK (auto-generated)
│
├── node_modules/                 # Dependencies installed via npm/yarn (auto-generated)
│
├── test/
│   └── my-app.test.ts            # Unit tests for the CDK stacks
│
├── .gitignore                    # Files to ignore in Git (e.g., node_modules, cdk.out)
├── cdk.json                      # Configuration for AWS CDK
├── package.json                  # Project dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── jest.config.js                # Jest testing configuration
└── README.md                     # Project documentation

```

**Key Directories and Files:**
- **bin/:** Contains the entry point for the AWS CDK app. Here, you instantiate your CDK stacks.
- **lib/:** Contains the CDK stack definitions. This is where you define AWS resources (e.g., S3, Lambda, DynamoDB) in TypeScript.
- **cdk.out/:** Generated CloudFormation templates that AWS CDK creates when synthesizing the infrastructure.
- **cdk.json:** Configuration file for the AWS CDK CLI.
- **test/:** Optional folder where unit tests for CDK code can be written.


# 2. Terraform CDKTF (with TypeScript)
Terraform CDKTF targets a cloud-agnostic approach and uses the Terraform engine to provision infrastructure.



```python
my-terraform-cdk-project/
│
├── cdktf.out/                    # Terraform JSON config files generated (auto-generated)
│
├── main.ts                       # Entry point where the CDKTF app is defined
│
├── stacks/
│   └── my-stack.ts               # CDKTF Stack defining resources
│
├── node_modules/                 # Dependencies installed via npm/yarn (auto-generated)
│
├── .gen/                         # Generated Terraform provider bindings (auto-generated)
│
├── .gitignore                    # Files to ignore in Git (e.g., node_modules, cdktf.out)
├── cdktf.json                    # Configuration for CDKTF
├── package.json                  # Project dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── jest.config.js                # Jest testing configuration
└── README.md                     # Project documentation

```
**Key Directories and Files:**

- **cdktf.out/:** Contains the synthesized Terraform JSON configuration files that CDKTF generates before deploying with the Terraform engine.
- **main.ts:** Entry point for defining the Terraform app and instantiating the stacks.
- **stacks/:** Contains your CDKTF stack definitions. These stacks define cloud resources in TypeScript, but they will be deployed using Terraform.
- **.gen/:** Auto-generated bindings for Terraform providers. When you use CDKTF, it pulls in the required Terraform providers and creates bindings for them.
- **cdktf.json:** CDKTF-specific configuration for running and synthesizing infrastructure.

******************************************

## **Key Differences in Directory Structure:**


#### 1. State Management & Output:
- **AWS CDK:** Generates CloudFormation templates in the **cdk.out/** directory.
- **CDKTF:** Generates Terraform JSON configurations in the **cdktf.out/** directory.



#### 2. Entry Points and App Definition:

- **AWS CDK:** The entry point for the app is typically found in the **bin/** directory, where the CDK stacks are instantiated.
- **CDKTF:** The entry point for CDKTF apps is usually a **main.ts** file, which initializes the app and adds CDKTF stacks.


#### 3. Provider Bindings:
- **AWS CDK:** Directly uses AWS-specific constructs and does not need to generate provider bindings.
- **CDKTF:** Uses Terraform providers, so it generates provider bindings in the **.gen/** folder for accessing Terraform resources.


#### 4. Backend for Deployment:
- **AWS CDK:** Deploys using AWS CloudFormation.
- **CDKTF:** Deploys using Terraform CLI or Terraform Cloud.

#### 5. Configuration Files:
- **AWS CDK:** Uses **cdk.json** for CDK configuration, while the CloudFormation templates are generated under **cdk.out/**.
- **CDKTF:** Uses **cdktf.json** for configuration, and the Terraform JSON configs are generated under **cdktf.out/**

*****************************************
*************************


Here's a simple example of a **Terraform CDKTF** project written in TypeScript that provisions an **AWS S3 bucket**. It follows the directory structure outlined earlier.

**Step 1: Initialize a Terraform CDKTF Project**
You can initialize a CDKTF project using the following command:

```bash
cdktf init --template="typescript"

```
This creates the basic directory structure and installs the necessary dependencies for your Terraform CDKTF project.

**Step 2: Directory Structure**

The structure will be as follows:

```python
my-terraform-cdk-project/
│
├── cdktf.out/                    # Auto-generated Terraform config (after cdktf synth)
├── main.ts                       # Entry point of the CDKTF app
├── stacks/
│   └── my-stack.ts               # CDKTF stack defining AWS resources
├── .gen/                         # Auto-generated Terraform provider bindings (after cdktf synth)
├── node_modules/                 # Auto-generated by npm/yarn
├── .gitignore                    # Files to ignore in Git
├── cdktf.json                    # CDKTF-specific configuration
├── package.json                  # Project dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # Project documentation

```

**Step 3: Code Sample**

``main.ts``

This is the entry point of the application, where you define and instantiate your Terraform stack.

```typescript
import { App } from "cdktf";
import { MyStack } from "./stacks/my-stack";

// Create an instance of the CDKTF App
const app = new App();

// Instantiate the stack
new MyStack(app, "MyCDKTFStack");

// Synthesize the stack into Terraform JSON configuration files
app.synth();

```

``stacks/my-stack.ts``

This file defines a CDKTF stack. In this example, the stack provisions an AWS S3 bucket.

```typescript
import { Construct } from "constructs";
import { TerraformStack } from "cdktf";
import { AwsProvider, s3 } from "@cdktf/provider-aws";

// Define a custom stack class extending TerraformStack
export class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Configure the AWS Provider for Terraform
    new AwsProvider(this, "AWS", {
      region: "us-east-1", // You can change this to your desired AWS region
    });

    // Define an S3 bucket
    new s3.S3Bucket(this, "MyBucket", {
      bucket: "my-cdktf-sample-bucket",  // Replace with a unique bucket name
      acl: "private",                    // Define bucket access level (private, public-read, etc.)
    });
  }
}

```

**Step 4: Configuration Files**

``cdktf.json``

This file contains the configuration for the Terraform CDK. It specifies the language, output directory, and more.

```json
{
  "language": "typescript",
  "app": "ts-node main.ts",
  "terraformProviders": ["aws@~> 4.0"],
  "terraformModules": [],
  "context": {
    "excludeStackIdFromLogicalIds": "true",
    "allowSepCharsInLogicalIds": "true"
  }
}

``` 

``package.json``

This file defines the project dependencies, scripts, and configuration for the TypeScript CDKTF project.

```json
{
  "name": "step00_hello_cdktf",
  "version": "1.0.0",
  "main": "main.js",
  "types": "main.ts",
  "license": "MPL-2.0",
  "private": true,
  "scripts": {
    "get": "cdktf get",
    "build": "tsc",
    "synth": "cdktf synth",
    "compile": "tsc --pretty",
    "watch": "tsc -w",
    "test": "jest",
    "test:watch": "jest --watch",
    "upgrade": "npm i cdktf@latest cdktf-cli@latest",
    "upgrade:next": "npm i cdktf@next cdktf-cli@next"
  },
  "engines": {
    "node": ">=18.0"
  },
  "dependencies": {
    "@cdktf/provider-aws": "^19.33.0", 
    "cdktf": "^0.20.8",
    "constructs": "^10.3.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.13",
    "@types/node": "^22.5.5",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "ts-node": "^10.9.2",
    "typescript": "^5.6.2"
  }
}

```

**Step 5: Deploy the Infrastructure**

Install Dependencies: Run the following command to install the required dependencies:

```bash
npm install

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
