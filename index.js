const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// In-memory storage for logs
let appLogs = [];

// 1. RECEIVE Logs (From App)
app.post('/log', (req, res) => {
    const { clientId, level, message, timestamp } = req.body;

    // Store the log
    appLogs.push({ clientId, level, message, timestamp });

    // Keep memory clean (limit to last 2000 logs)
    if (appLogs.length > 2000) appLogs.shift();

    // Optional: Print to server terminal
    console.log(`[${clientId}] ${message}`);
    res.sendStatus(200);
});

// 2. VIEW Logs (Web Dashboard)
app.get('/dashboard', (req, res) => {
    // We don't do filtering here; we let the HTML page handle it
    // so the auto-refresh logic is easier in the browser.
    res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Live Log Monitor</title>
        <style>
          body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 20px; }
          h2 { border-bottom: 1px solid #555; padding-bottom: 10px; }
          .log-entry { border-bottom: 1px solid #333; padding: 6px 0; display: flex; }
          .time { color: #888; margin-right: 10px; min-width: 90px; }
          .client { color: #4ec9b0; margin-right: 15px; font-weight: bold; min-width: 100px; }
          .level-info { color: #9cdcfe; }
          .level-error { color: #f48771; }
          .status-bar { background: #333; padding: 10px; margin-bottom: 20px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="status-bar">
          <span id="status-text">Waiting...</span>
        </div>

        <div id="logs-container"></div>

        <script>
          // 1. Get 'id' from URL query string (e.g., ?id=user_123)
          const urlParams = new URLSearchParams(window.location.search);
          const targetClientId = urlParams.get('id');

          const statusText = document.getElementById('status-text');
          
          if (targetClientId) {
            statusText.innerText = "Viewing logs for Client ID: " + targetClientId;
          } else {
            statusText.innerText = "Viewing logs for ALL clients (Add ?id=XYZ to URL to filter)";
          }

          async function fetchAndRender() {
            try {
              // Fetch all logs from server
              const res = await fetch('/api/logs');
              const allLogs = await res.json();
              
              const container = document.getElementById('logs-container');
              container.innerHTML = ''; // Clear old logs

              // 2. Filter logs based on URL param
              const filteredLogs = targetClientId 
                ? allLogs.filter(log => log.clientId === targetClientId)
                : allLogs;

              // 3. Render
              if (filteredLogs.length === 0) {
                container.innerHTML = '<div style="color:#777">No logs found yet...</div>';
              }

              // Show newest first
              filteredLogs.reverse().forEach(log => {
                const div = document.createElement('div');
                div.className = 'log-entry';
                
                // Colorize based on level
                const levelClass = log.level === 'error' ? 'level-error' : 'level-info';

                div.innerHTML = \`
                  <span class="time">\${log.timestamp}</span>
                  <span class="client">[\${log.clientId}]</span>
                  <span class="\${levelClass}">\${log.message}</span>
                \`;
                container.appendChild(div);
              });

            } catch (err) {
              console.error(err);
            }
          }

          // Initial load + Auto-refresh every 1 second
          fetchAndRender();
          setInterval(fetchAndRender, 1000);
        </script>
      </body>
    </html>
  `);
});

// 3. API Data Endpoint
app.get('/api/logs', (req, res) => {
    res.json(appLogs);
});

app.listen(PORT, () => console.log(`Dashboard running at http://localhost:${PORT}/dashboard`));
