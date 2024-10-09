import { CosmosClient } from "@azure/cosmos";

const cosmosConnectionString = process.env.COSMOS_CONNECTION_STRING as string;
const databaseName = process.env.DATABASE_NAME as string;
const todosContainerName = process.env.TODOS_CONTAINER as string;

const client = new CosmosClient(cosmosConnectionString);

async function deleteTodo(todoId: string): Promise<string | null> {
    const container = client.database(databaseName).container(todosContainerName);

    try {
        const { resource: deletedTodo } = await container.item(todoId, todoId).delete();
        return deletedTodo.id; // Return the ID of the deleted Todo
    } catch (err) {
        console.log('Cosmos DB error: ', err);
        return null;
    }
}

export default deleteTodo;
