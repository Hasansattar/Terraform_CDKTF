
Terraform stack defined using the CDK for Terraform (CDKTF) that sets up various AWS resources, including Lambda functions, an API Gateway, IAM roles and policies, and CloudWatch events. Below is a detailed breakdown of the code, explaining each section and its purpose step by step.


### 1. Imports

```typescript
import { TerraformStack, TerraformOutput } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Construct } from "constructs";

// Lambda-related imports
import { LambdaFunction } from "@cdktf/provider-aws/lib/lambda-function";
import { LambdaLayerVersion } from "@cdktf/provider-aws/lib/lambda-layer-version";
import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
import { IamPolicy } from "@cdktf/provider-aws/lib/iam-policy";
import { IamPolicyAttachment } from "@cdktf/provider-aws/lib/iam-policy-attachment";
import { LambdaPermission } from "@cdktf/provider-aws/lib/lambda-permission";

// API Gateway imports
import { ApiGatewayRestApi } from "@cdktf/provider-aws/lib/api-gateway-rest-api";
import { ApiGatewayResource } from "@cdktf/provider-aws/lib/api-gateway-resource";
import { ApiGatewayIntegration } from "@cdktf/provider-aws/lib/api-gateway-integration";
import { ApiGatewayMethod } from "@cdktf/provider-aws/lib/api-gateway-method";

// CloudWatch imports
import { CloudwatchEventRule } from "@cdktf/provider-aws/lib/cloudwatch-event-rule";
import { CloudwatchEventTarget } from "@cdktf/provider-aws/lib/cloudwatch-event-target";

// Node.js path module
import * as path from "path";

```

- **TerraformStack**: This is the base class for creating a Terraform stack.
- **AwsProvider**: This is used to configure the AWS provider, allowing you to create AWS resources.
- **Construct**: This is a base class for defining constructs, which are basic building blocks for creating AWS resources.
- The imports for Lambda, **API Gateway**, and **CloudWatch** components allow the creation and management of these specific AWS services.


### 2. IAM Role and Policies for Lambda

```typescript
    // ======================== Lambda Role - START =======================
    const lambdaRole = new IamRole(this, "LambdaExecutionRole", {
      name: "LambdaExecutionRole",
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "lambda.amazonaws.com",
            },
            Action: "sts:AssumeRole",
          },
        ],
      }),
    });

```

- **IamRole**: Creates an IAM role named LambdaExecutionRole that the Lambda functions can assume. The assumeRolePolicy allows AWS Lambda to assume this role.



```typescript
    const lambdaPolicy = new IamPolicy(this, "LambdaPolicy", {
      name: "LambdaPolicy",
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents",
            ],
            Resource: "*",
          },
        ],
      }),
    });

```
- **IamPolicy**: Defines a policy allowing the Lambda functions to write logs to CloudWatch (create log groups, streams, and put log events).

```typescript
    const eventBridgePolicy = new IamPolicy(
      this,
      "EventBridgePutEventsPolicy",
      {
        name: "EventBridgePutEventsPolicy",
        policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: "events:PutEvents",
              Resource:
                "arn:aws:events:us-east-1:104722613836:event-bus/default",
            },
          ],
        }),
      }
    );

```

- **eventBridgePolicy**: Creates a policy that allows the Lambda function to put events into the specified EventBridge event bus.


```typescript
    // Attach the policy to the Lambda execution role
    new IamPolicyAttachment(this, "AttachEventBridgePolicy", {
      name: "attachEventBridgePolicy",
      policyArn: eventBridgePolicy.arn,
      roles: [lambdaRole.name],
    });

    new IamPolicyAttachment(this, "LambdaPolicyAttachment", {
      name: "LambdaPolicyAttachment",
      policyArn: lambdaPolicy.arn,
      roles: [lambdaRole.name],
    });

```
- **IamPolicyAttachment**: Attaches both the EventBridgePutEventsPolicy and LambdaPolicy to the LambdaExecutionRole, enabling the role to perform the actions defined in the policies.



### 3. Lambda Functions

```typescript
    // ======================== Lambda Function - START =======================
    const myLayer = new LambdaLayerVersion(this, "MyLambdaLayer", {
      layerName: "my-lambda-layer",
      compatibleRuntimes: ["nodejs18.x"],
      filename: path.resolve(__dirname, "../Lambda/my-layer/my-layers.zip"),
      description: "A shared Lambda layer with dependencies",
    });

```
LambdaLayerVersion: Creates a Lambda layer named my-lambda-layer, which can be used by Lambda functions to include common dependencies.


```typescript
    const producerLambda = new LambdaFunction(this, "ProducerLambda", {
      functionName: "producerLambda",
      handler: "producer.handler",
      runtime: "nodejs18.x",
      role: lambdaRole.arn,
      filename: path.resolve(__dirname, "../Lambda/producer/producer.zip"),
      layers: [myLayer.arn],
    });

    const consumerLambda = new LambdaFunction(this, "consumerLambda", {
      functionName: "consumerLambda",
      handler: "consumer.handler",
      runtime: "nodejs18.x",
      role: lambdaRole.arn,
      filename: path.join(__dirname, "../lambda/consumer/consumer.zip"),
      layers: [myLayer.arn],
    });

```

- **LambdaFunction**: Defines two Lambda functions, ProducerLambda and ConsumerLambda, specifying their handlers, runtime environment, role, and the code files they will run.


### 4. API Gateway Setup

```typescript
    // ======================== API Gateway - START =======================
    const apiGateway = new ApiGatewayRestApi(this, "testApi", {
      name: "TestApi",
      description: "API to send custom events",
    });

    const apiRoot = new ApiGatewayResource(this, "Root", {
      parentId: apiGateway.rootResourceId,
      restApiId: apiGateway.id,
      pathPart: "events",
    });

```

- **ApiGatewayRestApi**: Creates a new API Gateway named TestApi.
- **ApiGatewayResource**: Adds a resource under the API for the path /events.


```typescript
    const postMethod = new ApiGatewayMethod(this, "PostMethod", {
      restApiId: apiGateway.id,
      resourceId: apiRoot.id,
      httpMethod: "POST",
      authorization: "NONE",
    });

```
ApiGatewayMethod: Defines a POST method for the /events resource, allowing clients to send HTTP POST requests.


```typescript
    new ApiGatewayIntegration(this, "PostMethodIntegration", {
      restApiId: apiGateway.id,
      resourceId: apiRoot.id,
      httpMethod: postMethod.httpMethod,
      integrationHttpMethod: "POST",
      type: "AWS_PROXY",
      uri: producerLambda.invokeArn,
    });

```
- **ApiGatewayIntegration**: Integrates the POST method with the ProducerLambda function using AWS proxy integration, allowing the API Gateway to directly invoke the Lambda function with the incoming request.


### 5. Permissions for API Gateway

```typescript
    // Add permission for API Gateway to invoke the Lambda function
    new LambdaPermission(this, "AllowApiGatewayInvoke", {
      action: "lambda:InvokeFunction",
      functionName: producerLambda.functionName,
      principal: "apigateway.amazonaws.com",
      sourceArn: `${apiGateway.executionArn}/*`,
    });

```
- **LambdaPermission**: Grants the API Gateway permission to invoke the ProducerLambda function.


### 5. CloudWatch Events Setup

```typescript
    // ===================================EVENTS =====================================
    const eventRule = new CloudwatchEventRule(this, "orderPKRule", {
      name: "orderPKRule",
      description: "Filter events from customAPI and trigger consumer Lambda",
      eventPattern: JSON.stringify({
        source: ["customAPI"],
        detail: {
          country: ["PK"],
        },
      }),
    });

```
- **CloudwatchEventRule**: Creates a CloudWatch Event Rule that filters incoming events from the source customAPI with a specific detail matching the country code PK.


```typescript
    // Target: the consumer Lambda function for the event rule
    new CloudwatchEventTarget(this, "orderPKTarget", {
      rule: eventRule.name,
      targetId: "consumerLambdaTarget",
      arn: consumerLambda.arn,
    });

```
- **CloudwatchEventTarget**: Specifies that the ``ConsumerLambda`` should be invoked whenever an event matches the criteria defined in the ``orderPKRule``.


### 6.  Outputs

```typescript
    // Outputs
    new TerraformOutput(this, "ApiGatewayUrl", {
      value: apiGateway.invokeUrl,
      description: "The URL of the API Gateway",
    });

```
TerraformOutput: Outputs the URL of the API Gateway after deployment, allowing easy access to the newly created endpoint.


# Summary

This TypeScript code utilizes the CDK for Terraform to create a serverless architecture on AWS, involving:


- **IAM Roles and Policies**: Setting up permissions for Lambda functions.
- **Lambda Functions**: Two Lambda functions (Producer and Consumer) for processing events.
- **API Gateway**: Exposing a RESTful API that invokes the Producer Lambda.
- **CloudWatch Events**: Filtering events and triggering the Consumer Lambda based on specified criteria.


