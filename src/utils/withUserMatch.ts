import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { withAuth } from './withAuth';

/**
 * Higher-order function that checks if the authenticated user matches the requested userId.
 * For direct Lambda invocations (internal), it bypasses the auth check.
 */
export const withUserMatch = (handler: APIGatewayProxyHandler): APIGatewayProxyHandler => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Check if this is an internal invocation (from another Lambda)
    const isInternalInvocation = isInternalRequest(event);
    
    if (isInternalInvocation) {
      // For internal invocations, bypass auth check and directly call the handler
      console.log('Internal Lambda invocation detected - bypassing auth check');
      return await handler(event, event.requestContext as any, () => { }) as unknown as Promise<APIGatewayProxyResult>;
    } else {
      // Create an auth-wrapped handler that also checks user matches
      const userMatchHandler: APIGatewayProxyHandler = async (event, context, callback) => {
        // Auth has been checked at this point by withAuth middleware
        // Now check if the userId in the request matches the authenticated user
        const userId = getUserIdFromRequest(event);
        
        if (userId) {
          const user = event.requestContext?.authorizer?.user;
          
          // Check if the userId matches the authenticated user
          if (user && user.username !== userId) {
            return {
              statusCode: 403,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
              },
              body: JSON.stringify({
                message: 'Forbidden',
                error: 'You are not authorized to access this resource'
              }),
            };
          }
        }
        
        // User matched or no userId in request - proceed to original handler
        return await handler(event, context, callback) as unknown as Promise<APIGatewayProxyResult>;
      };
      
      // Apply auth middleware first, then our user match check
      const authenticatedHandler = withAuth(userMatchHandler);
      return authenticatedHandler(event, event.requestContext as any, () => {}) as Promise<APIGatewayProxyResult>;
    }
  };
};

/**
 * Helper function to extract userId from different parts of the request
 */
function getUserIdFromRequest(event: APIGatewayProxyEvent): string | null {
  // Check path parameters
  if (event.pathParameters?.userId) {
    return event.pathParameters.userId;
  }
  
  // Check query string parameters
  if (event.queryStringParameters?.userId) {
    return event.queryStringParameters.userId;
  }
  
  // Check in the body if it's a POST/PUT request with JSON body
  if (event.body) {
    try {
      const body = JSON.parse(event.body);
      if (body.userId) {
        return body.userId;
      }
    } catch (e) {
      // Not JSON or couldn't parse - ignore
    }
  }
  
  return null;
}

/**
 * Helper function to determine if the request is an internal Lambda invocation
 * rather than coming from API Gateway with authorization headers
 */
function isInternalRequest(event: APIGatewayProxyEvent): boolean {
  // For internal Lambda invocations, there won't be API Gateway authentication headers
  // or there may be specific indicators in the event structure
  
  // No authorization header indicates it's likely an internal call
  const hasAuthHeader = !!(event.headers?.Authorization || event.headers?.authorization);
  
  // Check if the event was created by our updateUserInDynamo function
  // This can be enhanced with additional checks specific to your architecture
  const hasApiGatewayContext = !!(event.requestContext?.apiId);
  
  return !hasAuthHeader && !hasApiGatewayContext;
}