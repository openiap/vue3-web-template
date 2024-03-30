const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

console.log("Serving from " + path.join(__dirname, 'dist'));

// Function to set no cache headers
const setNoCache = (res, path) => {
    if (express.static.mime.lookup(path) === 'text/html') {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
};

app.use(express.static(path.join(__dirname, 'dist'), { setHeaders: setNoCache }));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'), {
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });
});

app.listen(port, () => {
    console.log('Server started on port ' + port);
});
