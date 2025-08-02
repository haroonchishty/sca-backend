import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: 'eu-west-1' });

export const handler: APIGatewayProxyHandler = async (event) => {
  const { fileName, fileType } = JSON.parse(event.body || '{}');

  const command = new PutObjectCommand({
    Bucket: 'sca-case-images',
    Key: `uploads/${fileName}`,
    ContentType: fileType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return {
    statusCode: 200,
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    body: JSON.stringify({ url, key: `uploads/${fileName}` }),
  };
};