const app = require('express')();
const http = require('http').createServer(app);
var io = require('socket.io')(http);
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

io.on('connection', function (socket) {
    socket.on('disconnect', function () {
        gameData.forEach(function (value, index, array) {
            value.playerIds.forEach(function (value1, index1, array1) {
                if (value1===socket.id){
                    gameData[index].master.emit('nerdLeft_lolNoob', {lozerWhoLeft: gameData[index].players[index1]});
                    gameData[index].players.splice(index1, 1);
                    gameData[index].playerIds.splice(index1, 1);
                }
            });
        });
    });
    socket.on('myIdentificationIsHere', function (data) {
        if (data!=null) {
            if (data.iAmMaster===true || data.iAmMaster==="true"){
                if (data.pin != null) {
                    if (gameData[data.pin] != null) {
                        gameData[data.pin].master = socket;
                        socket.emit('statusUpdate', {value: "urOk."});
                        return;
                    }
                }
            }else if (data.pin != null && data.name != null) {
                if (gameData[data.pin]!=null){
                    if (!(gameData[data.pin].players.includes(data.name))){
                        gameData[data.pin].players.push(data.name);
                        gameData[data.pin].playerIds.push(socket.id);
                        socket.emit('statusUpdate', {value: "urOk."});
                        gameData[data.pin].master.emit('guyJoined', {name: data.name});
                        return;
                    }
                }
            }
        }
        socket.emit('statusUpdate', {value: "nam/pin not ok."});
    });
});

app.get('/', function (req, res) {
    res.render("./pages/main.ejs");
});

app.get('/createGame', function (req, res) {
    res.render("./pages/createGame.ejs");
});

app.post('/checkGameSession', function (req, res) {
    if (req.body.name!=null){
        if (gameData[req.body.id] != null) {
            res.send(!(gameData[req.body.id].players.includes(req.body.name)));
        }
    }else {
        res.send(gameData[req.body.id] != null);
    }
});

app.get('/game', function (req, res) {
    res.render('./pages/game.ejs');
});

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

app.post('/createSession', function (req, res) {
    let randomInt = getRandomInt(0, 9999999);
    while (gameData[randomInt]!=null){
        randomInt = getRandomInt(0, 9999999);
    }
    gameData[randomInt] = {players: [], playerIds: [], topic: "Select"};
    res.send(randomInt + '');
});