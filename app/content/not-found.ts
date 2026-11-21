/**
 * An unknown post, page or tag renders the 404 page in place,
 * keeping the URL, instead of failing the route.
 */
export async function orNotFound<Model>(load: () => Promise<Model>) {
  try {
    return await load();
  } catch (error) {
    if (isNotFound(error)) return null;

    throw error;
  }
}

function isNotFound(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 404
  );
}
