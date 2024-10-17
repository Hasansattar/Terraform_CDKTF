import { App} from "cdktf";
import { MyStack } from "./stacks/my-stack";

// Create an instance of the CDKTF App
const app = new App();
new MyStack(app, "step17_terraform_cdktf_eventgrid_webhookevent_with_functionapp_azure");
app.synth();
