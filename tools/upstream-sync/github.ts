import type { ReleaseTag } from "./model.ts";

type Repository = { owner: string; name: string };

type GraphqlResponse = {
  data?: {
    repository?: {
      refs: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: Array<{
          name: string;
          target?: { committedDate?: string; target?: { committedDate?: string } };
        }>;
      };
    };
  };
  errors?: Array<{ message: string }>;
};

const query = `
  query($owner: String!, $repo: String!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      refs(refPrefix: "refs/tags/", first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          name
          target {
            ... on Commit { committedDate }
            ... on Tag { target { ... on Commit { committedDate } } }
          }
        }
      }
    }
  }
`;

export type GraphqlClient = (body: { query: string; variables: Record<string, unknown> }) => Promise<GraphqlResponse>;

export function createGraphqlClient(token: string, fetcher: typeof fetch = fetch): GraphqlClient {
  return async (body) => {
    const response = await fetcher("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "pob-web-upstream-sync",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`GitHub GraphQL request failed: ${response.status} ${response.statusText}`);
    return (await response.json()) as GraphqlResponse;
  };
}

export async function getLatestTags(client: GraphqlClient, repository: Repository, limit = 10): Promise<ReleaseTag[]> {
  const tags: ReleaseTag[] = [];
  let cursor: string | null = null;

  do {
    const response = await client({ query, variables: { owner: repository.owner, repo: repository.name, cursor } });
    if (response.errors?.length) throw new Error(response.errors.map((error) => error.message).join("\n"));
    const refs = response.data?.repository?.refs;
    if (!refs) throw new Error(`GitHub repository not found: ${repository.owner}/${repository.name}`);

    for (const node of refs.nodes) {
      const committedDate = node.target?.target?.committedDate ?? node.target?.committedDate;
      if (committedDate) tags.push({ name: node.name, committedDate });
    }

    cursor = refs.pageInfo.hasNextPage ? refs.pageInfo.endCursor : null;
    if (refs.pageInfo.hasNextPage && !cursor) throw new Error("GitHub returned a paginated response without a cursor");
  } while (cursor);

  return tags
    .toSorted((left, right) => Date.parse(right.committedDate) - Date.parse(left.committedDate))
    .slice(0, limit);
}
