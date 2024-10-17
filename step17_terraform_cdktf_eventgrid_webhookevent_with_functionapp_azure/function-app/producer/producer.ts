import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { EventGridPublisherClient, AzureKeyCredential } from "@azure/eventgrid";

// Get Event Grid settings from environment variables
// const eventGridEndpoint = process.env["EVENT_GRID_TOPIC_URL"]; // Event Grid Topic URL
const eventGridEndpoint = `https://${process.env.EVENT_GRID_TOPIC_NAME}.australiaeast-1.eventgrid.azure.net/api/events`;
   const eventGridKey = `${process.env.EVENT_GRID_KEY}`; // Event Grid Access Key
// const eventGridKey = "12345678"


const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log("HTTP trigger function processed a request.");

  // Initialize EventGridPublisherClient
  const client = new EventGridPublisherClient(
    eventGridEndpoint,
    "EventGrid", // Using EventGrid schema
    new AzureKeyCredential(eventGridKey)
  );


  context.log("client===>",client);
  // Create event data
  const eventData = req.body || {
    subject: "Sample.Subject",
    eventType: "Sample.EventType",
    data: {
      message: "Hello from Producer using EventGrid library!",
    },
    dataVersion: "1.0",
  };

  try {
    // Send event to Event Grid
    const sendEvent= await client.send([eventData]);

    context.log("sendEvent===>",sendEvent);

    context.res = {
      status: 200,
      body: "Event sent to Event Grid successfully!",
    };
  } catch (error) {
    context.log.error("Error sending event to Event Grid:", error);

    context.res = {
      status: 500,
      body: "Failed to send event to Event Grid",
    };
  }
};

export default httpTrigger;
