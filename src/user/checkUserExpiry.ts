import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { withUserMatch } from '../utils/withUserMatch';

// Initialize the DynamoDB client
const dynamoDbClient = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(dynamoDbClient); // Using the Document Client for simpler interactions with DynamoDB

const checkUserExpiryHandler: APIGatewayProxyHandler = async (event) => {
  // Extract userId from the path parameters
  const userId = event.pathParameters?.userId;

  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'userId is required' }),
    };
  }

  const params = {
    TableName: 'Users', // Replace with your table name
    Key: { userId },    // Key to fetch the specific case by its caseId
    ProjectionExpression: "subscriptionExpiry"
  };

  try {
    const result = await dynamoDb.send(new GetCommand(params))

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `Failed to fetch completed cases for user with userId ${userId}` }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(result.Item),
    };
  } catch (error: any) {
    console.error('Error fetching completed cases:', JSON.stringify(error, null, 2)); // Log full error
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to fetch completed cases', error: error.message }), // Include error message
    };
  }
};

export const handler = withUserMatch(checkUserExpiryHandler);