import * as effects from 'redux-saga/effects';
import { fetchData, CancelToken } from './fetch';
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
    const { payload, name, resetPayload } = action.payload;
    const opt = config.find((o) => {
      return o.name === name;
    });
    if (!opt) {
      return state;
    }
    const existingState = state[opt.name];
    switch (action.type) {
      case `${opt.name}__LOADING`: {
        const newState = Object.assign({}, existingState, { loading: payload });
        return { ...state, [opt.name]: newState };
      }
      case `${opt.name}__ERROR`: {
        const newState = Object.assign({}, existingState, { error: payload });
        return { ...state, [opt.name]: newState };
      }
      case `${opt.name}__SUCCESS`: {
        const newState = Object.assign({}, existingState, { result: payload });
        return { ...state, [opt.name]: newState };
      }
      case `${opt.name}__RESET`: {
        const newState = resetPayload ? Object.assign({}, existingState, { result: resetPayload }) : initialState[opt.name];
        return { ...state, [opt.name]: newState };
      }
      default: {
        return state;
      }
    }
  };

  const sagas = config.map((o) => {
    function* saga({ type, payload, api, onSuccess, onError, getReqHeaders, onDispatch }: AutoSagaArgumentType) {
      if (!o) {
        return;
      }
      const name = o.name;
      const state = yield select();
      const getReqHeadersDefault = options.getReqHeadersDefault || (() => ({}));
      const getReqHeadersHook = getReqHeaders || getReqHeadersDefault;
      const reqHeaders = getReqHeadersHook(state, payload);
      yield put({ type: `${name}__LOADING`, payload: { name, payload: true } });
      yield put({ type: `${name}__ERROR`, payload: { name, payload: '', } });
      const dataReqOptions = o.method !== 'GET' ? { data: payload } : {};
      const source = CancelToken.source();
      const reqOptions = {
        method: o.method,
        headers: reqHeaders,
        cancelToken: source.token,
        ...dataReqOptions,
      };
      const successHook = onSuccess || o.onSuccess;
      const errorHook = onError || o.onError;
      const _onDispatch = onDispatch || o.onDispatch;
      try {
        if (_onDispatch) {
          _onDispatch(source.cancel, state, payload);
        }
        const result = yield call(fetchData, api, reqOptions);
        const processedResult = o.processResult ? o.processResult(result) : result;
        yield put({ type: `${name}__SUCCESS`, payload: { name, payload: processedResult } });
        if (successHook) {
          successHook(result, payload);
        }
      } catch (error) {
        const errorMsg = typeof error === 'string' ? error : error.message;
        yield put({ type: `${name}__ERROR`, payload: { name, payload: errorMsg, } });
        if (errorHook) {
          errorHook(error, payload);
        }
      }
      yield put({ type: `${name}__LOADING`, payload: { name, payload: false } });
    }
    return effects[o.mode || 'takeLatest'](`${o.name}__DISPATCH`, saga);
  });
  const findApiConfigFromName = (name: string) => {
    const opt = config.find((o) => {
      return o.name === name;
    });
    if (!opt) {
      throw new Error(`${name} is not registered in redux-api-saga config`)
    }
    return opt
  }
  const actionFn = ({ name, payload, query, params, onSuccess, onError, onDispatch, reset }: AutoActionArgument) => {
    try {
      const opt = findApiConfigFromName(name)
      const urlParser = options.urlParser || getUrl;
      const api = urlParser(opt.path, params, query);
      const actionType = reset ? 'RESET' : 'DISPATCH';
      return {
        type: `${opt.name}__${actionType}`,
        api,
        payload,
        onSuccess,
        onError,
        onDispatch,
      };
    } catch (err) {
      return {
        type: 'ERROR_IN_PARAMS',
        api: name,
        params,
        query,
        error: err,
      };
    }
  };
  return { reducer, sagas, action: actionFn, initialState };
};

export default init;
