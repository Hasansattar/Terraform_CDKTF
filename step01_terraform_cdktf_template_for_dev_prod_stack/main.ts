
import { App} from "cdktf";
import { MyStack } from "./stacks/my-stack";
import { loadConfig } from './utils/config_util';

// Create an instance of the CDKTF App
const app = new App();

const stage = app.node.tryGetContext('stage');

if (!stage || stage === 'unknown') {
  console.error(
    'You need to set the target stage. USAGE: cdk <command> -c stage=dev <stack>',
  );
  process.exit(1);
}


// Load stage config and set cdk environment
let config;
try {
  config = loadConfig(stage);
} catch (error) {
  console.error('Failed to load configuration:', error);
  process.exit(1);
}

console.log("config==========>",config);

// Instantiate the stack
new MyStack(app, "step00_hello_cdktf",{
  config: config
});

// Synthesize the stack into Terraform JSON configuration files
app.synth();
