const app = require('express')();
const http = require('http').createServer(app);
const PORT = process.env.PORT || 5000;
const bodyParser = require("body-parser");

var gameData = [];

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

http.listen(PORT, function(){
    console.log('Listening on *:' + PORT);
});

app.get('/', function (req, res) {
    res.render("./pages/main.ejs");
});

app.get('/joinGame', function (req, res) {
    res.render("./pages/joinGame.ejs");
});

app.post('/gameExists', function (req, res) {
    res.send(!(gameData[req.body.id]===null));
});