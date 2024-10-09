import { CosmosClient } from "@azure/cosmos";

const cosmosConnectionString = process.env.COSMOS_CONNECTION_STRING as string;
const databaseName = process.env.DATABASE_NAME as string;
const todosContainerName = process.env.TODOS_CONTAINER as string;

const client = new CosmosClient(cosmosConnectionString);

async function getTodos(): Promise<any[] | null> {
    const container = client.database(databaseName).container(todosContainerName);

    try {
        const { resources: todos } = await container.items.readAll().fetchAll();
        return todos; // Return all Todos
    } catch (err) {
        console.log('Cosmos DB error: ', err);
        return null;
    }
}

export default getTodos;
