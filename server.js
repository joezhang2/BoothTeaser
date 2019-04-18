
const express = require('express');
const app = express();
const port = 10000;

app.use('/', express.static('public'));

app.listen(port);