// Assume 'items' is a globally available array, loaded elsewhere.
// If not, this script might need adjustment on how 'items' is accessed.

function renderFinalSlotOptions() {
  // Ensure 'items' is available. If items are loaded asynchronously,
  // this function should be called after the data is ready.
  if (typeof items === 'undefined' || items === null) {
    console.error('Items data is not available for renderFinalSlotOptions.');
    return;
  }
  const g = items.filter(i=>[31,32,33,34].includes(i.id));
  const box = document.getElementById('contest-options');
  if (!box) {
    console.error('Element with ID "contest-options" not found.');
    return;
  }
  box.innerHTML=''; // Clear previous options
  g.forEach(i=>{
    const div=document.createElement('div');
    div.className='cursor-pointer border p-2 rounded';
    // Ensure i.image and i.name are available and not undefined
    div.innerHTML=`<img src="${i.image || 'images/default.png'}" class="h-20 mx-auto"><p>${i.name || 'Unnamed Item'}</p>`;
    div.onclick=()=>selectFinal(i.id, div);
    box.appendChild(div);
  });
}

let selectedFinal=null;

function selectFinal(id, div){
  selectedFinal=id;
  document.querySelectorAll('#contest-options div').forEach(d=>d.classList.remove('ring-4','ring-yellow-400'));
  div.classList.add('ring-4','ring-yellow-400');
  const submitButton = document.getElementById('submit-final-vote');
  if (submitButton) {
    submitButton.classList.remove('hidden');
  } else {
    console.error('Element with ID "submit-final-vote" not found.');
  }
}

// Ensure API object is defined, typically from api.js
// This event listener setup should be run after the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', () => {
  const submitVoteButton = document.getElementById('submit-final-vote');
  if (submitVoteButton) {
    submitVoteButton.onclick=()=> {
      if (selectedFinal === null) {
        alert('Please select an option to vote for.');
        return;
      }
      // Ensure 'items' is available for filtering losers
      if (typeof items === 'undefined' || items === null) {
        console.error('Items data is not available for submitting vote.');
        alert('Error: Item data not loaded. Cannot submit vote.');
        return;
      }
      const potentialLosers = [31,32,33,34].filter(x=>x!==selectedFinal);
      if (potentialLosers.length === 0) {
        alert('Error: Could not determine a losing option.');
        return;
      }
      const loser = potentialLosers[Math.floor(Math.random()*potentialLosers.length)];
      
      // Ensure API and API.vote are defined
      if (typeof API === 'undefined' || typeof API.vote !== 'function') {
          alert('API helper not found. Cannot submit vote.');
          return;
      }

      API.vote(selectedFinal, loser)
        .then(response => {
            // It's good practice to check if the response was OK
            if (response.ok || (response.status && response.status >= 200 && response.status < 300) || response.winner) { // check for FastAPI success or direct JSON
                alert('Vote logged—thank you!');
            } else {
                // Try to get more error info if possible
                response.json().then(err => {
                    alert('Failed to log vote: ' + (err.detail || 'Unknown error'));
                }).catch(() => {
                    alert('Failed to log vote and could not parse error details.');
                });
            }
        })
        .catch(error => {
            console.error('Error submitting vote:', error);
            alert('An error occurred while submitting your vote.');
        });
    };
  } else {
    // This might run before the HTML for "submit-final-vote" is parsed.
    // It's better to ensure this runs after the full DOM is ready and the button exists.
    // console.warn('Element with ID "submit-final-vote" not found at script load time.');
  }

  // Placeholder for where items are loaded:
  // Example: Assuming items are loaded via API.items() and then render functions are called.
  // This part needs to be integrated with the actual item loading logic in the main HTML/JS.
  // For now, this subtask focuses on creating elo.js content.
  // The main HTML should call `renderFinalSlotOptions()` after `items` are populated.
  // e.g.
  // API.items().then(loadedItems => {
  //   window.items = loadedItems; // Make items globally available or pass as needed
  //   renderEloComparisons(); // Assuming this is another function
  //   renderFinalSlotOptions(); // Call the function for the contest
  // });
});
