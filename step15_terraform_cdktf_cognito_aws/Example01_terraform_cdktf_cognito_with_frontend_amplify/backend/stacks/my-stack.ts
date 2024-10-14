import { Construct } from "constructs";
import { TerraformStack,TerraformOutput } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";

import { CognitoUserPool } from "@cdktf/provider-aws/lib/cognito-user-pool";
;
import {CognitoUserPoolClient} from "@cdktf/provider-aws/lib/cognito-user-pool-client"



// Define a custom stack class extending TerraformStack
export class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Configure the AWS Provider for Terraform
    new AwsProvider(this, "AWS", {
      region: "us-east-1", // You can change this to your desired AWS region
    });


     // Create a Cognito User Pool
     const userPool = new CognitoUserPool(this, "userPool-Amplify", {
      name: "userPool-Amplify", // Name of the user pool
      accountRecoverySetting:{
        recoveryMechanism:[{
          name:"verified_email",
          priority:1,
        },
        {
            name:"verified_phone_number",
            priority:2,
          },
      ]
      },
      adminCreateUserConfig:{
        allowAdminCreateUserOnly:false,
      },
      autoVerifiedAttributes:["email"],
      schema: [
        {
          name: "email",
          required: true,
          mutable: true,
          attributeDataType: "String",
        },
        {
          name: "phone_number",
          required: true,
          mutable: true,
          attributeDataType: "String",
        },
      ],
      
      
    
    });

    
    // Create a Cognito User Pool Client
    const userPoolClient = new CognitoUserPoolClient(this, "userPoolClient-Amplify", {
      name:"CognitoUserPoolClient",
      userPoolId: userPool.id,
      allowedOauthFlows: ["code", "implicit"], // Allowed OAuth flows
      allowedOauthScopes: ["phone", "email", "openid", "profile"], // Allowed OAuth scopes
      callbackUrls: ["http://localhost:8000/"], // Replace with your actual callback URL
      logoutUrls: ["http://localhost:8000/logout"], // Replace with your actual logout URL
      // Enable the Hosted UI
      supportedIdentityProviders: ["COGNITO"],
       
       
    });

    // Output User Pool ID
    new TerraformOutput(this, "UserPoolId", {
      value: userPool.id,
    });

    // Output User Pool Client ID
    new TerraformOutput(this, "UserPoolClientId", {
      value: userPoolClient.id,
    });

// Output the Hosted UI URL
new TerraformOutput(this, "HostedUIUrl", {
  value: `https://${userPool.id}.auth.us-east-1.amazoncognito.com/`, // Update the region if needed
});
   
    
   
  }
}