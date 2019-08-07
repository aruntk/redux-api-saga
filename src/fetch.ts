import axios, { AxiosResponse, AxiosError } from 'axios';

export const fetchData = (url: string, options = {}) => {
  return new Promise((resolve, reject) => {
    return axios(url, options)
      .then((response: AxiosResponse) => (response.status !== 200 ? reject(response) : response))
      .then((response: AxiosResponse) => response.data)
      .then((response: AxiosResponse) => resolve(response))
      .catch((error: AxiosError) => {
        return reject(error);
      });
  });
};

export const CancelToken = axios.CancelToken
