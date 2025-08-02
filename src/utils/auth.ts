import { CognitoJwtVerifier } from "aws-jwt-verify";
import { APIGatewayProxyEvent } from 'aws-lambda';

// Your Cognito User Pool details - these should be in environment variables
// Will be populated from environment variables in the serverless.yml
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

// Create a verifier for your Cognito User Pool tokens
let verifier: any;

// Initialize the verifier
const initVerifier = () => {
  if (!verifier && USER_POOL_ID && CLIENT_ID) {
    console.log(`Initializing verifier with USER_POOL_ID: ${USER_POOL_ID} and CLIENT_ID: ${CLIENT_ID}`);
    verifier = CognitoJwtVerifier.create({
      userPoolId: USER_POOL_ID,
      tokenUse: "access", // or "id"
      clientId: CLIENT_ID,
    });
  } else if (!USER_POOL_ID || !CLIENT_ID) {
    console.error("Missing required environment variables:", {
      USER_POOL_ID: USER_POOL_ID ? "present" : "missing",
      CLIENT_ID: CLIENT_ID ? "present" : "missing"
    });
  }
  return verifier;
};

/**
 * Verify and decode the JWT token
 * @param token The JWT token to verify
 * @returns The decoded token payload or null if invalid
 */
export const verifyToken = async (token: string) => {
  try {
    const verifier = initVerifier();
    if (!verifier) {
      console.error("JWT verifier not initialized - USER_POOL_ID:", USER_POOL_ID, "CLIENT_ID:", CLIENT_ID);
      return null;
    }
    
    console.log("Attempting to verify token...");
    // Verify the token
    const payload = await verifier.verify(token);
    console.log("Token verified successfully");
    return payload;
  } catch (error) {
    console.error("Token verification failed:", JSON.stringify(error, null, 2));
    return null;
  }
};

/**
 * Extract the Bearer token from the Authorization header
 * @param event The API Gateway event
 * @returns The token or null if not found
 */
export const extractToken = (event: APIGatewayProxyEvent): string | null => {
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  console.log("Auth header:", authHeader);
  
  if (!authHeader) {
    console.log("No Authorization header found");
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    console.log("Invalid Authorization header format");
    return null;
  }

  console.log("Token extracted successfully");
  return parts[1];
};

/**
 * Auth middleware for Lambda functions
 * @param event The API Gateway event
 * @returns Object containing validation result and user info
 */
export const authenticateUser = async (event: APIGatewayProxyEvent) => {
  const token = extractToken(event);
  if (!token) {
    return { 
      isAuthenticated: false, 
      error: 'No authentication token provided' 
    };
  }

  const decodedToken = await verifyToken(token);
  if (!decodedToken) {
    return { 
      isAuthenticated: false, 
      error: 'Invalid authentication token' 
    };
  }

  return {
    isAuthenticated: true,
    user: {
      sub: decodedToken.sub,
      username: decodedToken.username,
      // Add other needed user attributes from the token
      groups: decodedToken['cognito:groups'] || [],
    }
  };
};