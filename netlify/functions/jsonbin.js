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
      const isAdmin = event.queryStringParameters && event.queryStringParameters.admin === 'true';
      const PROFIT_WINDOW_DAYS = 30; // Define the profit window

      const response = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      
      let record = response.data.record;

      // Ensure default fields are present first
      if (typeof record === 'object' && record !== null) {
        Object.keys(record).forEach(itemName => {
          const item = record[itemName];
          if (typeof item === 'object' && item !== null) {
            if (item.vendLog === undefined) item.vendLog = [];
            if (item.profitVelocity === undefined) item.profitVelocity = 0;
            if (item.composite === undefined) item.composite = 0;
          }
        });
      } else {
        // If record is not a non-null object, log a warning and return an empty object stringified.
        // This ensures the client always receives a parseable JSON that Object.values() can handle.
        console.warn(`JSONbin record was not a non-null object. Type: ${typeof record}, Value: ${JSON.stringify(record)}. Returning empty object.`);
        return {
          statusCode: 200, // Still 200 as the function itself didn't fail, but data is empty/absent
          body: JSON.stringify({}) 
        };
      }

      // Convert record to array for easier processing of scaling parameters
      const itemsArray = Object.values(record);

      // Calculate Scaling Parameters (similar to recalculate-scores.js)
      const allElos = itemsArray.map(item => (typeof item === 'object' && item !== null && item.elo !== undefined) ? item.elo : 0);
      const minElo = allElos.length > 0 ? Math.min(...allElos) : 0;
      const maxElo = allElos.length > 0 ? Math.max(...allElos) : 0;
      
      const itemsForPvScaling = itemsArray.filter(item => (typeof item === 'object' && item !== null && (item.profitVelocity || 0) > 0));
      const activePvs = itemsForPvScaling.map(item => item.profitVelocity);
      const minPV = activePvs.length > 0 ? Math.min(...activePvs) : 0;
      const maxPV = activePvs.length > 0 ? Math.max(...activePvs) : 0;

      const processedRecord = {};
      Object.keys(record).forEach(itemName => {
        // item is the original item from the record, itemToReturn is the copy we modify
        const originalItem = record[itemName]; 
        const itemToReturn = { ...originalItem }; 

        if (isAdmin) {
          itemToReturn.grossMargin = (itemToReturn.price || 0) - (itemToReturn.cost || 0);
          
          const now = Date.now();
          const windowStart = new Date(); // Create new Date object
          windowStart.setDate(windowStart.getDate() - PROFIT_WINDOW_DAYS);
          
          const vendsInWindow = Array.isArray(itemToReturn.vendLog) ? itemToReturn.vendLog.filter(vend => {
            try {
              return vend && vend.ts && new Date(vend.ts) >= windowStart;
            } catch (e) { return false; }
          }).length : 0;
          
          itemToReturn.vendRate = PROFIT_WINDOW_DAYS > 0 ? vendsInWindow / PROFIT_WINDOW_DAYS : 0;
          // profitVelocity and composite are already on itemToReturn due to earlier defaulting

          // Calculate scaledR
          const eloVal = itemToReturn.elo || 0;
          let valR = (maxElo === minElo) ? 0 : (eloVal - minElo) / (maxElo - minElo);
          itemToReturn.scaledR = Math.max(0, Math.min(1, valR));

          // Calculate scaledV
          let valV = 0;
          const currentProfitVelocity = itemToReturn.profitVelocity || 0;
          if (currentProfitVelocity > 0 && maxPV > minPV) {
            valV = (currentProfitVelocity - minPV) / (maxPV - minPV);
          } else if (currentProfitVelocity > 0 && minPV === maxPV && currentProfitVelocity === minPV) {
            valV = 1; 
          }
          itemToReturn.scaledV = Math.max(0, Math.min(1, valV));

        } else {
          // For non-admin, remove sensitive fields
          delete itemToReturn.profitVelocity;
          delete itemToReturn.composite;
          // grossMargin, vendRate, scaledR, scaledV are not calculated/added, so no need to delete
        }
        processedRecord[itemName] = itemToReturn;
      });

      return {
        statusCode: 200,
        body: JSON.stringify(processedRecord)
      };
    }

    if (httpMethod === 'PUT') {
      const data = JSON.parse(body);
      // Ensure default fields for PUT requests as a safety measure
      if (typeof data === 'object' && data !== null) {
        Object.keys(data).forEach(itemName => {
          const item = data[itemName];
          if (typeof item === 'object' && item !== null) {
            if (item.vendLog === undefined) {
              item.vendLog = [];
            }
            if (item.profitVelocity === undefined) {
              item.profitVelocity = 0;
            }
            if (item.composite === undefined) {
              item.composite = 0;
            }
          }
        });
      }
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

    if (httpMethod === 'POST') {
      // Assuming POST is for recording a vend
      let parsedBody;
      try {
        parsedBody = JSON.parse(body);
      } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Invalid JSON format in request body.' }) };
      }

      const { slot, price, ts } = parsedBody;

      if (!slot || typeof price !== 'number' || !ts || typeof ts !== 'string') {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Missing or invalid parameters. Required: slot (any), price (number), ts (string).' })
        };
      }

      // Fetch current data
      let currentRecord;
      try {
        const fetchResponse = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
          headers: { 'X-Master-Key': API_KEY }
        });
        currentRecord = fetchResponse.data.record;
      } catch (fetchError) {
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to fetch current data from JSONbin.', error: fetchError.message })
        };
      }

      if (typeof currentRecord !== 'object' || currentRecord === null) {
         return { statusCode: 500, body: JSON.stringify({ message: 'Data in JSONbin is not in the expected format (object).' }) };
      }

      const itemToUpdate = Object.values(currentRecord).find(item => item.slot === slot);

      if (!itemToUpdate) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: `Item with slot '${slot}' not found.` })
        };
      }

      // Ensure vendLog exists and is an array (should be due to previous migrations/defaults)
      if (!Array.isArray(itemToUpdate.vendLog)) {
        itemToUpdate.vendLog = [];
      }
      itemToUpdate.vendLog.push({ ts, price });
      itemToUpdate.sold = (itemToUpdate.sold || 0) + 1;

      // Save updated data
      try {
        await axios.put(`https://api.jsonbin.io/v3/b/${BIN_ID}`, currentRecord, {
          headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': API_KEY
          }
        });
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Vend recorded successfully.', item: itemToUpdate })
        };
      } catch (updateError) {
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to save updated data to JSONbin.', error: updateError.message })
        };
      }
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  } catch (error) {
    // General catch block for errors not handled within specific methods
    // Ensure it's not accidentally catching JSON.parse errors from PUT/POST if body is not JSON
    if (error instanceof SyntaxError && (event.httpMethod === 'PUT' || event.httpMethod === 'POST')) {
        // This check might be redundant if JSON.parse is wrapped in try-catch locally
        return { statusCode: 400, body: JSON.stringify({ message: 'Invalid JSON format in request body.' }) };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error interacting with JSONbin or processing request.', error: error.message })
    };
  }
};
