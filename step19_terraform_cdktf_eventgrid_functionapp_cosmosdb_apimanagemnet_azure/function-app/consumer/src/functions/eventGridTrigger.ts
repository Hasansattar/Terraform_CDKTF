import { app, EventGridEvent, InvocationContext } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";


// Initialize Cosmos DB Client
const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING || "");
const database = client.database(process.env.DATABASE_NAME || "");  // Set your database name
const container = database.container(process.env.TODOS_CONTAINER || "");  // Set your container name

export async function eventGridTrigger(event: EventGridEvent, context: InvocationContext): Promise<void> {
   
    context.log('Event grid function processed event:', event);

    context.log("client====>",client);
    context.log("database====>",database);
    context.log("container====>",container);


  const  resource = await container.items.create(event);

  context.log('Event  data add into database:', resource);

}

app.eventGrid('eventGridTrigger', {
    handler: eventGridTrigger
});
