import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { withAuth } from '../utils/withAuth';

// Initialize the DynamoDB client
const dynamoDbClient = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(dynamoDbClient); // Using the Document Client for simpler interactions with DynamoDB

const getCaseById: APIGatewayProxyHandler = async (event) => {
  // Extract caseId from the path parameters
  const caseId = event.pathParameters?.caseId;

  if (!caseId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'caseId is required' }),
    };
  }

  const params = {
    TableName: 'Cases', // Replace with your table name
    Key: { caseId },    // Key to fetch the specific case by its caseId
  };

  try {
    const result = await dynamoDb.send(new GetCommand(params))

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `Case with caseId ${caseId} not found` }),
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
    console.error('Error fetching case by ID:', JSON.stringify(error, null, 2)); // Log full error
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to fetch case', error: error.message }), // Include error message
    };
  }
};

export const handler = withAuth(getCaseById);