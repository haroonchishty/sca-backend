import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient, ReturnValue } from "@aws-sdk/client-dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { withUserMatch } from '../utils/withUserMatch';

// Initialize DynamoDB client
const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

// Lambda function to handle PUT request to update the case
const completeCaseHandler: APIGatewayProxyHandler = async (event) => {
  const userId = event.pathParameters?.userId;
  const caseId = event.pathParameters?.caseId;
  const requestBody = JSON.parse(event.body || '{}');
  const rating = requestBody.rating; // Expecting 'red', 'green', or 'yellow'

  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "userId is required" }),
    };
  }

  if (!caseId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "caseId is required" }),
    };
  }
  

  try {

    // Set up the UpdateCommand for DynamoDB
    const params = {
        TableName: 'Users',
        Key: { userId: userId },  // Assuming your partition key is userId
        UpdateExpression: 'SET completedCases.#caseId = :rating',
        ExpressionAttributeNames: {
          '#caseId': caseId
        },
        ExpressionAttributeValues: {
          ':rating': rating
        },
        ReturnValues: ReturnValue.UPDATED_NEW,  // Return the updated attributes
      };

    // Execute the update in DynamoDB
    const result = await docClient.send(new UpdateCommand(params));

    // Return a success response with the updated item
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: 'Case marked as completed', updatedCase: result }),
    };
  } catch (error: any) {
    console.error("Error marking case as complete:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to mark case as complete", error: error.message }),
    };
  }
};

export const handler = withUserMatch(completeCaseHandler);
