Terraform CDKTF code for deploying a static website using AWS resources like S3 and CloudFront:

**Code Overview**

The code defines a stack class (``MyStack``) that sets up the necessary AWS infrastructure to host a static website using Amazon S3 for storage and Amazon CloudFront for content delivery. The stack includes components such as an S3 ``bucket``, a CloudFront distribution, and necessary configurations.

**Detailed Explanation**

Imports

```typescript
import { Construct } from 'constructs';
import { TerraformStack, TerraformOutput } from 'cdktf';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { S3Bucket } from '@cdktf/provider-aws/lib/s3-bucket';
import { S3Object } from '@cdktf/provider-aws/lib/s3-object';
import { S3BucketWebsiteConfiguration } from '@cdktf/provider-aws/lib/s3-bucket-website-configuration';
import { S3BucketPolicy } from '@cdktf/provider-aws/lib/s3-bucket-policy';
import { S3BucketPublicAccessBlock } from '@cdktf/provider-aws/lib/s3-bucket-public-access-block';
import { CloudfrontDistribution, CloudfrontDistributionOrigin, CloudfrontDistributionDefaultCacheBehavior } from '@cdktf/provider-aws/lib/cloudfront-distribution';
import * as path from 'path';
import * as fs from 'fs';

```
- The code imports various modules and classes needed to define AWS resources and manage file paths


**Stack Class Definition**

```typescript
export class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

```
- This line defines a class **``MyStack``** that extends **``TerraformStack``**. The constructor initializes the stack with a specific scope and ID.


**AWS Provider Configuration**


```typescript
    new AwsProvider(this, 'AWS', {
      region: 'us-east-1',
    });

```

- Initializes the AWS provider for the stack and specifies the region (``us-east-1``) where the resources will be created.

**Creating an S3 Bucket**

```typescript
    const websiteBucket = new S3Bucket(this, 'WebsiteBucket', {
      bucket: 'my-website-bucket-hasan',
    });

```
- Creates an S3 bucket named ``my-website-bucket-hasan`` to store website files.

**S3 Bucket Website Configuration**

```typescript
    new S3BucketWebsiteConfiguration(this, 'WebsiteConfig', {
      bucket: websiteBucket.id,
      indexDocument: { suffix: 'index.html' },
      errorDocument: { key: 'error.html' },
    });

```
- Configures the S3 bucket to serve a static website by specifying the index document (``index.html``) and the error document (``error.html``).


**Public Access Block Settings**

```typescript
    const publicAccessBlock = new S3BucketPublicAccessBlock(this, 'public-access-block', {
      bucket: websiteBucket.id,
      blockPublicAcls: false,
      ignorePublicAcls: false,
      blockPublicPolicy: false,
      restrictPublicBuckets: false,
    });

```
-  Defines a public access block configuration for the S3 bucket. Here, it allows public access by setting the corresponding flags to false.

**S3 Bucket Policy**

```typescript
    new S3BucketPolicy(this, 'bucket-policy', {
      bucket: websiteBucket.id,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
          Effect: "Allow",
          Principal: "*",
          Action: "s3:GetObject",
          Resource: `${websiteBucket.arn}/*`
        }]
      }),
      dependsOn: [publicAccessBlock], // Ensures public access block is created first
    });

```
- Creates a bucket policy that allows public access to objects in the S3 bucket. The policy specifies that anyone (``Principal: "*"``) can perform the ``s3:GetObject`` action on the bucket's contents.

**Uploading Files to the S3 Bucket**


```typescript
    new S3Object(this, 'IndexFile', {
      bucket: websiteBucket.id,
      key: 'index.html',
      source: path.resolve(__dirname, 'website/index.html'), // Path to your website folder
      contentType: 'text/html', // Set Content-Type for HTML
    });

```

- Uploads the ``index.html`` file to the S3 bucket. The ``contentType`` is set to ``text/html`` to serve it correctly.

**Uploading Additional Files**

```typescript
    const websiteFolder = path.resolve(__dirname, 'website');
    const files = fs.readdirSync(websiteFolder);
    console.log("====>", files)

    files.forEach((file) => {
      if (file !== 'index.html') {
        const contentType = getContentType(file);
        new S3Object(this, file, {
          bucket: websiteBucket.id,
          key: file,
          source: path.resolve(websiteFolder, file),  // Path to each file in the website folder
          contentType: contentType, // Set Content-Type for HTML
        });
      }
    });

```

- This section reads all the files from the ``website`` folder and uploads them to the S3 bucket (except ``index.html``). The ``getContentType()`` function is used to determine the MIME type based on the file extension..


```typescript
    // Function to get content type based on file extension
function getContentType(file: string): string {
  const ext = path.extname(file).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html';
    case '.css':
      return 'text/css';
    case '.js':
      return 'application/javascript';
    case '.png':
      return 'image/png';
    case '.jpg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream'; // Default type
  }
}
    
```
- 
This function, getContentType, determines the ``**MIME type**`` (or ``Content-Type**``) for a file based on its extension. MIME types inform browsers or any client interacting with the server about the type of content in a file, which helps in correctly displaying or interpreting that content.


**CloudFront Distribution**

```typescript
    const distribution = new CloudfrontDistribution(this, 'WebsiteDistribution', {
      origin: [{
        domainName: websiteBucket.bucketRegionalDomainName, // S3 bucket as origin
        originId: 'S3Origin',
      } as CloudfrontDistributionOrigin],
      defaultCacheBehavior: {
        targetOriginId: 'S3Origin',
        viewerProtocolPolicy: 'redirect-to-https',
        allowedMethods: ['GET', 'HEAD'], // Add allowed methods
        cachedMethods: ['GET', 'HEAD'], // Add cached methods
        forwardedValues: {
          queryString: false, // Set to true if you need to forward query strings
          cookies: {
            forward: 'none', // Use 'none', 'all', or 'whitelist' based on your needs
          },
        },
      } as CloudfrontDistributionDefaultCacheBehavior,
      enabled: true,
      isIpv6Enabled: true,
      defaultRootObject: 'index.html',
      restrictions: {
        geoRestriction: {
          restrictionType: 'none',
        },
      },
      viewerCertificate: {
        cloudfrontDefaultCertificate: true,
      },
    });

```
- Defines a CloudFront distribution that uses the S3 bucket as its origin. The configuration includes:
- - ``viewerProtocolPolicy``: Redirects HTTP requests to HTTPS.
- - ``allowedMethods and cachedMethods``: Specify the HTTP methods that CloudFront should support.
- - ``defaultRootObject``: The default file served when the root URL is accessed.
- - ``geoRestriction``: Allows access from all geographic locations.
- - ``viewerCertificate``: Uses the default CloudFront certificate for HTTPS. 


**Output CloudFront Domain Name**


```typescript
    new TerraformOutput(this, 'CloudFrontDomainName', {
      value: `https://${distribution.domainName}`,
      description: 'The domain name of the CloudFront distribution',
    });

```
- Outputs the CloudFront distribution domain name, allowing you to easily access the website once the deployment is complete.

**Conclusion**
T
his Terraform CDKTF code sets up a static website hosted on AWS using an S3 bucket for storage and CloudFront for distribution. It configures the necessary access controls, uploads website files, and defines the CloudFront distribution to serve the website over HTTPS.










### Deploy the Infrastructure

Install Dependencies: Run the following command to install the required dependencies:

```bash
npm install

```
**Compile the typescript code**
```bash
npm run build
```
Synthesize the Terraform Configuration: Run the synth command to generate the Terraform configuration files in the cdktf.out/ directory:

```bash
cdkft synth
```
Check the configuration plan
```bash
cdktf plan
```

Deploy the Infrastructure: Run the deploy command to apply the Terraform configuration and provision the AWS resources:

```bash
cdktf deploy
```

Destroy the Infrastructure: If you want to destroy the infrastructure, you can run the destroy command:

```bash
cdktf destroy
```
