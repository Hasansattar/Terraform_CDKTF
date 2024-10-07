// module.exports = async function (context:any, req:any) {
//   const query = req.body.query;
//   let name = "World"; // default value
  
//   // Parse the query to get the "name" argument if provided
//   if (query.includes("hello") && query.includes("name")) {
//       const queryNameMatch = query.match(/name\s*:\s*"([^"]*)"/);
//       if (queryNameMatch && queryNameMatch[1]) {
//           name = queryNameMatch[1];
//       }
//   }

//   context.res = {
//       // Respond with a greeting message
//       body: JSON.stringify({
//           data: {
//               hello: `Hello, ${name}!`
//           }
//       }),
//       headers: { 'Content-Type': 'application/json' }
//   };
// };


const { v4: uuidv4 } = require('uuid'); // For generating unique IDs for users

let users:any = []; // Temporary in-memory storage for users

module.exports = async function (context:any, req:any) {
    const query = req.body.query;

    // Handle different GraphQL queries and mutations
    if (query.includes('hello')) {
        context.res = {
            body: JSON.stringify({
                data: {
                    hello: 'Hello, World!'
                }
            }),
            headers: { 'Content-Type': 'application/json' }
        };
        return;
    }

    if (query.includes('getUser')) {
        const idMatch = query.match(/id\s*:\s*"([^"]*)"/);
        if (idMatch && idMatch[1]) {
            const user = users.find((u: { id: any; }) => u.id === idMatch[1]);
            if (user) {
                context.res = {
                    body: JSON.stringify({
                        data: {
                            getUser: user
                        }
                    }),
                    headers: { 'Content-Type': 'application/json' }
                };
            } else {
                context.res = {
                    status: 404,
                    body: JSON.stringify({
                        errors: [{ message: 'User not found' }]
                    }),
                    headers: { 'Content-Type': 'application/json' }
                };
            }
        }
        return;
    }

    if (query.includes('createUser')) {
        const nameMatch = query.match(/name\s*:\s*"([^"]*)"/);
        const emailMatch = query.match(/email\s*:\s*"([^"]*)"/);
        if (nameMatch && emailMatch && nameMatch[1] && emailMatch[1]) {
            const newUser = {
                id: uuidv4(),
                name: nameMatch[1],
                email: emailMatch[1]
            };
            users.push(newUser);

            context.res = {
                body: JSON.stringify({
                    data: {
                        createUser: newUser
                    }
                }),
                headers: { 'Content-Type': 'application/json' }
            };
        } else {
            context.res = {
                status: 400,
                body: JSON.stringify({
                    errors: [{ message: 'Invalid input' }]
                }),
                headers: { 'Content-Type': 'application/json' }
            };
        }
        return;
    }

    // If no valid query/mutation was found, return an error
    context.res = {
        status: 400,
        body: JSON.stringify({
            errors: [{ message: 'Invalid query or mutation' }]
        }),
        headers: { 'Content-Type': 'application/json' }
    };
};

