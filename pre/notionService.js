const response = await fetch(`${API_URL}/api/notion/query`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ databaseId }),
  mode: 'cors',
}); 