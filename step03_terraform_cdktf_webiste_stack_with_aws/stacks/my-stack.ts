import { Construct } from 'constructs';
import { TerraformStack,TerraformOutput  } from 'cdktf';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { S3Bucket} from '@cdktf/provider-aws/lib/s3-bucket';
import { S3Object } from '@cdktf/provider-aws/lib/s3-object';
import {  S3BucketWebsiteConfiguration } from '@cdktf/provider-aws/lib/s3-bucket-website-configuration';
import { S3BucketPolicy } from '@cdktf/provider-aws/lib/s3-bucket-policy';
import { S3BucketPublicAccessBlock } from '@cdktf/provider-aws/lib/s3-bucket-public-access-block';
import { CloudfrontDistribution, CloudfrontDistributionOrigin, CloudfrontDistributionDefaultCacheBehavior } from '@cdktf/provider-aws/lib/cloudfront-distribution';
import * as path from 'path';
import * as fs from 'fs';


export class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // AWS provider
    new AwsProvider(this, 'AWS', {
      region: 'us-east-1',
    });

    // Create an S3 bucket
    const websiteBucket = new S3Bucket(this, 'WebsiteBucket', {
      bucket: 'my-website-bucket-hasan',
      
    });

  
  
    // Set up S3 bucket website configuration
    new S3BucketWebsiteConfiguration(this, 'WebsiteConfig', {
      bucket: websiteBucket.id,
      indexDocument: { suffix: 'index.html' },
      errorDocument: { key: 'error.html' },
      
    });


// Define the Public Access Block settings first
const publicAccessBlock = new S3BucketPublicAccessBlock(this, 'public-access-block', {
  bucket: websiteBucket.id,
  blockPublicAcls: false,
  ignorePublicAcls: false,
  blockPublicPolicy: false,
  restrictPublicBuckets: false,
});


// Create the bucket policy and depend on the public access block
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



    // Upload index.html to the S3 bucket
    // Upload index.html to the S3 bucket with Content-Type set
new S3Object(this, 'IndexFile', {
  bucket: websiteBucket.id,     // Use websiteBucket.id directly
  key: 'index.html',
  source: path.resolve(__dirname, 'website/index.html'), // Path to your website folder
  contentType: 'text/html', // Set Content-Type for HTML

});

    // Optionally, add other files like CSS, JS, images, etc.
    // Example: Add a JS file
    const websiteFolder = path.resolve(__dirname, 'website');
    const files = fs.readdirSync(websiteFolder);
    console.log("Files to upload:", files);


    files.forEach((file) => {
      if (file !== 'index.html') {
        const contentType = getContentType(file); // Implement a function to determine content type
        new S3Object(this, file, {
          bucket: websiteBucket.id,  // Use websiteBucket.id directly
          key: file,
          source: path.resolve(websiteFolder, file),  // Path to each file in the website folder
          contentType: contentType, // Set content type dynamically based on file
          
        });
      }
    });



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
     



    
    // Define CloudFront distribution
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

    // Output the CloudFront distribution domain name
    new TerraformOutput(this, 'CloudFrontDomainName', {
      value: `https://${distribution.domainName}`,
      description: 'The domain name of the CloudFront distribution',
    });


  }
}


