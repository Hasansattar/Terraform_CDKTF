type AppSyncEvent = {
  info: {
    fieldName: string;
  };
  arguments: {
    title?: string;
    product?: Product;
  };
};

type Product = {
  name: string;
  price: number;
};

exports.handler = async (event: AppSyncEvent) => {
  const productsArray = [
    { name: "product1", price: 100 },
    { name: "product2", price: 200 },
    { name: "product3", price: 300 },
  ];

  switch (event.info.fieldName) {
    case "products":
      return productsArray;
    case "customProduct":
      if (event.arguments.title) {
        // Find the product with the given title
        const product = productsArray.find(
          (p) => p.name.toLowerCase() === event.arguments.title?.toLowerCase()
        );
        return product || null;
      }
      return null;
    case "addProduct":
      if (event.arguments.product) {
        console.log(" >>> EVENT DATA = ", event.arguments.product);
        // Add the new product to the products array
        productsArray.push(event.arguments.product);
        return event.arguments.product;
      }
      return null;
    default:
      return null;
  }
};
