import { Construct } from "constructs";
import { TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { S3Bucket  } from "@cdktf/provider-aws/lib/s3-bucket";
import { Instance  } from "@cdktf/provider-aws/lib/instance";


interface MyStackProps {
 config:{
  aws_region: string;
  compute:{
  ec2:{
    os_ami: string;
    os_size: string;
  }
  }
  environment:string;
  stage:string;
 }
}

// Define a custom stack class extending TerraformStack
export class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string, props:MyStackProps) {
    super(scope, id);

    console.log("config in stack",props)

    // Configure the AWS Provider for Terraform
    new AwsProvider(this, "AWS", {
      region: props.config.aws_region, // You can change this to your desired AWS region
    });



    
    new Instance(this,`MyInstance-${props.config.stage}`,{
      ami: props.config.compute.ec2.os_ami,
      instanceType: props.config.compute.ec2.os_size,
      tags: {
        Name: `${props.config.environment}-instance`, // Set the name of the instance
      },
    

    })

    // Define an S3 bucket
    new S3Bucket(this, `MyBucket-${props.config.stage}`, {
      bucket: `my-cdktf-sample-bucket-${props.config.stage}`,  // Replace with a unique bucket name
      acl: "private",                    // Define bucket access level (private, public-read, etc.)
    });
  }
}
