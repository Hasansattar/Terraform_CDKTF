
import { App} from "cdktf";
import { MyStack } from "./stacks/my-stack";

// Create an instance of the CDKTF App
const app = new App();

new MyStack(app, "step14_terraform_cdktf_http_restapi_apigateway_aws");
app.synth();
