import { App} from "cdktf";
import { MyStack } from "./stacks/my-stack";

// Create an instance of the CDKTF App
const app = new App();
new MyStack(app, "step19_terraform_cdktf_eventgrid_functionapp_cosmosdb_apimanagemnet_azure");
app.synth();
