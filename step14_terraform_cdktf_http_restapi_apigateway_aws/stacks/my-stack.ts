import { TerraformStack, TerraformOutput } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Construct } from "constructs";
import { Apigatewayv2Api } from "@cdktf/provider-aws/lib/apigatewayv2-api";
import { Apigatewayv2Integration  } from "@cdktf/provider-aws/lib/apigatewayv2-integration";
import { Apigatewayv2Route } from "@cdktf/provider-aws/lib/apigatewayv2-route";
import { Apigatewayv2Stage } from "@cdktf/provider-aws/lib/apigatewayv2-stage";
import { LambdaFunction } from "@cdktf/provider-aws/lib/lambda-function";
import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
import { IamPolicy } from "@cdktf/provider-aws/lib/iam-policy";
import { IamPolicyAttachment } from "@cdktf/provider-aws/lib/iam-policy-attachment";
import {LambdaPermission} from "@cdktf/provider-aws/lib/lambda-permission";
import { CloudwatchLogGroup } from "@cdktf/provider-aws/lib/cloudwatch-log-group";
//import * as fs from "fs";
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
              "lambda:InvokeFunction", // Add permissions for Lambda
            ],
            Resource: "*",
          },
        ],
      }),
    });

    new IamPolicyAttachment(this, "LambdaPolicyAttachment", {
      name: "LambdaPolicyAttachment",
      policyArn: lambdaPolicy.arn,
      roles: [lambdaRole.name],
    });
    // ======================== Lambda Role - END =======================

    // ======================== Lambda Function - START =======================
    const todoLambda = new LambdaFunction(this, "TodoLambdaFunction", {
      functionName: "TodoLambdaFunction",
      handler: "index.handler", // Change as per your handler
      runtime: "nodejs18.x", // Use your desired Node.js version
      role: lambdaRole.arn,
      filename: path.resolve(__dirname, "../Lambda/index.zip")
    });
    // ======================== Lambda Function - END =======================

    // ======================== API Gateway - START =======================
    const api = new Apigatewayv2Api(this, "HttpApi", {
      name: "TodoHttpApi",
      protocolType: "HTTP",
      corsConfiguration: {
        allowOrigins: ["*"], // Change to your frontend domain in production
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "DELETE"],
        allowHeaders: ["Content-Type"],
      }
    });



    const apiGatewayRole = new IamRole(this, "ApiGatewayLoggingRole", {
      name: "ApiGatewayLoggingRole",
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "apigateway.amazonaws.com",
            },
            Action: "sts:AssumeRole",
          },
        ],
      }),
    });
    
    // Attach a policy that allows writing logs to CloudWatch
    new IamPolicyAttachment(this, "ApiGatewayLoggingPolicyAttachment", {
      name: "ApiGatewayLoggingPolicyAttachment",
      policyArn: "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs",
      roles: [apiGatewayRole.name],
    });
    

    // Integration with Lambda
    const integration = new Apigatewayv2Integration(this, "TodoIntegration", {
      apiId: api.id,
      integrationType: "AWS_PROXY",
      integrationUri: todoLambda.arn,
      payloadFormatVersion: "2.0",
      
      
    });

    // Routes for HTTP Methods
    const getTodosRoute = new Apigatewayv2Route(this, "GetTodosRoute", {
      apiId: api.id,
      routeKey: "GET /todos", // Change this path as needed
      target: `integrations/${integration.id}`,
    });

    const addTodoRoute = new Apigatewayv2Route(this, "AddTodoRoute", {
      apiId: api.id,
      routeKey: "POST /todos", // Change this path as needed
      target: `integrations/${integration.id}`,
    });

    const updateTodoRoute = new Apigatewayv2Route(this, "UpdateTodoRoute", {
      apiId: api.id,
      routeKey: "PUT /todos/{id}", // Change this path as needed
      target: `integrations/${integration.id}`,
    });

    const deleteTodoRoute = new Apigatewayv2Route(this, "DeleteTodoRoute", {
      apiId: api.id,
      routeKey: "DELETE /todos/{id}", // Change this path as needed
      target: `integrations/${integration.id}`,
    });

    // Catch-all for unhandled routes (Optional)
    new Apigatewayv2Route(this, "ErrorRoute", {
      apiId: api.id,
      routeKey: "ANY /{proxy+}", // Catches all other requests
      target: `integrations/${integration.id}`,
    });


   // Create a log group for API Gateway
const apiLogGroup = new CloudwatchLogGroup(this, "ApiGatewayLogGroup", {
  name: "/aws/api-gateway/TodoHttpApi", // Same name as in accessLogSettings
})

    // Stage for API
    new Apigatewayv2Stage(this, "ApiStage", {
      apiId: api.id,
      name: "$default", // You can use "$default" or any custom name
      autoDeploy: true,
      accessLogSettings: {
        destinationArn: apiLogGroup.arn,
        format: JSON.stringify({
          requestId: "$context.requestId",
          ip: "$context.identity.sourceIp",
          requestTime: "$context.requestTime",
          httpMethod: "$context.httpMethod",
          resourcePath: "$context.resourcePath",
          path: "$context.path",
          protocol: "$context.protocol",
          stage:"$context.stage",
          routeKey:"$context.routeKey",
          status: "$context.status",
          responseLength: "$context.responseLength",
          errormessage:"$context.error.message",
          domainName:"$context.domainName"
        }),
      },
      
      
    });
    // ======================== API Gateway - END =======================



    // Create permission for API Gateway to invoke Lambda function
     new LambdaPermission(this, "AllowApiGatewayInvoke", {
      statementId: "apigateway-access",
      action: "lambda:InvokeFunction",
      functionName: todoLambda.functionName,
      principal: "apigateway.amazonaws.com",
      sourceArn: `${api.executionArn}/*`,
  });


 

    // ========================== Output - START ==========================
    // Output the API Gateway URL
    new TerraformOutput(this, "ApiGatewayUrl", {
      value: `${api.apiEndpoint}`,
    });


    new TerraformOutput(this, "GetTodosRouteUrl", {
      value: `${getTodosRoute.routeKey}`,
    });
    
    new TerraformOutput(this, "AddTodoRouteUrl", {
      value: `${addTodoRoute.routeKey}`,
    });
    
    new TerraformOutput(this, "UpdateTodoRouteUrl", {
      value: `${updateTodoRoute.routeKey}`,
    });
    
    new TerraformOutput(this, "DeleteTodoRouteUrl", {
      value: ` ${deleteTodoRoute.routeKey}`,
    });
  
    // ========================== Output - END ==========================
  }
}
