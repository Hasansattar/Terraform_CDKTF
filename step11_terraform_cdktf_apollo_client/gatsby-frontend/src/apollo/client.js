import fetch from "cross-fetch"
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client"

export const client = new ApolloClient({
  link: new HttpLink({
    uri:
      "https://ixjtnjukirbz7oejmbocwjb77e.appsync-api.us-east-1.amazonaws.com/graphql", // ENTER YOUR GRAPHQL ENDPOINT HERE
    fetch,
    headers: {
      "x-api-key": "da2-7vz24yfhfvecbcnvfydsc67rte", // ENTER YOUR API KEY HERE
    },
  }),
  cache: new InMemoryCache(),
})