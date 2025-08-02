import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import { withAuth } from '../utils/withAuth';
import { CaseData } from '../case/caseModel'

// Initialize DynamoDB client
const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

// Lambda function to handle POST request
const createCaseHandler: APIGatewayProxyHandler = async (event) => {
  try {
    // Parse the request body
    const caseData: Partial<CaseData> = JSON.parse(event.body || '{}');

    // Ensure required fields are present
    if (!caseData.category || !caseData.title) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields" }),
      };
    }

    // Set up the PutCommand for DynamoDB
    const params = {
      TableName: "Cases",
      Item: {
        caseId: uuidv4(),
        categoryId: caseData.category,
        tier: caseData.tier,
        title: caseData.title,
        anonymousTitle: caseData.anonymousTitle,
        doctor: caseData.doctor || {
          image: '',
          name: '',
          age: '',
          PMHX: '',
          medicationHistory: '',
          medicalNotes: '',
          results: '',
          caseDetails: '',
        },
        patient: caseData.patient || {
          background: '',
          name: '',
          age: '',
          caseBackground: '',
          presentingComplaint: '',
          openHistory: '',
          positiveSX: '',
          negativeSX: '',
          ideas: '',
          concerns: '',
          expectations: '',
          pastMedicalHistory: '',
          medications: '',
          socialHistory: '',
          familyHistory: '',
          behaviour: '',
        },
        marking: caseData.marking || {
          positiveIndicatorsGathering: '',
          negativeIndicatorsGathering: '',
          positiveIndicatorsManagement: '',
          negativeIndicatorsManagement: '',
          positiveIndicatorsRelating: '',
          negativeIndicatorsRelating: '',
        },
        // keyIssues: caseData.keyIssues,
        management: caseData.management || {
          managementOfCase: '',
          managementOfDisease: '',
          relation: '',
          adviceToPatients: '',
          safetyNet: '',
          furtherReading: '',
        },
        createdAt: caseData.createdAt || new Date().toISOString(),
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
      body: JSON.stringify({ message: "Case created successfully" }),
    };
  } catch (error) {
    console.error("Error creating case:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to create case", error: error }),
    };
  }
};

export const handler = withAuth(createCaseHandler);