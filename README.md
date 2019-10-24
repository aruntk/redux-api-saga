# redux-api-saga

REACT API calls made simple

<div> 
<a href="https://www.npmjs.com/package/redux-api-saga">
    <img
      src="https://img.shields.io/npm/v/redux-api-saga.svg" height="20">
  </a>
     <a href="https://www.npmjs.com/package/redux-api-saga">
    <img
      src="https://img.shields.io/npm/dt/redux-api-saga.svg" height="20">
  </a>
  <br/>
</div>

Its an abstraction on top of redux-saga. Takes in a config and gives you a reducer saga and a common action. 

### Setup

```js 
// store.js
import init from 'redux-api-saga';
import { applyMiddleware, createStore } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { all } from 'redux-saga/effects';

const defaultOnSuccess = (result) => {
  console.log(typeof result === 'string' ? result : 'Successful.' );
};
const defaultOnError = (error) => {
  alert(typeof error === 'string' ? error : error.message);
};
const config = [
  {
    path: 'http://localhost:3001/auth',
    method: 'POST',
    name: 'authToken', // API will be referred in action using this name
    mode: 'takeLatest',
    initialResult: null, // this is the initial value,
    onSuccess: defaultOnSuccess,
    onError: defaultOnError,
  },
  {
    path: 'http://localhost:3001/puppyJpg/:imageId',
    method: 'GET',
    name: 'puppyJpg',
    mode: 'takeLatest',
    initialResult: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Indian_pariah_dog_puppy_%288334906336%29.jpg',
  },
];
// default set of headers. you can choose to override this in every action dispatch. 
const getReqHeaders = (state) => ({
  Authorization: `bearer ${state.authToken}`,
});
const options = {
  getReqHeadersDefault: getReqHeaders,
};
const apiSaga = init(config, options);

const reducer = apiSaga.reducer;
const sagas = apiSaga.sagas;
export const action = apiSaga.action;
function* saga() {
  yield all(sagas);
}

// create middlewares
const sagaMiddleware = createSagaMiddleware();
const middleware = applyMiddleware(sagaMiddleware);
// create store
const store = createStore(reducer, middleware);
export default store;
// run saga middleware
sagaMiddleware.run(saga);
```

### Usage

```js
// auth.jsx

import { action } from './store';

...

login(username, password) {
  this.props.dispatch(action({
    name: 'authToken',
    payload: { username, password }, // this will be passed as req.body of the XHR call
    getReqHeaders: () => ({}) // override default header,
  }));
}
```

```js
// puppy.jsx
import { action } from './store';

...

class PuppyImg extends React.Component {
  state = {};
  getPuppyImg = () => {
    this.props.dispatch(action({
      name: 'puppyJpg',
      payload: {},
      params: { imageId: 20345 }, // this will replace the param :imageId
      query: { resolution: 'HD' },
      // You can override success and error hooks
      onSuccess: () => {},
      onError: (error) => {
        console.error(typeof error === 'string' ? error : error.message);
      };
    }));
    // resultant API path -> http://localhost:3001/puppyJpg/20345?resolution=HD
  }
  render() {
    return (
      <div>
        <button onClick={this.getPuppyImg}>
          Test
        </button>
        <img src={this.props.puppyJpg} />
      </div>
    );
  }
}
 
const mapState = (state) => ({
  puppyJpg: state.puppyJpg,
});
 
export default connect(mapState)(PuppyImg);
```

### Cancel a request

Use `onDispatch` hook to get the cancel function

example -> 

```js
class PuppyImg extends React.Component {
  cancelRequest = null
  getPuppyImg = () => {
    this.props.dispatch(action({
      name: 'puppyJpg',
      payload: {},
      params: { imageId: 20345 }, // this will replace the param :imageId
      query: { resolution: 'HD' },
      onDispatch: (cancel, state, payload) => {
        this.cancelRequest = cancel;
      }
    }));
    // resultant API path -> http://localhost:3001/puppyJpg/20345?resolution=HD
  }
  cancelPuppyImgCall = () => {
    this.cancelRequest && this.cancelRequest()
  }
  // Now call cancelPuppyImgCall in case you want to give user an option to cancel the request
```

### Reset state

```js
this.props.dispatch(action({
    name: 'puppyJpg',
    reset: true,
    // if resetPayload is not empty then the state is set to that otherwise to the initialState
    // resetPayload: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Indian_pariah_dog_puppy_%288334906336%29.jpg'
}))

```

