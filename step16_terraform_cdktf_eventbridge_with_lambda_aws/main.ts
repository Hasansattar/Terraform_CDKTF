
import { App} from "cdktf";
import { MyStack } from "./stacks/my-stack";

// Create an instance of the CDKTF App
const app = new App();

new MyStack(app, "step16_terraform_cdktf_eventbridage_lambda_aws");
app.synth();
