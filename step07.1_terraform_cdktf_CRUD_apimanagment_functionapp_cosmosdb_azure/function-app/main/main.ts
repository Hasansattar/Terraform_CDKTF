import { Context,HttpRequest } from "@azure/functions";
import addTodo from "../addTodo/addTodo";
import deleteTodo from "../deleteTodo/deleteTodo";
import getTodos from "../getTodos/getTodos";
import updateTodo from "../updateTodo/updateTodo";

// type Todo = {
//     id: string;
//     title: string;
//     done: boolean;
// };

// type AppSyncEvent = {
//     info: {
//         fieldName: string;
//     };
//     arguments: {
//         todoId?: string; // Made optional since not all fields require todoId
//         todo?: Todo; // Made optional since not all fields require todo
        
//     };
// };

const main = async (context:Context, req:HttpRequest) => {
    context.log("req===>",req)
    const event = req.body; // Get event from the HTTP request body

     context.log("event===>",event)
     context.log("==============================================")
     context.log("==============================================")

     context.log("req===>",req)


     context.log("event.info===>",event.info)


     context.log("event.info.fieldName===>",event.info.fieldName)

    try {
        switch (event.info.fieldName) {
            case "addTodo":
                 // Check if todo is defined before passing to addTodo
                 if (!event.arguments.todo) {
                    context.res = {
                        status: 400,
                        body: "Todo is required.",
                    };
                    return;
                }

                const addedTodo = await addTodo(event.arguments?.todo);
                context.log("========>",addedTodo);
                context.res = {
                    status: 200,
                    body: addedTodo,
                };
                break;

            case "getTodos":
                const todos = await getTodos();
                context.res = {
                    status: 200,
                    body: todos,
                };
                break;

            case "deleteTodo":
                // Check if todoId is defined before passing to deleteTodo
                if (!event.arguments.todoId) {
                    context.res = {
                        status: 400,
                        body: "Todo ID is required.",
                    };
                    return;
                }
                const deletedTodoId = await deleteTodo(event.arguments.todoId);
                context.res = {
                    status: 200,
                    body: deletedTodoId,
                };
                break;

            case "updateTodo":
                 // Check if todo is defined before passing to updateTodo
                 if (!event.arguments.todo) {
                    context.res = {
                        status: 400,
                        body: "Todo is required.",
                    };
                    return;
                }
                const updatedTodo = await updateTodo(event.arguments.todo);
                context.res = {
                    status: 200,
                    body: updatedTodo,
                };
                break;

            default:
                context.res = {
                    status: 400,
                    body: "Unsupported operation.",
                };
                break;
        }
    } catch (error) {
        console.log('Error processing request: ', error);
        context.res = {
            status: 500,
            body: "Internal server error.",
        };
    }
};

export default main;
