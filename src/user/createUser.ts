import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { withAuth } from '../utils/withAuth';
import { v4 as uuidv4 } from 'uuid';

// Initialize DynamoDB client
const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

// Define a type for the input case data
interface UserData {
  email: string;
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  tier: number;
  createdAt: string;
  lastLogin: string;
  expiry: string;
  completedCases: Array<string>;
}

// Lambda function to handle POST request
const createUserHandler: APIGatewayProxyHandler = async (event) => {
  try {
    // Parse the request body
    const userData: UserData = JSON.parse(event.body || '{}');

    // Ensure required fields are present
    if (!userData.firstName || !userData.lastName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields" }),
      };
    }

    // Set up the PutCommand for DynamoDB
    const params = {
      TableName: "Users",
      Item: {
        userId: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        gender: userData.gender,
        dob: userData.dob,
        tier: 0,
        createdAt: userData.createdAt || new Date().toISOString(),
        // lastLogin: userData.lastLogin,
        // expiry: userData.expiry,
        completedCases: new Map()
      },
    };

    // Write the case data to DynamoDB
    await docClient.send(new PutCommand(params));

    // Return a success response
    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: "User created successfully" }),
    };
  } catch (error) {
    console.error("Error creating user:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to create user", error: error }),
    };
  }
};

export const handler = withAuth(createUserHandler);