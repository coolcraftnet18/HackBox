import React from 'react';
import ReactDOM from 'react-dom';
import './css/Master.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

// import ApolloClient from "apollo-boost";
import {ApolloProvider} from "react-apollo";

import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { HttpLink } from 'apollo-link-http';
import { onError } from 'apollo-link-error';
import { ApolloLink } from 'apollo-link';

//send graphQL requests to this location
// const client = new ApolloClient({
//   uri: "http://localhost:4000/graphql"
// });


//https://www.apollographql.com/docs/react/advanced/boost-migration.html
const client = new ApolloClient({
  link: ApolloLink.from([
    onError(({ graphQLErrors, networkError }) => {
      if (graphQLErrors)
        graphQLErrors.map(({ message, locations, path }) =>
          console.log(
            `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
          ),
        );
      if (networkError) console.log(`[Network error]: ${networkError}`);
    }),
    new HttpLink({
      uri: 'http://localhost:4000/graphql',
      credentials: 'same-origin'
    })
  ]),
  cache: new InMemoryCache()
});

//make requests throughout our app through ApolloProvider
ReactDOM.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById('root')
);

registerServiceWorker();
