//Will parse the query using gql
import gql from 'graphql-tag';

import {ROOM, RESPONSE} from './gql_types';

export const FindRoomQuery = gql`
query($code: String!) {
  findRoom(code: $code) {
    ${ROOM}
  }
}
`;

export const RoomsQuery = gql`{
  rooms {
    ${ROOM}
  }
}
`;

export const RetrievePromptsQuery = gql`
  query($code: String!, $username: String!) {
    retrievePlayerPrompts(code: $code, username: $username) {
      ${RESPONSE}
    }
  }
`;


