import { App} from "cdktf";
import { MyStack } from "./stacks/my-stack";

// Create an instance of the CDKTF App
const app = new App();

new MyStack(app, "step13_terraform_cdktf_appsync_none_datasource_aws");
app.synth();
