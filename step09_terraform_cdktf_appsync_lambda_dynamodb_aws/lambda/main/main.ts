import addTodo from '../addTodo/addTodo';
import deleteTodo from '../deleteTodo/deleteTodo';
import getTodos from '../getTodos/getTodos';
import updateTodo from '../updateTodo/updateTodo';


type Todo = {
  id: string;
  title: string;
  done: boolean;
};

type AppSyncEvent = {
    info: {
        fieldName: string
    },
    arguments: {
        todoId: string,
        todo: Todo
    }
}

exports.handler = async (event: AppSyncEvent) => {
    switch (event.info.fieldName) {

        case "addTodo":
            return await addTodo(event.arguments.todo);
        case "getTodos":
            return await getTodos();
        case "deleteTodo":
            return await deleteTodo(event.arguments.todoId);
        case "updateTodo":
            return await updateTodo(event.arguments.todo);
        default:
            return null;
    }
}