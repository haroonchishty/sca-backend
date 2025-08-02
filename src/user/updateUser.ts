import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient, ReturnValue } from "@aws-sdk/client-dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { withUserMatch } from '../utils/withUserMatch';

// Initialize DynamoDB client
const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

// Lambda function to handle PUT request to update the user
export const updateUserHandler: APIGatewayProxyHandler = async (event) => {
  const userId = event.pathParameters?.userId;

  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "userId is required" }),
    };
  }

  try {
    // Parse the request body
    const userData: Record<string, any> = JSON.parse(event.body || '{}');

    // Ensure that at least one field is provided to update
    if (Object.keys(userData).length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "No fields provided for update" }),
      };
    }

    // Initialize the parts of the update expression
    let updateExpression = 'set';
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Dynamically build the update expression
    // Remove userId from userData as it shouldn't be updated
    const { userId: _, updatedAt: __, ...updateData } = userData;
    
    for (const key in updateData) {
      const attributeName = `#${key}`;
      const attributeValue = `:${key}`;

      updateExpression += ` ${attributeName} = ${attributeValue},`;
      expressionAttributeNames[attributeName] = key;
      expressionAttributeValues[attributeValue] = updateData[key];
    }

    // Add an `updatedAt` timestamp automatically
    updateExpression += ' #updatedAt = :updatedAt';
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    // Remove trailing comma from update expression if needed
    if (updateExpression.endsWith(',')) {
      updateExpression = updateExpression.slice(0, -1);
    }

    // Set up the UpdateCommand for DynamoDB
    const params = {
      TableName: 'Users', // Replace with your table name
      Key: { userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: ReturnValue.ALL_NEW, // Use the enum from @aws-sdk/client-dynamodb
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
      body: JSON.stringify({ message: 'User updated successfully', updatedUser: result.Attributes }),
    };
  } catch (error: any) {
    console.error("Error updating user:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to update user", error: error.message }),
    };
  }
};

export const handler = withUserMatch(updateUserHandler);