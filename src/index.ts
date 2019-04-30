import * as effects from 'redux-saga/effects';
import { fetchData } from './fetch';
import * as Immutable from 'seamless-immutable';
import {
  ActionType,
  AutoSagaConfig,
  OptionsType,
  AutoActionArgument,
  AutoSagaArgumentType,
} from './type';
import { getUrl } from './url';

const { call, put, select } = effects;


const init = (config: AutoSagaConfig[], options: OptionsType) => {
  const initialStates = config.map((o) => {
    return {
      [o.name]: {
        result: o.initialResult,
        loading: false,
        error: '',
      }
    };
  });

  const iState: any = Object.assign({}, ...initialStates);

  const initialState = Immutable.from(iState);

  const reducer = (state = initialState, action: ActionType<any>) => {
    if (action.type === 'RESET_STATE') {
      return initialState;
    }
    if (!action.payload) {
      return state;
    }
    const { payload, name } = action.payload;
    const opt = config.find((o) => {
      return o.name === name;
    });
    if (!opt) {
      return state;
    }
    const existingState = state[opt.name];
    switch (action.type) {
      case `${opt.name}_LOADING`: {
        const newState = Object.assign({}, existingState, { loading: payload });
        return { ...state, [opt.name]: newState };
      }
      case `${opt.name}_ERROR`: {
        const newState = Object.assign({}, existingState, { error: payload });
        return { ...state, [opt.name]: newState };
      }
      case `${opt.name}_SUCCESS`: {
        const newState = Object.assign({}, existingState, { result: payload });
        return { ...state, [opt.name]: newState };
      }
      default: {
        return state;
      }
    }
  };

  const sagas = config.map((o) => {
    function* saga({ type, payload, api, onSuccess, onError, getReqHeaders }: AutoSagaArgumentType) {
      if (!o) {
        return;
      }
      const state = yield select();
      const getReqHeadersDefault = options.getReqHeadersDefault || (() => ({}));
      const getReqHeadersHook = getReqHeaders || getReqHeadersDefault;
      const reqHeaders = getReqHeadersHook(state, payload);
      yield put({ type: `${type}_LOADING`, payload: { name: type, payload: true } });
      yield put({ type: `${type}_ERROR`, payload: { name: type, payload: '', } });
      const dataReqOptions = o.method !== 'GET' ? { data: payload } : {};
      const reqOptions = {
        method: o.method,
        headers: reqHeaders,
        ...dataReqOptions,
      };
      const successHook = onSuccess || o.onSuccess;
      const errorHook = onError || o.onError;
      try {
        const result = yield call(fetchData, api, reqOptions);
        const processedResult = o.processResult ? o.processResult(result) : result;
        yield put({ type: `${type}_SUCCESS`, payload: { name: type, payload: processedResult } });
        if (successHook) {
          successHook(result, payload);
        }
      } catch (error) {
        const errorMsg = typeof error === 'string' ? error : error.message;
        yield put({ type: `${type}_ERROR`, payload: { name: type, payload: errorMsg, } });
        if (errorHook) {
          errorHook(error, payload);
        }
      }
      yield put({ type: `${type}_LOADING`, payload: { name: type, payload: false } });
    }
    return effects[o.mode || 'takeLatest'](`${o.name}`, saga);
  });
  const actionFn = ({ name, payload, query, params, onSuccess, onError }: AutoActionArgument) => {
    const opt = config.find((o) => {
      return o.name === name;
    });
    if (!opt) {
      return { type: 'ERROR_IN_PARAMS' };
    }
    const urlParser = options.urlParser || getUrl;
    const api = urlParser(opt.path, params, query);
    try {
      return {
        type: opt.name,
        api,
        payload,
        onSuccess,
        onError,
      };
    } catch (err) {
      return { type: 'ERROR_IN_PARAMS' };
    }
  };
  return { reducer, sagas, action: actionFn };
};

export default init;
