

import { App} from "cdktf";
import { MyStack } from "./stacks/my-stack";

// Create an instance of the CDKTF App
const app = new App();

// Instantiate the stack
new MyStack(app, "step09_terraform_cdktf_appsync_lambda_dynamodb_aws");

// Synthesize the stack into Terraform JSON configuration files
app.synth();