const axios = require('axios');

exports.handler = async function (event, context) {
  const BIN_ID = '682fa8ce8a456b7966a3f5bc';
  const API_KEY = process.env.X_MASTER_KEY;

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Server configuration error: X_MASTER_KEY is not set.' })
    };
  }

  try {
    const { httpMethod, body } = event;

    if (httpMethod === 'GET') {
      const response = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      return {
        statusCode: 200,
        body: JSON.stringify(response.data.record)
      };
    }

    if (httpMethod === 'PUT') {
      const data = JSON.parse(body);
      const response = await axios.put(`https://api.jsonbin.io/v3/b/${BIN_ID}`, data, {
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': API_KEY
        }
      });
      return {
        statusCode: 200,
        body: JSON.stringify(response.data)
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error interacting with JSONbin', error: error.message })
    };
  }
};
