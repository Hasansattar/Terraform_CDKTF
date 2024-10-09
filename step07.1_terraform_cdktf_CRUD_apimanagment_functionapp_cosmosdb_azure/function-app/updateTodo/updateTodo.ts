import { CosmosClient } from "@azure/cosmos";

const cosmosConnectionString = process.env.COSMOS_CONNECTION_STRING as string;
const databaseName = process.env.DATABASE_NAME as string;
const todosContainerName = process.env.TODOS_CONTAINER as string;

const client = new CosmosClient(cosmosConnectionString);

type Todo = {
    id: string;
    [key: string]: any; // This allows for additional attributes
};

async function updateTodo(todo: Todo): Promise<Todo | null> {

    const container = client.database(databaseName).container(todosContainerName);

    try {
        // Fetch the existing Todo item
        const { resource: existingTodo } = await container.item(todo.id).read();

        if (!existingTodo) {
            console.log(`Todo with id ${todo.id} not found.`);
            return null;
        }

        // Prepare the updated attributes
        const updatedAttributes = { ...existingTodo, ...todo };
        delete updatedAttributes.id; // Exclude the id from the update

        // Update the Todo item in Cosmos DB
        await container.item(todo.id).replace(updatedAttributes);

        return { ...updatedAttributes, id: todo.id }; // Include id in the returned object
    } catch (err) {
        console.log('Cosmos DB error: ', err);
        return null;
    }
}

export default updateTodo;
