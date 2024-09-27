
import { App} from "cdktf";
import { MyStack } from "./stacks/my-stack";

// Create an instance of the CDKTF App
const app = new App();

// Instantiate the stack
new MyStack(app, "step03_hello_cdktf");

// Synthesize the stack into Terraform JSON configuration files
app.synth();
