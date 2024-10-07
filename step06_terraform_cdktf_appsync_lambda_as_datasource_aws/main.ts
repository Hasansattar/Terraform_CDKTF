
import { App} from "cdktf";
import { MyStack } from "./stacks/my-stack";

// Create an instance of the CDKTF App
const app = new App();

// Instantiate the stack
new MyStack(app, "step04_terraform_cdktf_lambda_as_datasource_aws");

// Synthesize the stack into Terraform JSON configuration files
app.synth();