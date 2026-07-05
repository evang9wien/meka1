import axios from 'axios';

const getAuthHeader = (): { headers: { Authorization: string } } => {
  const token = localStorage.getItem('jwt');
  return {
    headers: {
      Authorization: 'Bearer ' + token,
    },
  };
};

const isUserAuth = async (): Promise<boolean> => {
  try {
    const resp = await axios.post(
      'https://www.evang9.wien/root/wp-json/jwt-auth/v1/token/validate',
      {},
      getAuthHeader()
    );
    console.log(resp);
    return resp.status === 200;
  } catch (error) {
    console.error('JWT Error: ', (error as { response?: { data?: unknown } })?.response?.data);
    return false;
  }
};

export { getAuthHeader, isUserAuth };
