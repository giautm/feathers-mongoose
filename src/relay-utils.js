import {
  base64,
  unbase64,
} from './base64';

export function getOffsetsFromArgs(args, count) {
  const { after, before, first, last } = args;
  const beforeOffset = getOffsetWithDefault(before, count);
  const afterOffset = getOffsetWithDefault(after, -1);

  let startOffset = Math.max(afterOffset, -1) + 1;
  let endOffset = Math.min(beforeOffset, count);

  if (typeof first === 'number') {
    if (first < 0) {
      throw new Error('Argument "first" must be a non-negative integer');
    }

    endOffset = Math.min(endOffset, startOffset + first);
  }
  if (typeof last === 'number') {
    if (last < 0) {
      throw new Error('Argument "last" must be a non-negative integer');
    }

    startOffset = Math.max(startOffset, endOffset - last);
  }

  return {
    beforeOffset,
    afterOffset,
    startOffset,
    endOffset,
  };
}

export function paginateFromRelayArgs(args, count) {
  const { endOffset, startOffset } = getOffsetsFromArgs(args, count);
  return {
    $limit: endOffset - startOffset,
    $skip: Math.max(startOffset, 0)
  };
}

export function connectionFromSlice(slice, args, count) {
  const { after, before, first, last } = args;
  const {
    startOffset,
    endOffset,
    beforeOffset,
    afterOffset,
  } = getOffsetsFromArgs(args, count);

  const edges = slice.map((value, index) => ({
    cursor: offsetToCursor(startOffset + index),
    node: value
  }));

  const firstEdge = edges[0];
  const lastEdge = edges[edges.length - 1];
  const lowerBound = after ? afterOffset + 1 : 0;
  const upperBound = before ? Math.min(beforeOffset, count) : count;

  return {
    edges,
    pageInfo: {
      startCursor: firstEdge ? firstEdge.cursor : null,
      endCursor: lastEdge ? lastEdge.cursor : null,
      hasPreviousPage: last !== null ? startOffset > lowerBound : false,
      hasNextPage: first !== null ? endOffset < upperBound : false,
    },
  };
}

const PREFIX = 'mongodbconnection:';

/**
 * Creates the cursor string from an offset.
 */
export function offsetToCursor(offset) {
  return base64(PREFIX + offset);
}

/**
 * Rederives the offset from the cursor string
 */
export function cursorToOffset(cursor) {
  return parseInt(unbase64(cursor).substring(PREFIX.length), 10);
}

/**
 * Given an optional cursor and a default offset, returns the offset to use;
 * if the cursor contains a valid offset, that will be used, otherwise it will
 * be the default.
 */
export function getOffsetWithDefault(cursor, defaultOffset) {
  if (cursor === undefined) {
    return defaultOffset;
  }

  const offset = cursorToOffset(cursor);
  return isNaN(offset) ? defaultOffset : offset;
}
