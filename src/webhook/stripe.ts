import { APIGatewayProxyHandler } from 'aws-lambda';
import Stripe from 'stripe';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

// Initialize the Lambda client
const lambdaClient = new LambdaClient({});

export const handler: APIGatewayProxyHandler = async (event) => {

// console.log(`Incoming Webhook Event ${JSON.stringify(event)}`);

const endpointSecret = "whsec_g47oSOmsqNak7pEBzUqRR7cV119Q36lS";
const signature = event.headers['Stripe-Signature'] || event.headers['stripe-signature'];

if (!signature) {
  throw new Error('No signature found in the request headers');
}

  // Use the Stripe secret key from environment variables
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  let stripeEvent;
  
  try {
    // Verify the event with the endpoint secret and signature
    if (!event.body) {
      throw new Error('No body found in the event');
    }
    
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      endpointSecret
    );
    
    // Handle the event based on its type
    switch (stripeEvent.type) {
    //   case 'checkout.session.completed':
    //     // Payment is successful, fulfill the order
    //     const session = stripeEvent.data.object;
    //     console.log(`Payment successful for session: ${session.id}`);
    //     // Add your logic to handle successful payment
    //     break;
    //   case 'invoice.payment_succeeded':
    //     // Handle subscription payment success
    //     const invoice = stripeEvent.data.object;
    //     console.log(`Subscription payment successful for invoice: ${invoice.id}`);
        
    //     // Get customer details to extract email
    //     const customer = await stripe.customers.retrieve(invoice.customer as string);
    //     if (!customer.deleted && 'email' in customer && customer.email) {
    //       // Calculate new expiry date (typically 1 month from now, adjust as needed)
    //       const subscriptionExpiry = new Date();
    //       subscriptionExpiry.setMonth(subscriptionExpiry.getMonth() + 1); // Add 1 month
          
    //       // Update user with new subscription expiry
    //       await updateUserInDynamo({
    //         userId: customer.email,
    //         subscriptionExpiry: subscriptionExpiry.toISOString()
    //       });
          
    //       console.log(`Updated subscription expiry for customer: ${customer.email}`);
    //     }
    //     break;
      case 'customer.subscription.deleted':
    //   case 'subscription_schedule.canceled':
        const canceledObj = stripeEvent.data.object;
        const customerId = canceledObj.customer;
        console.log(`Subscription canceled: ${canceledObj.id}, Customer ID: ${customerId}`);
        
        // Get customer email for the canceled subscription
        const canceledCustomer = await stripe.customers.retrieve(customerId as string);
        if (!canceledCustomer.deleted && 'email' in canceledCustomer && canceledCustomer.email) {
          // Update user status to canceled but keep the expiry date
          await updateUserInDynamo({
            userId: canceledCustomer.email,
            status: 'cancelled'
          });
          
          console.log(`Updated status to cancelled for customer: ${canceledCustomer.email}`);
        }
        break;
      case 'customer.subscription.created':
    //   case 'customer.schedule.created':
        const createdObj = stripeEvent.data.object;
        const newCustomerId = createdObj.customer;
        console.log(`Subscription created: ${createdObj.id}, Customer ID: ${newCustomerId}`);
        
        // Get customer email for the new subscription
        const newCustomer = await stripe.customers.retrieve(newCustomerId as string);
        if (!newCustomer.deleted && 'email' in newCustomer && newCustomer.email) {
          // Get subscription expiry date
          let newExpiry = new Date();
          
          // If this is a subscription schedule with phases, try to get the end date
          if ('phases' in createdObj && Array.isArray(createdObj.phases) && createdObj.phases.length > 0) {
            const currentPhase = createdObj.phases.find((phase: any) => 
              phase.start_date <= Math.floor(Date.now() / 1000) && 
              (!phase.end_date || phase.end_date > Math.floor(Date.now() / 1000))
            );
            
            if (currentPhase && currentPhase.end_date) {
              newExpiry = new Date(currentPhase.end_date * 1000);
            } else {
              // Default to one month
              newExpiry.setMonth(newExpiry.getMonth() + 1);
            }
          } 
          // If it's a standard subscription, use current_period_end
          else if ('current_period_end' in createdObj && typeof createdObj.current_period_end === 'number') {
            newExpiry = new Date(createdObj.current_period_end * 1000);
            createdObj.items.data[0].plan.product = "prod_Rol0VAlEnF72TU"
          } 
          // Fallback to one month
          else {
            newExpiry.setMonth(newExpiry.getMonth() + 1);
          }
          
          // Get product ID for tier calculation
          const productId = typeof createdObj.items?.data[0]?.plan?.product === 'string' 
            ? createdObj.items.data[0].plan.product 
            : "prod_Rol0VAlEnF72TU"; // Default to tier 1 product
          
          // Update user with active status and subscription expiry
          await updateUserInDynamo({
            userId: newCustomer.email,
            status: 'active',
            subscriptionExpiry: newExpiry.toISOString(),
            customerId: newCustomerId,
            tier: calculateUserTier(productId),
          });
          
          console.log(`Created active subscription for customer: ${newCustomer.email} with expiry: ${newExpiry.toISOString()}`);
        }
        break;
      case 'customer.subscription.updated':
    //   case 'customer.schedule.updated':
        const updatedObj = stripeEvent.data.object;
        const updatedCustomerId = updatedObj.customer;
        console.log(`Subscription updated: ${updatedObj.id}, Customer ID: ${updatedCustomerId}`);
        
        // Get customer email for the updated subscription
        const updatedCustomer = await stripe.customers.retrieve(updatedCustomerId as string);
        if (!updatedCustomer.deleted && 'email' in updatedCustomer && updatedCustomer.email) {
          // Get subscription expiry date
          let updatedExpiry = new Date();
          
          // If this is a subscription schedule with phases, try to get the end date
          if ('phases' in updatedObj && Array.isArray(updatedObj.phases) && updatedObj.phases.length > 0) {
            const currentPhase = updatedObj.phases.find((phase: any) => 
              phase.start_date <= Math.floor(Date.now() / 1000) && 
              (!phase.end_date || phase.end_date > Math.floor(Date.now() / 1000))
            );
            
            if (currentPhase && currentPhase.end_date) {
              updatedExpiry = new Date(currentPhase.end_date * 1000);
            } else {
              // Default to one month
              updatedExpiry.setMonth(updatedExpiry.getMonth() + 1);
            }
          } 
          // If it's a standard subscription, use current_period_end
          else if ('current_period_end' in updatedObj && typeof updatedObj.current_period_end === 'number') {
            updatedExpiry = new Date(updatedObj.current_period_end * 1000);
          } 
          // Fallback to one month
          else {
            updatedExpiry.setMonth(updatedExpiry.getMonth() + 1);
          }

                    const productId = typeof updatedObj.items?.data[0]?.plan?.product === 'string' 
            ? updatedObj.items.data[0].plan.product 
            : "prod_Rol0VAlEnF72TU"; // Default to tier 1 product
          
          // Update subscription expiry
          await updateUserInDynamo({
            userId: updatedCustomer.email,
            subscriptionExpiry: updatedExpiry.toISOString(),
            status: 'active',
            customerId: updatedCustomerId,
            tier: calculateUserTier(productId),
          });
          
          console.log(`Updated subscription expiry for customer: ${updatedCustomer.email} to: ${updatedExpiry.toISOString()}`);
        }
        break;
      // Add other event types as needed
      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ received: true }),
    };
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.log(`Webhook Error: ${errorMessage}`);
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ error: `Webhook Error: ${errorMessage}` }),
    };
  }
};

/**
 * Helper function to invoke the updateUser Lambda function
 */
async function updateUserInDynamo(userData: { userId: string; [key: string]: any }) {
  try {
    // Create a mock API Gateway event to invoke the updateUser Lambda
    const apiGatewayEvent = {
      pathParameters: { userId: userData.userId },
      body: JSON.stringify(userData)
    };
    
    // Invoke the updateUser Lambda function
    const command = new InvokeCommand({
      FunctionName: process.env.UPDATE_USER_LAMBDA || 'sca-backend-dev-updateUser', // Uses the environment variable we set in serverless.yml
      InvocationType: 'RequestResponse',
      Payload: Buffer.from(JSON.stringify(apiGatewayEvent))
    });
    
    const response = await lambdaClient.send(command);
    
    // Parse and log the response
    const responsePayload = response.Payload ? 
      JSON.parse(Buffer.from(response.Payload).toString()) : 
      null;
    console.log('UpdateUser Lambda response:', responsePayload);
    
    return responsePayload;
  } catch (error) {
    console.error('Error invoking updateUser Lambda:', error);
    throw error;
  }
}

/**
 * Helper function to determine the user tier based on product ID
 * @param productId The Stripe product ID
 * @returns The tier number (1, 2, or 3)
 */
function calculateUserTier(productId: string): number {
  switch (productId) {
    case 'prod_SkhilOrwy7RyNo':
      return 1;
    case 'prod_SkhjXhWsnmTsat':
      return 2;
    case 'prod_SkhjCPy9UV5sbQ':
      return 3;
    default:
      console.log(`Unknown product ID: ${productId}, defaulting to tier 1`);
      return 1; // Default to tier 1 if product ID is unknown
  }
}