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

  let data; // Expecting an array of item objects
  try {
    const response = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': API_KEY }
    });
    // IMPORTANT CHANGE: Assuming response.data.record is the array of items
    // If the actual data is nested, e.g. response.data.record.items, this needs adjustment
    // For now, directly use response.data.record as per subtask's "expected to be an array"
    data = response.data.record; 

    if (!Array.isArray(data)) {
      console.error('Fetched data.record is not an array:', data);
      // If the root of the bin is the array, response.data itself might be the array.
      // Let's check if response.data is an array if response.data.record is not.
      if (Array.isArray(response.data)) {
        data = response.data;
      } else {
        return { statusCode: 500, body: JSON.stringify({ message: 'Fetched data format error: Expected an array of items.' }) };
      }
    }
  } catch (error) {
    console.error('Error fetching data from JSONbin:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error fetching data from JSONbin', error: error.message })
    };
  }

  const itemsForPvScaling = [];

  // Calculate PV and prepare for scaling
  data.forEach(item => {
    // Ensure item is an object, skip if malformed entry in array
    if (typeof item !== 'object' || item === null) return; 

    const price = parseFloat(item.price) || 0;
    const cost = parseFloat(item.cost) || 0;
    const gm = price - cost;
    
    const vendLog = Array.isArray(item.vendLog) ? item.vendLog : [];
    
    const windowStart = new Date(); // Create new Date object for windowStart
    windowStart.setDate(windowStart.getDate() - PROFIT_WINDOW_DAYS);
    
    const recentVends = vendLog.filter(v => {
      try {
        // Ensure vend timestamp and price are valid before processing
        if (v && v.ts) { // v.price is not used for filtering, only for potential future GM calculation per vend
          return new Date(v.ts) >= windowStart;
        }
        return false;
      } catch (e) { 
        // console.warn(`Invalid date string in vendLog for item ${item.name || 'Unknown'}: ${v.ts}`);
        return false; 
      }
    });
    
    const vr = (PROFIT_WINDOW_DAYS > 0) ? recentVends.length / PROFIT_WINDOW_DAYS : 0;
    const pv = gm * vr;
    
    item.profitVelocity = pv;

    if (pv > 0) {
      itemsForPvScaling.push(item);
    }
  });

  // Determine scaling parameters
  const allElos = data.map(item => (typeof item === 'object' && item !== null ? item.elo : 0) || 0);
  const minElo = allElos.length > 0 ? Math.min(...allElos) : 0;
  const maxElo = allElos.length > 0 ? Math.max(...allElos) : 0;
  
  const activePvs = itemsForPvScaling.map(item => item.profitVelocity);
  const minPV = activePvs.length > 0 ? Math.min(...activePvs) : 0;
  const maxPV = activePvs.length > 0 ? Math.max(...activePvs) : 0;

  // Calculate composite scores
  data.forEach(item => {
    if (typeof item !== 'object' || item === null) return;

    // Use subtask's scaledR calculation
    let scaledR = (maxElo === minElo) ? 0 : (( (typeof item === 'object' && item !== null ? item.elo : 0) || 0) - minElo) / (maxElo - minElo);
    scaledR = Math.max(0, Math.min(1, scaledR)); // Clamp to 0-1
    
    let scaledV = 0;
    if (item.profitVelocity > 0) { // Check item.profitVelocity, not pv which is out of scope
      if (maxPV > minPV) {
        scaledV = (item.profitVelocity - minPV) / (maxPV - minPV);
      } else if (minPV === maxPV && item.profitVelocity === minPV) { 
        // This covers:
        // 1. Single item in itemsForPvScaling (minPV=maxPV=item.profitVelocity) -> scaledV = 1
        // 2. Multiple items in itemsForPvScaling, all having the exact same profitVelocity -> scaledV = 1
        // If minPV is 0 (because activePvs was empty or all PVs in it were 0, which shouldn't happen due to pv > 0 check for itemsForPvScaling)
        // and item.profitVelocity is also 0, this path isn't taken due to item.profitVelocity > 0.
        scaledV = 1;
      }
    }
    scaledV = Math.max(0, Math.min(1, scaledV)); // Clamp to 0-1
    
    item.composite = (SCORING_WEIGHT_R * scaledR) + (SCORING_WEIGHT_V * scaledV);
  });
  
  try {
    // IMPORTANT CHANGE: Send the modified 'data' array directly
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
