import * as geminiProvider from './geminiProvider.js';
import * as openRouterProvider from './openRouterProvider.js';
import * as glmProvider from './glmProvider.js';
import * as nvidiaProvider from './nvidiaProvider.js';

/**
 * Provider Registry
 * Maps provider slugs to their implementations.
 */
const providers = {
  google: geminiProvider,
  openrouter: openRouterProvider,
  glm: glmProvider,
  nvidia: nvidiaProvider,
};

export const getProvider = (slug) => providers[slug] || null;
export const getAllProviders = () => providers;
export const hasProvider = (slug) => slug in providers;

export default { getProvider, getAllProviders, hasProvider };
