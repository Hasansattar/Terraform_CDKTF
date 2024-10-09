import { CosmosClient } from "@azure/cosmos";
// import { Context } from "@azure/functions";

type Todo = {
  id: string;
  title: string;
  done: boolean;
};

// Initialize Cosmos DB Client
const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING || "");
const database = client.database(process.env.DATABASE_NAME || "");  // Set your database name
const container = database.container(process.env.TODOS_CONTAINER || "");  // Set your container name






async function addTodo(todo: Todo) {

  try{

  
  console.log("====>todo",todo);

  console.log("client====>",client);
  console.log("database====>",database);
  console.log("container====>",container);

  // context.log("====>todo",todo);

  // context.log("client====>",client);
  // context.log("database====>",database);
  // context.log("container====>",container);

  const item = {
    id: todo.id,
    title: todo.title,
    done: todo.done,
  };

  console.log("item==>",item);

  
    const { resource: createdTodo } = await container.items.create(item);
    return createdTodo;
  } catch (err:any) {
    console.log("CosmosDB error:", err.message || err);
    throw new Error("Error creating the Todo item in CosmosDB: " + err.message);
    return null;
  }
}

export default addTodo;
