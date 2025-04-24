import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';

dotenv.config();

const client = new DynamoDBClient({ region: process.env.REGION as string });
const dynamoDb = DynamoDBDocumentClient.from(client);

export const TABLE_NAME = process.env.TABLE_NAME;

export { dynamoDb };
