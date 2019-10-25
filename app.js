const app = require('express')();
const http = require('http').createServer(app);
var io = require('socket.io')(http);
const PORT = process.env.PORT || 5000;
const bodyParser = require("body-parser");
var fs = require('fs');
var path = require('path');
var directoryPath = path.join(path.join(__dirname, 'views'), 'presentationSlides');

var gameData = [];

const public_files = [{"name": "leftArrow.png", "path": __dirname + "/public/images/left.png"},{"name": "rightArrow.png", "path": __dirname + "/public/images/right.png"}];

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

http.listen(PORT, function(){
    console.log('Listening on *:' + PORT);
});

io.on('connection', function (socket) {
    socket.on('startGamePls', function (data1) {
        if (socket.id===gameData[data1.pin].master.id){
            fs.readdir(directoryPath, function (err, files) {
                //handling error
                if (err) {
                    return console.log('Unable to scan directory: ' + err);
                }
                //listing all files using forEach
                fs.readFile(path.join(directoryPath, files[0]), function (err, data) {
                    if (err) throw err;

                    for (var i = 0;i<gameData[data1.pin].playerIds.length;i++){
                        gameData[data1.pin].playerIds[i].emit('slideData', {slide: data.toString('utf8')});
                        gameData[data1.pin].playerIds[i].emit('letTheGamesBegin');
                    }
                    gameData[data1.pin].master.emit('slideData', {slide: data.toString('utf8')});
                });
            });
        }
    });
    socket.on('slideUpdate', function (data1) {
        if (socket.id===gameData[data1.pin].master.id){
            fs.readdir(directoryPath, function (err, files) {
                //handling error
                if (err) {
                    return console.log('Unable to scan directory: ' + err);
                }
                //listing all files using forEach
                fs.readFile(path.join(directoryPath, files[data1.slideIndex]), function (err, data) {
                    if (err) throw err;

                    for (var i = 0;i<gameData[data1.pin].playerIds.length;i++){
                        gameData[data1.pin].playerIds[i].emit('slideData', {slide: data.toString('utf8')});
                    }
                    gameData[data1.pin].master.emit('slideData', {slide: data.toString('utf8')});
                });
            });
        }
    });
    socket.on('focusStateChange', function (data) {
        gameData[data.pin].master.emit('hereIsBigBoyUpdate', data);
    });
    socket.on('disconnect', function () {
        let STAHP = false;
        gameData.forEach(function (value, index, array) {
            if (STAHP) return;
            value.playerIds.forEach(function (value1, index1, array1) {
                if (STAHP) return;
                if (socket.id===gameData[index].master.id){
                    for (var i = 0;i<gameData[index].playerIds.length;i++){
                        gameData[index].playerIds[i].emit('masterLeftUs');
                        STAHP = true;
                    }
                    gameData.splice(index, 1);
                }else {
                    if (value1.id === socket.id) {
                        gameData[index].master.emit('nerdLeft_lolNoob', {lozerWhoLeft: gameData[index].players[index1]});
                        gameData[index].players.splice(index1, 1);
                        gameData[index].playerIds.splice(index1, 1);
                        STAHP = true;
                    }
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
                        fs.readdir(directoryPath, function (err, files) {
                            //handling error
                            if (err) {
                                return console.log('Unable to scan directory: ' + err);
                            }
                            socket.emit('statusUpdate', {value: "urOk.", slideLength: files.length});
                        });
                        return;
                    }
                }
            }else if (data.pin != null && data.name != null) {
                if (gameData[data.pin]!=null){
                    if (!(gameData[data.pin].players.includes(data.name))){
                        gameData[data.pin].players.push(data.name);
                        gameData[data.pin].playerIds.push(socket);
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

app.get('/public/*', function (req, res) {
    const name = req.url.replace("/public/", "");
    let correctPath = null;
    for (var i = 0;i<public_files.length;i++){
        if (public_files[i].name === name){
            correctPath = public_files[i].path;
            break;
        }
    }
    if (correctPath!=null){
        res.sendFile(correctPath);
    }else {
        res.sendStatus(404);
    }
});

app.get('/', function (req, res) {
    res.render("./pages/main.ejs");
});

app.get('/createGame', function (req, res) {
    fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }
        //listing all files using forEach
        let slides = "";
        files.forEach(function (file, index) {
            fs.readFile(path.join(directoryPath, file), function (err, data) {
                if (err) throw err;

                slides+=data + "\n";

                if (index===files.length-1){
                    res.render("./pages/gameHost.ejs", {slide: slides});
                }
            });
        });
    });
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
    fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }
        //listing all files using forEach
        let slides = "";
        files.forEach(function (file, index) {
            fs.readFile(path.join(directoryPath, file), function (err, data) {
                if (err) throw err;

                slides+=data + "\n";

                if (index===files.length-1){
                    res.render("./pages/game.ejs", {slide: slides});
                }
            });
        });
    });
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