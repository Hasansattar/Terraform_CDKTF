export type Config = {
  stage: "local" | "dev" | "prod";
  aws_account: string;
  aws_region: string;
  emailAddress: string;
  name: string;
  tags: {
    app: string;
  };
  environment: string;
  compute: {
    ec2: {
      os_ami: string;
      os_size: string;
    };
  };

  // Add any other configuration properties here
};
