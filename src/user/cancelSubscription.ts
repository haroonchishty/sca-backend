import { APIGatewayProxyHandler } from 'aws-lambda';
import Stripe from 'stripe';
import { withUserMatch } from '../utils/withUserMatch';

const cancelSubscriptionHandler: APIGatewayProxyHandler = async (event) => {
  // The user is already authenticated here
  // You can access the user info with event.requestContext.authorizer.user
  
  // Use the Stripe secret key from environment variables
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Extract userId from the path parameters
  const userId = event.pathParameters?.userId;
  
  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'userId is required' }),
    };
  }

  try {
    // Search for customer by email
    const customers = await stripe.customers.search({
        query: `email:"${userId}"`
    });

    // Check if customer exists
    if (customers.data.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `User with userId ${userId} not found` }),
      };
    }

    // Customer exists, check subscription
    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'active' });

    for (const subscription of subscriptions.data) {
      await stripe.subscriptions.cancel(subscription.id);
      console.log(`Cancelled subscription: ${subscription.id}`);
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ success: true }),
    };
  } catch (error: any) {
    console.error('Error fetching stripe user by ID:', JSON.stringify(error, null, 2));
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to fetch stripe user', error: error.message }),
    };
  }
};

// Export the handler with authentication middleware applied
export const handler = withUserMatch(cancelSubscriptionHandler);