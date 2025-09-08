const axios = require('axios');

// Attempt to get BIN_ID from environment, fallback to hardcoded if not set or for local dev
const BIN_ID = process.env.JSONBIN_ID || '682fa8ce8a456b7966a3f5bc'; 
const API_KEY = process.env.X_MASTER_KEY;

// Scoring weights with defaults
const SCORING_WEIGHT_R = parseFloat(process.env.SCORING_WEIGHT_R) || 0.6;
const SCORING_WEIGHT_V = parseFloat(process.env.SCORING_WEIGHT_V) || 0.4;

// Profit window days with default and validation
let PROFIT_WINDOW_DAYS = parseInt(process.env.PROFIT_WINDOW_DAYS, 10) || 30;
if (isNaN(PROFIT_WINDOW_DAYS) || PROFIT_WINDOW_DAYS <= 0) {
  console.warn(`Invalid PROFIT_WINDOW_DAYS: ${process.env.PROFIT_WINDOW_DAYS}. Defaulting to 30.`);
  PROFIT_WINDOW_DAYS = 30;
}

exports.handler = async function(event, context) {
  if (!API_KEY) {
    console.error('X_MASTER_KEY is not set. Cannot update scores.');
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Server configuration error: X_MASTER_KEY is not set.' })
    };
  }

  let data; 
  try {
    const response = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': API_KEY }
    });
    data = response.data.record; 

    // Validate that data is a non-null object
    if (typeof data !== 'object' || data === null) {
      console.error(`Fetched data.record is not a non-null object. Type: ${typeof data}, Value: ${JSON.stringify(data)}. Aborting recalculate-scores.`);
      return { statusCode: 500, body: JSON.stringify({ message: 'Fetched data format error: Expected a non-null object of items.' }) };
    }

  } catch (error) {
    console.error('Error fetching data from JSONbin:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error fetching data from JSONbin', error: error.message })
    };
  }

  const itemsForPvScaling = [];
  const itemsArray = Object.values(data); // Use this for iteration and mapping

  // Calculate PV and prepare for scaling
  itemsArray.forEach(item => {
    // Ensure item is an object, skip if malformed (though Object.values should only return values)
    if (typeof item !== 'object' || item === null) return; 

    const price = parseFloat(item.price) || 0;
    const cost = parseFloat(item.cost) || 0;
    const gm = price - cost;
    
    const vendLog = Array.isArray(item.vendLog) ? item.vendLog : [];
    
    const windowStart = new Date(); 
    windowStart.setDate(windowStart.getDate() - PROFIT_WINDOW_DAYS);
    
    const recentVends = vendLog.filter(v => {
      try {
        if (v && v.ts) {
          return new Date(v.ts) >= windowStart;
        }
        return false;
      } catch (e) { 
        return false; 
      }
    });
    
    const vr = (PROFIT_WINDOW_DAYS > 0) ? recentVends.length / PROFIT_WINDOW_DAYS : 0;
    const pv = gm * vr;
    
    item.profitVelocity = pv; // This modifies the item within the 'data' object directly

    if (pv > 0) {
      itemsForPvScaling.push(item); // itemsForPvScaling will contain references to items in 'data'
    }
  });

  // Determine scaling parameters
  const allElos = itemsArray.map(item => (typeof item === 'object' && item !== null ? item.elo : 0) || 0);
  const minElo = allElos.length > 0 ? Math.min(...allElos) : 0;
  const maxElo = allElos.length > 0 ? Math.max(...allElos) : 0;
  
  // itemsForPvScaling already contains the relevant items with profitVelocity > 0
  const activePvs = itemsForPvScaling.map(item => item.profitVelocity);
  const minPV = activePvs.length > 0 ? Math.min(...activePvs) : 0;
  const maxPV = activePvs.length > 0 ? Math.max(...activePvs) : 0;

  // Calculate composite scores
  itemsArray.forEach(item => {
    if (typeof item !== 'object' || item === null) return;

    let scaledR = (maxElo === minElo) ? 0 : (( (typeof item === 'object' && item !== null ? item.elo : 0) || 0) - minElo) / (maxElo - minElo);
    scaledR = Math.max(0, Math.min(1, scaledR)); 
    
    let scaledV = 0;
    if (item.profitVelocity > 0) { 
      if (maxPV > minPV) {
        scaledV = (item.profitVelocity - minPV) / (maxPV - minPV);
      } else if (minPV === maxPV && item.profitVelocity === minPV) { 
        scaledV = 1;
      }
    }
    scaledV = Math.max(0, Math.min(1, scaledV)); 
    
    item.composite = (SCORING_WEIGHT_R * scaledR) + (SCORING_WEIGHT_V * scaledV); // Modifies item in 'data'
  });
  
  try {
    // Send the modified 'data' object (which contains items as properties)
    await axios.put(`https://api.jsonbin.io/v3/b/${BIN_ID}`, data, {
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': API_KEY
      }
    });
    console.log('Successfully recalculated and updated scores in JSONbin.');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Scores recalculated and updated successfully.' })
    };
  } catch (error) {
    console.error('Error updating data in JSONbin:', error.message, error.response ? error.response.data : '');
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error updating data in JSONbin', error: error.message, details: error.response ? error.response.data : null })
    };
  }
};
