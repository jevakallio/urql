import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { getKeyForRequest } from './keyForQuery';
import { GraphQLRequest } from '../types';

const toDocument = (d: string | DocumentNode): DocumentNode =>
  typeof d === 'string' ? gql([d]) : d;

const includeFragments = (
  query: DocumentNode,
  fragments: { string: string | DocumentNode }
): DocumentNode => {
  return {
    ...query,
    definitions: [
      ...query.definitions,
      ...Object.entries(fragments).map(([name, fragment]) => ({
        ...toDocument(fragment).definitions[0],
        name: { kind: 'Name', value: name },
      })),
    ],
  };
};

export const createRequest = (
  q: string | DocumentNode,
  vars?: object,
  fragments?: { string: string | DocumentNode }
): GraphQLRequest => {
  const query = toDocument(q);
  const queryWithFragments = fragments
    ? includeFragments(query, fragments)
    : query;

  return {
    key: getKeyForRequest(queryWithFragments, vars),
    query: queryWithFragments,
    variables: vars || {},
  };
};
