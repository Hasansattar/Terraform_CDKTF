// module.exports = async function (context:any, req:any) {
//   const eventGridEvent = req.body;

//   context.log('Received events:', eventGridEvent);

//   if (eventGridEvent && eventGridEvent.eventType === "Microsoft.EventGrid.SubscriptionValidation") 
//   {
//   // Process the event data
//   eventGridEvent.forEach((event: any) => {
//       context.log(`Event received: ${JSON.stringify(event)}`);
//       // Add your event processing logic here
//   });
//   }
//   context.res = {
//       status: 200,
//       body: "Events processed successfully",
//   };
// };

// =====================

// import { AzureFunction, Context, HttpRequest } from "@azure/functions";

// const httpTrigger: AzureFunction = async function (
//   context: Context,
//   req: HttpRequest
// ): Promise<void> {
//   context.log("HTTP trigger function received a request.");

//   try {
//     const requestBody = req.body;

//     // Check for Event Grid validation request
//     if (requestBody && requestBody.validationCode) {
//       const validationCode = requestBody.validationCode;
//       context.log(`Validation code received: ${validationCode}`);

//       // Respond with the validation code in the correct format
//       context.res = {
//         status: 200,
//         body: { validationResponse: validationCode },
//         headers: {
//           "Content-Type": "application/json",
//         },
//       };
//       return;
//     }

//     // Handle other events (if no validation code)
//     context.log("Processing actual event...");

//     // Here you would process the incoming event
//     // You can access the event data from `requestBody`

//     // Respond to indicate event was processed successfully
//     context.res = {
//       status: 200,
//       body: "Events processed successfully.",
//     };
//   } catch (error) {
//     context.log.error("Error processing the event", error);
//     context.res = {
//       status: 500,
//       body: `Error: ${error}`,
//     };
//   }
// };

// export default httpTrigger;

// ==============================

// import { AzureFunction, Context, HttpRequest } from "@azure/functions";

// const httpTrigger: AzureFunction = async function (
//   context: Context,
//   req: HttpRequest
// ): Promise<void> {
//   context.log("HTTP trigger function processed a request.");

//   // Extract the request body
//   const requestBody = req.body;
//   context.log("requestBody===>",requestBody);
//   context.log("requestBody.validationCode===>",requestBody.validationCode);

//   // Check if it's a validation event from Event Grid
//    if (requestBody && requestBody.validationCode) {
//     const validationCode = requestBody.validationCode;
//     context.log(`Validation code received: ${validationCode}`);

//     // Respond with the validation code in the required format
//     context.res = {
//       status: 200,
//       body: {
//         validationResponse: validationCode,  // Respond with the validation code
//       },
//     };
//     return;
//    }

//   // Process other event grid events here
//   context.log("Event grid event received, processing event...");
  
//   // Respond with success after processing
//   context.res = {
//     status: 200,
//     body: "Events processed successfully.",
//   };
// };

// export default httpTrigger;

 import {  Context, HttpRequest,  } from "@azure/functions";

module.exports = async function (context:Context, req:HttpRequest) {
  const body = req.body;

  
  context.log('body[0].eventType===>', body[0].eventType);
  

  // Check if the request contains a validation event
  if (body && body[0] && body[0].data && body[0].eventType === "Microsoft.EventGrid.SubscriptionValidationEvent") {
      const validationCode = body[0].data.validationCode;
      context.log(`Received validation request. Validation code: ${validationCode}`);

      // Return the validation code in the correct format
      context.res = {
          status: 200,
          body: {
              validationResponse: validationCode
          }
      };
  } 
  else if (Array.isArray(body) && body.length > 0){
      // Handle actual event data
      context.log('Event received:', JSON.stringify(body));

// Handle actual event data
body.forEach(event => {
  context.log('Processing event:', JSON.stringify(event));
  // Add your custom logic to process each event
});
      

      context.res = {
          status: 200,
          body: "Events processed successfully."
      };
  }
  else {
    context.res = {
        status: 400,
        body: "No valid event data received."
    };
}
};
