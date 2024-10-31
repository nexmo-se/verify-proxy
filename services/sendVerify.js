import axios from 'axios';

export const sendVerify = async (body, token) => {
  try {
    let [apiKey, apiSecret] = Buffer.from(token, 'base64').toString('utf8').split(':');
    if (apiKey === process.env.VCR_API_ACCOUNT_ID) {
      body.fraud_check = false;
    }
    const data = JSON.stringify(body);
    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://api.nexmo.com/v2/verify/',
      headers: {
        'Content-Type': 'application/json',
        // Authorization: `Basic ${token}`,
        Authorization: `${token}`,
      },
      data: data,
    };

    const response = await axios.request(config);

    // Log and return the response data
    console.log(JSON.stringify(response.data));
    return response.data;
  } catch (error) {
    console.log('error calling verify API');
    // Log the error and rethrow it
    console.log(error.data);
    throw error;
  }
};
