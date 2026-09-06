// Static site: the shell prerenders, the data arrives from the Hacker News API
// in the browser. There is no server at runtime to render against.
export const prerender = true;
export const ssr = false;

export const trailingSlash = 'always';
