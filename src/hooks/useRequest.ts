import { DocumentNode } from 'graphql';
import { useRef, useMemo } from 'react';
import { GraphQLRequest } from '../types';
import { createRequest } from '../utils';

/** Creates a request from a query and variables but preserves reference equality if the key isn't changing */
export const useRequest = (
  query: string | DocumentNode,
  variables?: any,
  fragments?: { string: string | DocumentNode }
): GraphQLRequest => {
  const prev = useRef<void | GraphQLRequest>(undefined);

  return useMemo(() => {
    const request = createRequest(query, variables, fragments);
    // We manually ensure reference equality if the key hasn't changed
    if (prev.current !== undefined && prev.current.key === request.key) {
      return prev.current;
    } else {
      prev.current = request;
      return request;
    }
  }, [query, variables, fragments]);
};
