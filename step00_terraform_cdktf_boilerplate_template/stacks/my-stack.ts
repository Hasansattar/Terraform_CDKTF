import { Construct } from "constructs";
import { TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { S3Bucket  } from "@cdktf/provider-aws/lib/s3-bucket";


// Define a custom stack class extending TerraformStack
export class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Configure the AWS Provider for Terraform
    new AwsProvider(this, "AWS", {
      region: "us-east-1", // You can change this to your desired AWS region
    });


    
    // Define an S3 bucket
    new S3Bucket(this, "MyBucket", {
      bucket: "my-cdktf-sample-bucket",  // Replace with a unique bucket name
      acl: "private",                    // Define bucket access level (private, public-read, etc.)
    });
  }
}
