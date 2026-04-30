import { normalizeBaseUrl } from './utils.js';

async function apiFetch(path, { baseUrl, token, query } = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (!normalizedBaseUrl || !token) throw new Error('Canvas base URL and access token are required.');

  const url = new URL(path, `${normalizedBaseUrl}/`);
  if (query && typeof query === 'object') {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Canvas API error (${response.status}): ${text || response.statusText}`);
  }
  return response;
}

function parseNextLink(linkHeader) {
  if (!linkHeader) return null;
  const links = linkHeader.split(',').map((part) => part.trim());
  for (const link of links) {
    const match = link.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match && match[2] === 'next') return match[1];
  }
  return null;
}

async function fetchAllPages(path, config) {
  const results = [];
  let nextUrl = null;
  let firstPass = true;

  while (firstPass || nextUrl) {
    const response = firstPass
      ? await apiFetch(path, config)
      : await fetch(nextUrl, { headers: { Authorization: `Bearer ${config.token}` } });

    if (!response.ok) throw new Error(`Canvas pagination error (${response.status}).`);
    const data = await response.json();
    if (Array.isArray(data)) results.push(...data);
    nextUrl = parseNextLink(response.headers.get('Link'));
    firstPass = false;
  }

  return results;
}

export async function fetchCurrentUser(config) {
  const response = await apiFetch('/api/v1/users/self', config);
  return response.json();
}

export async function fetchActiveCourses(config) {
  return fetchAllPages('/api/v1/courses', {
    ...config,
    query: { enrollment_state: 'active', per_page: '100', include: ['term'] }
  });
}

export async function fetchCourseAssignments(courseId, config) {
  return fetchAllPages(`/api/v1/courses/${courseId}/assignments`, {
    ...config,
    query: { per_page: '100' }
  });
}

export async function fetchSubmission(courseId, assignmentId, config) {
  const response = await apiFetch(`/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/self`, config);
  return response.json();
}
