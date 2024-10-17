import { TerraformStack, TerraformOutput } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Construct } from "constructs";

import { LambdaFunction } from "@cdktf/provider-aws/lib/lambda-function";
import { LambdaLayerVersion } from "@cdktf/provider-aws/lib/lambda-layer-version";
import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
import { IamPolicy } from "@cdktf/provider-aws/lib/iam-policy";
import { IamPolicyAttachment } from "@cdktf/provider-aws/lib/iam-policy-attachment";
import { LambdaPermission } from "@cdktf/provider-aws/lib/lambda-permission";

import { ApiGatewayRestApi } from "@cdktf/provider-aws/lib/api-gateway-rest-api";
import { ApiGatewayResource } from "@cdktf/provider-aws/lib/api-gateway-resource";
import { ApiGatewayIntegration } from "@cdktf/provider-aws/lib/api-gateway-integration";
import { ApiGatewayMethod } from "@cdktf/provider-aws/lib/api-gateway-method";
import { CloudwatchEventRule } from "@cdktf/provider-aws/lib/cloudwatch-event-rule";
import { CloudwatchEventTarget } from "@cdktf/provider-aws/lib/cloudwatch-event-target";


import * as path from "path";

export class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // AWS Provider
    new AwsProvider(this, "AWS", {
      region: "us-east-1", // Use your desired region
    });

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
    // ======================== Lambda Role - END =======================

    // ======================== Lambda Function - START =======================
    // Create the Lambda layer version
    const myLayer = new LambdaLayerVersion(this, "MyLambdaLayer", {
      layerName: "my-lambda-layer",
      compatibleRuntimes: ["nodejs18.x"], // Specify compatible runtimes
      filename: path.resolve(__dirname, "../Lambda/my-layer/my-layers.zip"), // Path to your zipped layer code
      description: "A shared Lambda layer with dependencies",
    });

    const producerLambda = new LambdaFunction(this, "ProducerLambda", {
      functionName: "producerLambda",
      handler: "producer.handler", // Change as per your handler
      runtime: "nodejs18.x", // Use your desired Node.js version
      role: lambdaRole.arn,
      filename: path.resolve(__dirname, "../Lambda/producer/producer.zip"),
      layers: [myLayer.arn], // Attach Lambda Layer here
    });

    const consumerLambda = new LambdaFunction(this, "consumerLambda", {
      functionName: "consumerLambda",
      handler: "consumer.handler",
      runtime: "nodejs18.x",
      role: lambdaRole.arn,
      filename: path.join(__dirname, "../lambda/consumer/consumer.zip"), // Ensure you zip your Lambda code and point to the zip file
      layers: [myLayer.arn], // Attach Lambda Layer here
    });

    // ======================== Lambda Function - END =======================

    // ======================== API Gateway - START =======================

    // API Gateway
    const apiGateway = new ApiGatewayRestApi(this, "testApi", {
      name: "TestApi",
      description: "API to send custom events",
    });

    const apiRoot = new ApiGatewayResource(this, "Root", {
      parentId: apiGateway.rootResourceId, // Specify root resource as the parent
      restApiId: apiGateway.id,
      pathPart: "events", // Path segment for the resource
    });

    // Create a POST method for the "/events" resource
    const postMethod = new ApiGatewayMethod(this, "PostMethod", {
      restApiId: apiGateway.id,
      resourceId: apiRoot.id,
      httpMethod: "POST",
      authorization: "NONE",
    });

    // Create Lambda integration for the POST method
    new ApiGatewayIntegration(this, "PostMethodIntegration", {
      restApiId: apiGateway.id,
      resourceId: apiRoot.id,
      httpMethod: postMethod.httpMethod, // Match the method for the integration
      integrationHttpMethod: "POST", // HTTP method for the Lambda function integration
      type: "AWS_PROXY", // AWS_PROXY is used for Lambda proxy integration
      uri: producerLambda.invokeArn, // URI for invoking the Lambda function
    });

    // ======================== API Gateway - START =======================

    // Add permission for API Gateway to invoke the Lambda function
    new LambdaPermission(this, "AllowApiGatewayInvoke", {
      action: "lambda:InvokeFunction",
      functionName: producerLambda.functionName,
      principal: "apigateway.amazonaws.com",
      sourceArn: `${apiGateway.executionArn}/*`,
    });

    //  ===================================EVENTS =====================================

    // CloudWatch Event Rule (EventBridge equivalent) for filtering and targeting consumer Lambda
    const eventRule = new CloudwatchEventRule(this, "orderPKRule", {
      name: "orderPKRule",
      description: "Filter events from customAPI and trigger consumer Lambda",
      eventPattern: JSON.stringify({
        source: ["customAPI"],
        detail: {
          country: ["PK"], // Event filtering rule
        },
      }),
    });

    // Target: the consumer Lambda function for the event rule
    new CloudwatchEventTarget(this, "orderPKLambdaTarget", {
      rule: eventRule.name,
      arn: consumerLambda.arn,
      targetId: "TargetFunction",
    });

    //  ===================================EVENTS =====================================

    // Add permission for EventBridge to invoke the consumer Lambda
    new LambdaPermission(this, "ConsumerLambdaPermission", {
      action: "lambda:InvokeFunction",
      functionName: consumerLambda.functionName,
      principal: "events.amazonaws.com",
      sourceArn: eventRule.arn,
    });

    // Output for Producer Lambda ARN
    new TerraformOutput(this, "ProducerLambdaArn", {
      value: producerLambda.arn,
    });

    // Output for Consumer Lambda ARN
    new TerraformOutput(this, "ConsumerLambdaArn", {
      value: consumerLambda.arn,
    });

    // Output for API Gateway URL
    new TerraformOutput(this, "ApiGatewayUrl", {
      value: apiGateway.executionArn, // Use executionArn to get API Gateway URL
    });

    // Output for EventBridge Rule ARN
    new TerraformOutput(this, "EventBridgeRuleArn", {
      value: eventRule.arn,
    });
  }
}
