import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authenticateUser } from './auth';

export const withAuth = (handler: APIGatewayProxyHandler): APIGatewayProxyHandler => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const authResult = await authenticateUser(event);
    
    if (!authResult.isAuthenticated) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ 
          message: 'Unauthorized', 
          error: authResult.error 
        }),
      };
    }
    
    // Add the user information to the event for use in the handler
    const eventWithUser = {
      ...event,
      requestContext: {
        ...event.requestContext,
        authorizer: {
          ...event.requestContext?.authorizer,
          user: authResult.user
        }
      }
    };
    
    return await handler(eventWithUser, event.requestContext as any, () => {
        // The callback is unused since we're using async/await
        // but we need to provide it to satisfy the type signature
    }) as unknown as Promise<APIGatewayProxyResult>;
  };
};