import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({ region: process.env.REGION as string });

export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME as string;

export { s3Client, getSignedUrl };
