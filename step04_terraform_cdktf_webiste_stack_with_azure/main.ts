import { App} from "cdktf";
import { MyStack } from "./stacks/my-stack";

// Create an instance of the CDKTF App
const app = new App();

// Instantiate the stack
new MyStack(app, "step03_terraform_cdktf_webiste_stack_with_azure");

// Synthesize the stack into Terraform JSON configuration files
app.synth();
