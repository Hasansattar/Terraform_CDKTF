import { App} from "cdktf";
import { MyStack } from "./stacks/my-stack";

// Create an instance of the CDKTF App
const app = new App();

// Instantiate the stack
new MyStack(app, "step10_terraform_cdktf_apimanagment_functionapp_cosmosdb_azure");

// Synthesize the stack into Terraform JSON configuration files
app.synth();