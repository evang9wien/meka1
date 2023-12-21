import axios from 'axios';

const getAuthHeader = () => {
  const token = localStorage.getItem('jwt');
  const authHeader = {
    headers: {
      Authorization: 'Bearer ' + token,
    },
  };
  return authHeader;
};

const isUserAuth = async () => {
  try {
    const resp = await axios.post(
      'https://www.evang9.wien/root/wp-json/jwt-auth/v1/token/validate',
      {},
      getAuthHeader()
    );
    console.log(resp);
    return resp.status == 200;
  } catch (error) {
    console.error('JWT Error: ', error.response.data);
    return false;
  }
};

export { getAuthHeader, isUserAuth };
