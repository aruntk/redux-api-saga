import * as qs from 'query-string';
import { FlatObj } from './type';

export const replaceUrlParams = (api: string, params: FlatObj) => {
  return api.split('/').map((section) => {
    if (section.match(/^:.*/ig)) {
      const y = section.substr(1);
      if (params.hasOwnProperty(y)) {
        return `${params[y]}`;
      }
    }
    return section;
  }).join('/');
};

const objectIsEmpty = (obj: Object) => !obj || Object.keys(obj).length === 0;

export const getUrl = (api: string, params: FlatObj = {}, query: Object = {}) => {
  const apiWithParams = objectIsEmpty(params) ? api : replaceUrlParams(api, params);
  const queryString = objectIsEmpty(query) ? '' : `?${qs.stringify(query)}`;
  return `${apiWithParams}${queryString}`;
};

