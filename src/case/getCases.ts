import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { withAuth } from '../utils/withAuth';

// Initialize the DynamoDB client
const dynamoDbClient = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(dynamoDbClient);

interface QueryParameters {
  categoryId?: string;
  tier?: string;
}

const getCasesHandler: APIGatewayProxyHandler = async (event) => {
  const { categoryId, tier }: QueryParameters = event.queryStringParameters || {};

  try {
    let data;

    if (categoryId) {
      // Query by categoryId
      const params = {
        TableName: 'Cases',
        IndexName: 'GSI_Category',
        ProjectionExpression: 'caseId, title, anonymousTitle, categoryId',
        KeyConditionExpression: 'categoryId = :categoryId',
        ExpressionAttributeValues: {
          ':categoryId': categoryId,
        },
      };
      data = await dynamoDb.send(new QueryCommand(params));
    } else if (tier) {
      // Query by tier, considering multiple queries if tier > 1
      const tierValue = Number(tier);
      if (isNaN(tierValue) || tierValue < 1) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Invalid tier value' }),
        };
      }
      
      let combinedResults: any[] = [];
      for (let i = tierValue; i >= 1; i--) {
        const params = {
          TableName: 'Cases',
          IndexName: 'GSI_Tier',
          ProjectionExpression: 'caseId, title, anonymousTitle, categoryId',
          KeyConditionExpression: 'tier = :tier',
          ExpressionAttributeValues: {
            ':tier': i,
          },
        };
        
        const queryResult = await dynamoDb.send(new QueryCommand(params));
        if (queryResult.Items) {
          combinedResults = [...combinedResults, ...queryResult.Items];
        }
      }
      data = { Items: combinedResults };
    } else {
      // Scan all cases if no categoryId or tier provided
      const params = {
        TableName: 'Cases',
        ProjectionExpression: 'caseId, title, anonymousTitle, categoryId',
        Limit: 100,
      };
      data = await dynamoDb.send(new ScanCommand(params));
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(data.Items),
    };
  } catch (error: any) {
    console.error('Error fetching cases:', JSON.stringify(error, null, 2));
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to fetch cases', error: error.message }),
    };
  }
};

export const handler = withAuth(getCasesHandler);