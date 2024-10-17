import { App} from "cdktf";
import { MyStack } from "./stacks/my-stack";

// Create an instance of the CDKTF App
const app = new App();
new MyStack(app, "step18_terraform_cdktf_eventgrid_function_endpoint_with_functionapp_azure");
app.synth();
