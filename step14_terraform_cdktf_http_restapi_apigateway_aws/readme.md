
The code defines an AWS infrastructure stack using CDKTF (Cloud Development Kit for Terraform) in TypeScript, provisioning several resources like Lambda functions, API Gateway, IAM roles, and permissions.

### 1.Imports

```typescript
import { TerraformStack, TerraformOutput } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Construct } from "constructs";
import { Apigatewayv2Api, Apigatewayv2Integration, Apigatewayv2Route, Apigatewayv2Stage } from "@cdktf/provider-aws/lib/apigatewayv2-api";
import { LambdaFunction } from "@cdktf/provider-aws/lib/lambda-function";
import { IamRole, IamPolicy, IamPolicyAttachment } from "@cdktf/provider-aws/lib/iam-role";
import { LambdaPermission } from "@cdktf/provider-aws/lib/lambda-permission";
import { CloudwatchLogGroup } from "@cdktf/provider-aws/lib/cloudwatch-log-group";
import * as path from "path";

```
These are TypeScript imports for various CDKTF (Terraform + CDK) constructs, including AWS resources like Lambda, API Gateway, IAM, and CloudWatch Log Group.

### 2. AWS Provider
```typescript
new AwsProvider(this, "AWS", {
  region: "us-east-1",
});

```
The AwsProvider defines the region (us-east-1) where the AWS resources will be deployed.


### 3. Lambda Role Creation
```typescript
const lambdaRole = new IamRole(this, "LambdaExecutionRole", {
  name: "LambdaExecutionRole",
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { Service: "lambda.amazonaws.com" },
        Action: "sts:AssumeRole",
      },
    ],
  }),
});

```
Creates an IAM Role (LambdaExecutionRole) that grants the Lambda function permissions to assume this role. It defines the AssumeRolePolicy allowing the Lambda service to assume this role.


### 4. Lambda Policy Attachment
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
          "lambda:InvokeFunction",
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

```
- Defines an IAM policy (LambdaPolicy) that grants the Lambda function permissions to write logs to CloudWatch and invoke functions.
- The IamPolicyAttachment attaches this policy to the LambdaExecutionRole.

### 5.  Lambda Function

```typescript
const todoLambda = new LambdaFunction(this, "TodoLambdaFunction", {
  functionName: "TodoLambdaFunction",
  handler: "index.handler",
  runtime: "nodejs18.x",
  role: lambdaRole.arn,
  filename: path.resolve(__dirname, "../Lambda/index.zip")
});

```
Creates a Lambda function (TodoLambdaFunction) using Node.js (nodejs18.x). The handler is defined as index.handler (i.e., it will execute the handler function inside index.js). The Lambda function's execution role is attached (role).

### 6. API Gateway (HTTP API)
```typescript
const api = new Apigatewayv2Api(this, "HttpApi", {
  name: "TodoHttpApi",
  protocolType: "HTTP",
  corsConfiguration: {
    allowOrigins: ["*"],
    allowMethods: ["OPTIONS", "GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type"],
  }
});

```
Creates an HTTP API (TodoHttpApi) using API Gateway v2 with CORS enabled. It allows requests from any origin, methods like GET, POST, PUT, DELETE, etc., and headers like Content-Type.


### 7.  Integration with Lambda
```typescript
const integration = new Apigatewayv2Integration(this, "TodoIntegration", {
  apiId: api.id,
  integrationType: "AWS_PROXY",
  integrationUri: todoLambda.arn,
  payloadFormatVersion: "2.0",
});

```
Integrates the Lambda function (TodoLambdaFunction) with API Gateway. This integration uses ``AWS_PROXY``, meaning all incoming requests will be directly forwarded to Lambda.


### 8. API Routes
```typescript
const getTodosRoute = new Apigatewayv2Route(this, "GetTodosRoute", {
  apiId: api.id,
  routeKey: "GET /todos",
  target: `integrations/${integration.id}`,
});

const addTodoRoute = new Apigatewayv2Route(this, "AddTodoRoute", {
  apiId: api.id,
  routeKey: "POST /todos",
  target: `integrations/${integration.id}`,
});

const updateTodoRoute = new Apigatewayv2Route(this, "UpdateTodoRoute", {
  apiId: api.id,
  routeKey: "PUT /todos/{id}",
  target: `integrations/${integration.id}`,
});

const deleteTodoRoute = new Apigatewayv2Route(this, "DeleteTodoRoute", {
  apiId: api.id,
  routeKey: "DELETE /todos/{id}",
  target: `integrations/${integration.id}`,
});


```
Creates routes for the HTTP API, such as:

- ``GET /todos`` for retrieving todos.
- ``POST /todos`` for adding new todos.
- ``PUT /todos/{id}`` for updating todos.
- ``DELETE /todos/{id}`` for deleting todos.
All routes are connected to the Lambda integration.


### 9. CloudWatch Log Group for API Gateway

```typescript
const apiLogGroup = new CloudwatchLogGroup(this, "ApiGatewayLogGroup", {
  name: "/aws/api-gateway/TodoHttpApi",
});

```
Creates a CloudWatch Log Group to store API Gateway logs.


### 10. API Stage

```typescript
new Apigatewayv2Stage(this, "ApiStage", {
  apiId: api.id,
  name: "$default",
  autoDeploy: true,
  accessLogSettings: {
    destinationArn: apiLogGroup.arn,
    format: JSON.stringify({
      requestId: "$context.requestId",
      ip: "$context.identity.sourceIp",
      requestTime: "$context.requestTime",
      httpMethod: "$context.httpMethod",
      resourcePath: "$context.resourcePath",
      status: "$context.status",
      responseLength: "$context.responseLength",
    }),
  },
});

```
Creates a stage ($default) for the API Gateway, enabling autoDeploy (i.e., automatic deployment of changes) and access logging to the CloudWatch log group created earlier.


### 11. Lambda Permission for API Gateway

```typescript
new LambdaPermission(this, "AllowApiGatewayInvoke", {
  statementId: "apigateway-access",
  action: "lambda:InvokeFunction",
  functionName: todoLambda.functionName,
  principal: "apigateway.amazonaws.com",
  sourceArn: `${api.executionArn}/*`,
});

```
Grants API Gateway permission to invoke the Lambda function.


### 12.  Outputs

```typescript
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

```

Outputs the API Gateway URL and route URLs for the deployed application, making it easier to access or test.

# Summary 
In summary, this code provisions a Lambda function and an API Gateway (HTTP API) to create a simple To-Do API. The Lambda function handles requests, and the API Gateway forwards HTTP methods to the Lambda using routes. IAM roles, permissions, and logging are also configured for security and monitoring purposes.





# Testing API



You can test your API directly from the command line using cURL.

**Example 1: Testing** ``GET /todos``

```bash
curl -X GET "https://<your-api-id>.execute-api.<region>.amazonaws.com/todos"

```
**Example 2: Testing** ``POST /todos``

```bash
curl -X POST "https://<your-api-id>.execute-api.<region>.amazonaws.com/todos" -H "Content-Type: application/json" -d "{\"id\": \"3\", \"title\": \"Mobile buying\", \"completed\": false}"

```
**Example 3: Testing** ``PUT /todos/{id}``

```bash
curl -X PUT "https://<your-api-id>.execute-api.<region>.amazonaws.com/todos/1" -H "Content-Type: application/json" -d "{\"title\": \"Buy groceries\", \"completed\": true}"


```
**Example 4: Testing** ``DELETE /todos/{id}``

```bash
curl -X DELETE "https://<your-api-id>.execute-api.<region>.amazonaws.com/todos/1"

```