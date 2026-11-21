import { useRecommendedStore } from '@warp-drive/core';
import { JSONAPICache } from '@warp-drive/json-api';

import { ContentHandler } from '../content/handler.ts';
import { schemas } from '../content/schemas.ts';

const Store = useRecommendedStore({
  cache: JSONAPICache,
  handlers: [ContentHandler],
  schemas,
});

type Store = InstanceType<typeof Store>;

export default Store;
