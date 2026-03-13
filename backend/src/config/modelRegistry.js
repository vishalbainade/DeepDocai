const BASE_TEXT_MODELS = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    apiModel: 'gemini-2.5-flash',
    family: 'text',
    order: 1,
    enabled: true,
  },
  {
    id: 'gemini-3-flash',
    label: 'Gemini 3 Flash',
    apiModel: 'gemini-3-flash-preview',
    family: 'text',
    order: 2,
    enabled: true,
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    apiModel: 'gemini-2.5-flash-lite',
    family: 'text',
    order: 3,
    enabled: true,
  },
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    apiModel: 'gemini-2.0-flash',
    family: 'text',
    order: 4,
    enabled: true,
  },
  {
    id: 'gemma-3-1b',
    label: 'Gemma 3 1B',
    apiModel: 'gemma-3-1b-it',
    family: 'text',
    order: 5,
    enabled: true,
  },
  {
    id: 'gemma-3-4b',
    label: 'Gemma 3 4B',
    apiModel: 'gemma-3-4b-it',
    family: 'text',
    order: 6,
    enabled: true,
  },
  {
    id: 'gemma-3-12b',
    label: 'Gemma 3 12B',
    apiModel: 'gemma-3-12b-it',
    family: 'text',
    order: 7,
    enabled: true,
  },
  {
    id: 'gemma-3-27b',
    label: 'Gemma 3 27B',
    apiModel: 'gemma-3-27b-it',
    family: 'text',
    order: 8,
    enabled: true,
  },
];

if (process.env.GEMINI_ENABLE_3_1_FLASH_LITE === 'true') {
  BASE_TEXT_MODELS.splice(3, 0, {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    apiModel: process.env.GEMINI_3_1_FLASH_LITE_MODEL || 'gemini-3.1-flash-lite-preview',
    family: 'text',
    order: 3.5,
    enabled: true,
  });
}

const TEXT_MODEL_REGISTRY = BASE_TEXT_MODELS
  .filter((model) => model.enabled)
  .sort((left, right) => left.order - right.order);

const TEXT_MODEL_BY_ID = new Map(TEXT_MODEL_REGISTRY.map((model) => [model.id, model]));
const TEXT_MODEL_BY_API = new Map(TEXT_MODEL_REGISTRY.map((model) => [model.apiModel, model]));

export const getAvailableTextModels = () =>
  TEXT_MODEL_REGISTRY.map((model) => ({
    id: model.id,
    label: model.label,
    apiModel: model.apiModel,
  }));

export const resolveTextModel = (modelIdOrApiModel) => {
  if (!modelIdOrApiModel) {
    return TEXT_MODEL_REGISTRY[0];
  }

  return TEXT_MODEL_BY_ID.get(modelIdOrApiModel) || TEXT_MODEL_BY_API.get(modelIdOrApiModel) || TEXT_MODEL_REGISTRY[0];
};

export const normalizeTextModel = (modelIdOrApiModel) => resolveTextModel(modelIdOrApiModel).apiModel;

export const getTextFallbackModels = (preferredModelIdOrApiModel = null) => {
  const preferred = normalizeTextModel(preferredModelIdOrApiModel);
  return TEXT_MODEL_REGISTRY
    .map((model) => model.apiModel)
    .filter((apiModel) => apiModel !== preferred);
};

export const isUnsupportedModelError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const status = error?.status || error?.httpStatusCode || error?.response?.status || null;

  return (
    status === 404 ||
    status === 400 ||
    message.includes('not found for api version') ||
    message.includes('is not supported for generatecontent') ||
    message.includes('models/') && message.includes('not found')
  );
};

export const DEFAULT_TEXT_MODEL = TEXT_MODEL_REGISTRY[0];
