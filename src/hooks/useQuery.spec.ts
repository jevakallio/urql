import { renderHook, act } from 'react-hooks-testing-library';
import { interval, map, pipe } from 'wonka';

import { createClient } from '../client';
import { useQuery } from './useQuery';
import { RequestPolicy } from 'src/types';

jest.mock('../client', () => {
  const d = { data: 'data', error: 'error' };
  const mock = {
    executeQuery: jest.fn(() =>
      pipe(
        interval(400),
        map(i => ({ data: i, error: i + 1 }))
      )
    ),
  };

  return {
    createClient: () => mock,
    data: d,
  };
});

// @ts-ignore
const client = createClient() as { executeQuery: jest.Mock };

const mockQuery = `
  query todo($id: ID!) {
    todo(id: $id) {
      id
      text
      completed
    }
  }
`;

const mockVariables = {
  id: 1,
};

describe('useQuery', () => {
  beforeAll(() => {
    // eslint-disable-next-line no-console
    console.log(
      'supressing console.error output due to react-test-renderer spam (hooks related)'
    );
    jest.spyOn(global.console, 'error').mockImplementation();
  });

  beforeEach(() => {
    client.executeQuery.mockClear();
  });

  it('should set fetching to true and run effect on first mount', () => {
    const { result } = renderHook(
      ({ query, variables }) => useQuery({ query, variables }),
      { initialProps: { query: mockQuery, variables: mockVariables } }
    );

    const [state] = result.current;
    expect(state).toEqual({
      fetching: true,
      error: undefined,
      data: undefined,
    });
  });

  it('should execute the subscription', async () => {
    const { waitForNextUpdate } = renderHook(
      ({ query, variables }) => useQuery({ query, variables }),
      { initialProps: { query: mockQuery, variables: mockVariables } }
    );

    await waitForNextUpdate();
    expect(client.executeQuery).toBeCalledTimes(1);
  });

  it('should pass query and variables to executeQuery', async () => {
    const { waitForNextUpdate } = renderHook(
      ({ query, variables }) => useQuery({ query, variables }),
      { initialProps: { query: mockQuery, variables: mockVariables } }
    );

    await waitForNextUpdate();
    expect(client.executeQuery).toBeCalledTimes(1);
    expect(client.executeQuery).toBeCalledWith(
      {
        key: expect.any(Number),
        query: expect.any(Object),
        variables: mockVariables,
      },
      {
        requestPolicy: undefined,
      }
    );
  });

  it('should return data from executeQuery', async () => {
    const { result, waitForNextUpdate } = renderHook(
      ({ query, variables }) => useQuery({ query, variables }),
      { initialProps: { query: mockQuery, variables: mockVariables } }
    );

    await waitForNextUpdate();
    const [state] = result.current;
    expect(state).toEqual({
      fetching: false,
      error: 1,
      data: 0,
    });
  });

  it('should update if a new query is received', async () => {
    const { rerender, waitForNextUpdate } = renderHook<
      { query: string; variables?: object },
      {}
    >(({ query, variables }) => useQuery({ query, variables }), {
      initialProps: { query: mockQuery, variables: mockVariables },
    });

    await waitForNextUpdate();
    expect(client.executeQuery).toBeCalledTimes(1);

    const newQuery = `
      query places {
        id
        address
      }
    `;

    rerender({ query: newQuery });
    expect(client.executeQuery).toBeCalledTimes(2);
    expect(client.executeQuery).toHaveBeenNthCalledWith(
      2,
      {
        key: expect.any(Number),
        query: expect.any(Object),
        variables: {},
      },
      {
        requestPolicy: undefined,
      }
    );
  });

  it('should update if new variables are received', async () => {
    const { rerender, waitForNextUpdate } = renderHook<
      { query: string; variables: object },
      {}
    >(({ query, variables }) => useQuery({ query, variables }), {
      initialProps: { query: mockQuery, variables: mockVariables },
    });

    await waitForNextUpdate();
    expect(client.executeQuery).toBeCalledTimes(1);

    const newVariables = {
      id: 2,
    };

    rerender({ query: mockQuery, variables: newVariables });
    expect(client.executeQuery).toBeCalledTimes(2);
    expect(client.executeQuery).toHaveBeenNthCalledWith(
      2,
      {
        key: expect.any(Number),
        query: expect.any(Object),
        variables: newVariables,
      },
      {
        requestPolicy: undefined,
      }
    );
  });

  it('should not update if query and variables are unchanged', async () => {
    const { rerender, waitForNextUpdate } = renderHook(
      ({ query, variables }) => useQuery({ query, variables }),
      {
        initialProps: { query: mockQuery, variables: mockVariables },
      }
    );

    await waitForNextUpdate();
    expect(client.executeQuery).toBeCalledTimes(1);

    rerender({ query: mockQuery, variables: mockVariables });
    expect(client.executeQuery).toBeCalledTimes(1);
  });

  it('should update if a new requestPolicy is provided', async () => {
    const { rerender, waitForNextUpdate } = renderHook(
      ({ query, variables, requestPolicy }) =>
        useQuery({ query, variables, requestPolicy }),
      {
        initialProps: {
          query: mockQuery,
          variables: mockVariables,
          requestPolicy: 'cache-first' as RequestPolicy,
        },
      }
    );

    await waitForNextUpdate();
    expect(client.executeQuery).toBeCalledTimes(1);
    expect(client.executeQuery).toHaveBeenNthCalledWith(
      1,
      {
        key: expect.any(Number),
        query: expect.any(Object),
        variables: mockVariables,
      },
      {
        requestPolicy: 'cache-first',
      }
    );

    rerender({
      query: mockQuery,
      variables: mockVariables,
      requestPolicy: 'network-only',
    });
    expect(client.executeQuery).toBeCalledTimes(2);
    expect(client.executeQuery).toHaveBeenNthCalledWith(
      2,
      {
        key: expect.any(Number),
        query: expect.any(Object),
        variables: mockVariables,
      },
      {
        requestPolicy: 'network-only',
      }
    );
  });

  it('should provide an executeQuery function to be imperatively executed', async () => {
    const { result, waitForNextUpdate } = renderHook(
      ({ query, variables }) => useQuery({ query, variables }),
      { initialProps: { query: mockQuery, variables: mockVariables } }
    );

    await waitForNextUpdate();
    expect(client.executeQuery).toBeCalledTimes(1);

    const [, executeQuery] = result.current;
    act(() => executeQuery());
    await waitForNextUpdate();
    expect(client.executeQuery).toBeCalledTimes(2);
  });

  it('should pause executing the query if pause is true', () => {
    renderHook(
      ({ query, variables, pause }) => useQuery({ query, variables, pause }),
      {
        initialProps: {
          query: mockQuery,
          variables: mockVariables,
          pause: true,
        },
      }
    );

    expect(client.executeQuery).not.toBeCalled();
  });

  it('should pause executing the query if pause updates to true', async () => {
    const { rerender, waitForNextUpdate } = renderHook(
      ({ query, variables, pause }) => useQuery({ query, variables, pause }),
      {
        initialProps: {
          query: mockQuery,
          variables: mockVariables,
          pause: false,
        },
      }
    );

    await waitForNextUpdate();
    expect(client.executeQuery).toBeCalledTimes(1);

    rerender({ query: mockQuery, variables: mockVariables, pause: true });
    expect(client.executeQuery).toBeCalledTimes(1);
  });
});
