import { DocumentNode } from 'graphql';
import { useContext, useCallback } from 'react';
import { pipe, toPromise } from 'wonka';
import { Context } from '../context';
import { OperationResult } from '../types';
import { CombinedError, createRequest } from '../utils';
import { useImmediateState } from './useImmediateState';

export interface UseMutationState<T> {
  fetching: boolean;
  data?: T;
  error?: CombinedError;
}

export type UseMutationResponse<T, V> = [
  UseMutationState<T>,
  (variables?: V) => Promise<OperationResult<T>>
];

export const useMutation = <T = any, V = object>(
  query: DocumentNode | string,
  fragments?: {
    string: DocumentNode | string;
  }
): UseMutationResponse<T, V> => {
  const client = useContext(Context);
  const [state, setState] = useImmediateState<UseMutationState<T>>({
    fetching: false,
    error: undefined,
    data: undefined,
  });

  const executeMutation = useCallback(
    (variables?: V) => {
      setState({ fetching: true, error: undefined, data: undefined });

      const request = createRequest(query, variables as any, fragments);

      return pipe(
        client.executeMutation(request),
        toPromise
      ).then(result => {
        const { data, error } = result;
        setState({ fetching: false, data, error });
        return result;
      });
    },
    [client, fragments, query, setState]
  );

  return [state, executeMutation];
};
