import { App} from "cdktf";
import { MyStack } from "./stacks/my-stack";


const app = new App();
new MyStack(app, "step04_terraform_cdktf_api_managment_and_function_app_azure");
app.synth();
