module.exports = async function (context:any, req:any) {
  context.log('HTTP trigger function processed a request.');
  
  const name = req.query.name || (req.body && req.body.name) || "World";
  const responseMessage = `Hello, ${name}. This HTTP triggered function executed successfully.`;

  context.res = {
       status: 200, /* Defaults to 200 */
      body: responseMessage
  };
};
