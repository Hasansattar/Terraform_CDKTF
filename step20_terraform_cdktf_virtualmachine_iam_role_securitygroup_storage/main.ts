import { App} from "cdktf";
import { MyStack } from "./stacks/my-stack";

// Create an instance of the CDKTF App
const app = new App();
new MyStack(app, "step20_terraform_cdktf_virtualmachine_iam_role_securitygroup_storage");
app.synth();
