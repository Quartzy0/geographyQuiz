const app = require('express')();
const http = require('http').createServer(app);
var io = require('socket.io')(http);
const PORT = process.env.PORT || 5000;
const bodyParser = require("body-parser");
var fs = require('fs');
var path = require('path');
var directoryPath = path.join(path.join(__dirname, 'views'), 'presentationSlides');

var gameData = [];

const public_files = [{"name": "leftArrow.png", "path": __dirname + "/public/images/left.png"},{"name": "rightArrow.png", "path": __dirname + "/public/images/right.png"},{"name": "UAE-Map.jpg", "path": __dirname + "/public/images/UAEMap.gif"},{"name": "UAE-Map_2.png", "path": __dirname + "/public/images/UAEMap_2.png"},{"name": "Mohmad.png", "path": __dirname + "/public/images/Mohmad.png"},
    {"name": "potugalflag.png", "path": __dirname + "/public/images/portugalflag.png"},{"name": "dutch.png", "path": __dirname + "/public/images/dutch.png"},{"name": "britn.png", "path": __dirname + "/public/images/britn.png"},{"name": "moneymoney.png", "path": __dirname + "/public/images/moneymoney.png"},{"name": "oilMoneyz.png", "path": __dirname + "/public/images/oilMoneyz.png"},
    {"name": "gemos.png", "path": __dirname + "/public/images/gemos.png"},{"name": "desertos.jpg", "path": __dirname + "/public/images/desertos.jpg"},{"name": "sandcatos.jpg", "path": __dirname + "/public/images/sandcatos.jpg"},{"name": "socno_meso.jpg", "path": __dirname + "/public/images/socno_meso.jpg"},{"name": "seecow.jpg", "path": __dirname + "/public/images/seecow.jpg"},
    {"name": "cooltre.jpg", "path": __dirname + "/public/images/cooltre.jpg"},{"name": "coolflowr.jpg", "path": __dirname + "/public/images/coolflowr.jpg"},{"name": "kk.jpg", "path": __dirname + "/public/images/kk.jpg"},{"name": "poop.jpg", "path": __dirname + "/public/images/poop.jpg"}
];

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

http.listen(PORT, function(){
    console.log('Listening on *:' + PORT);
});

io.on('connection', function (socket) {
    socket.on('myRating', function (data) {
        if (getGameObjFromPin(data.pin)!=null){
            getGameObjFromPin(data.pin).master.emit('feedbackCame', {rating: data.rating});
        }
    });
    socket.on('surveyTime', function (data) {
        let gameObjFromPin = getGameObjFromPin(data.pin);
        if (gameObjFromPin){
            for (let i = 0;i<gameObjFromPin.playerIds.length;i++){
                gameObjFromPin.playerIds[i].emit('feedbackTime');
            }
        }
    });
    socket.on('answeredQuestion', function (data) {
        let index = getGameObjFromPin(data.pin).playerScoreData.map(function (d) { return d['name'] }).indexOf(data.name);
        getGameObjFromPin(data.pin).playerScoreData[index].recentAnswer = data.answer;

        let playerScoreDatum = getGameObjFromPin(data.pin).playerScoreData[index];
        let canProceed = true;
        for (var i = 0;i<playerScoreDatum;i++){
            if (playerScoreDatum.recentAnswer===-1){
                canProceed = false;
            }
        }

        if (canProceed){
            clearTimeout(getGameObjFromPin(data.pin).questionTimeout);
            const questionData = getGameObjFromPin(data.pin).questionData[data.questionIndex];
            let index;
            let isCorrect;
            for (let i = 0; i<getGameObjFromPin(data.pin).playerIds.length; i++){
                index = getGameObjFromPin(data.pin).playerScoreData.map(function (d) { return d['id'] }).indexOf(getGameObjFromPin(data.pin).playerIds[i].id);
                const recentAnswer = getGameObjFromPin(data.pin).playerScoreData[index].recentAnswer;
                if (recentAnswer!==-1) {
                    isCorrect = questionData.answers[recentAnswer].correct;
                }else {
                    isCorrect = false;
                }
                let score = 0;
                if (isCorrect){
                    getGameObjFromPin(data.pin).playerScoreData[index].streak++;
                    if (questionData.givesPoints) {
                        score = 500*((getGameObjFromPin(data.pin).playerScoreData[index].streak/10)+1);
                        getGameObjFromPin(data.pin).playerScoreData[index].score += score;
                    }
                }else {
                    getGameObjFromPin(data.pin).playerScoreData[index].streak = 0;
                }
                getGameObjFromPin(data.pin).playerIds[i].emit('questionEnd', {correct: isCorrect, questionIndex: data.questionIndex, scoreGained: score, streak: getGameObjFromPin(data.pin).playerScoreData[index].streak});
                getGameObjFromPin(data.pin).playerScoreData[index].recentAnswer = -1;
            }
            getGameObjFromPin(data.pin).playerScoreData.sort((a, b) => b.score - a.score);
            let answer = questionData.answers[questionData.answers.map(function (d) { return d['correct'] }).indexOf(true)];
            getGameObjFromPin(data.pin).master.emit('questionEnd', {places: getGameObjFromPin(data.pin).playerScoreData, correctAnswer: answer});
        }
    });
    socket.on('quizTime', function (data) {
        if (getGameObjFromPin(data.pin).master.id===socket.id){
            const questionData = getGameObjFromPin(data.pin).questionData[data.questionIndex];
            if (questionData==null){
                return;
            }
            for (let i = 0; i<getGameObjFromPin(data.pin).playerIds.length; i++){
                getGameObjFromPin(data.pin).playerIds[i].emit('questionData', {questionIndex: data.questionIndex, questionText: questionData.title, answers: questionData.answers, duration: questionData.duration, questionAmount: getGameObjFromPin(data.pin).questionData.length});
            }
            getGameObjFromPin(data.pin).master.emit('questionData', {questionIndex: data.questionIndex, questionText: questionData.title, answers: questionData.answers, duration: questionData.duration, questionAmount: getGameObjFromPin(data.pin).questionData.length});
            getGameObjFromPin(data.pin).questionTimeout = setTimeout(function () {
                let index;
                let isCorrect;
                for (let i = 0; i<getGameObjFromPin(data.pin).playerIds.length; i++){
                    index = getGameObjFromPin(data.pin).playerScoreData.map(function (d) { return d['id'] }).indexOf(getGameObjFromPin(data.pin).playerIds[i].id);
                    const recentAnswer = getGameObjFromPin(data.pin).playerScoreData[index].recentAnswer;
                    if (recentAnswer!==-1) {
                        isCorrect = questionData.answers[recentAnswer].correct;
                    }else {
                        isCorrect = false;
                    }
                    let score = 0;
                    if (isCorrect){
                        getGameObjFromPin(data.pin).playerScoreData[index].streak++;
                        if (questionData.givesPoints) {
                            score = 500*((getGameObjFromPin(data.pin).playerScoreData[index].streak/10)+1);
                            getGameObjFromPin(data.pin).playerScoreData[index].score += score;
                        }
                    }else {
                        getGameObjFromPin(data.pin).playerScoreData[index].streak = 0;
                    }
                    getGameObjFromPin(data.pin).playerIds[i].emit('questionEnd', {correct: isCorrect, questionIndex: data.questionIndex, scoreGained: score, streak: getGameObjFromPin(data.pin).playerScoreData[index].streak});
                    getGameObjFromPin(data.pin).playerScoreData[index].recentAnswer = -1;
                }
                getGameObjFromPin(data.pin).playerScoreData.sort((a, b) => b.score - a.score);
                let answer = questionData.answers[questionData.answers.map(function (d) { return d['correct'] }).indexOf(true)];
                getGameObjFromPin(data.pin).master.emit('questionEnd', {places: getGameObjFromPin(data.pin).playerScoreData, correctAnswer: answer});
            }, questionData.duration * 1000);
        }
    });
    socket.on('startGamePls', function (data1) {
        if (socket.id===getGameObjFromPin(data1.pin).master.id){
            fs.readdir(directoryPath, function (err, files) {
                //handling error
                if (err) {
                    return console.log('Unable to scan directory: ' + err);
                }
                //listing all files using forEach
                fs.readFile(path.join(directoryPath, files[0]), function (err, data) {
                    if (err) throw err;

                    for (var i = 0;i<getGameObjFromPin(data1.pin).playerIds.length;i++){
                        getGameObjFromPin(data1.pin).playerIds[i].emit('slideData', {slide: data.toString('utf8')});
                        getGameObjFromPin(data1.pin).playerIds[i].emit('letTheGamesBegin');
                    }
                    getGameObjFromPin(data1.pin).master.emit('slideData', {slide: data.toString('utf8')});
                });
            });
        }
    });
    socket.on('slideUpdate', function (data1) {
        if (socket.id===getGameObjFromPin(data1.pin).master.id){
            fs.readdir(directoryPath, function (err, files) {
                //handling error
                if (err) {
                    return console.log('Unable to scan directory: ' + err);
                }
                //listing all files using forEach
                fs.readFile(path.join(directoryPath, files[data1.slideIndex]), function (err, data) {
                    if (err) throw err;

                    for (var i = 0;i<getGameObjFromPin(data1.pin).playerIds.length;i++){
                        getGameObjFromPin(data1.pin).playerIds[i].emit('slideData', {slide: data.toString('utf8')});
                    }
                    getGameObjFromPin(data1.pin).master.emit('slideData', {slide: data.toString('utf8')});
                });
            });
        }
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
                    if (getGameObjFromPin(data.pin) != null) {
                        getGameObjFromPin(data.pin).master = socket;
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
                if (getGameObjFromPin(data.pin)!=null){
                    if (!(getGameObjFromPin(data.pin).players.includes(data.name))){
                        getGameObjFromPin(data.pin).players.push(data.name);
                        getGameObjFromPin(data.pin).playerIds.push(socket);
                        getGameObjFromPin(data.pin).playerScoreData.push({name: data.name, id: socket.id, score: 0, recentAnswer: -1, streak: 0});
                        socket.emit('statusUpdate', {value: "urOk."});
                        getGameObjFromPin(data.pin).master.emit('guyJoined', {name: data.name});
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
        if (getGameObjFromPin(req.body.id) != null) {
            res.send(!(getGameObjFromPin(req.body.id).players.includes(req.body.name)));
        }
    }else {
        res.send(getGameObjFromPin(req.body.id) != null);
    }
});

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getGameObjFromPin(pin){
    let index = gameData.map(function (d) { return d['pin'] }).indexOf(parseInt(pin));
    return gameData[index];
}

app.post('/createSession', function (req, res) {
    let randomInt = getRandomInt(0, 9999999);
    while (getGameObjFromPin(randomInt)!=null){
        randomInt = getRandomInt(0, 9999999);
    }

    fs.readFile(path.join(__dirname, 'questions.json'), function (err, data) {
        if (err) throw err;

        gameData.push({players: [], playerIds: [], questionData: JSON.parse(data.toString('utf8')), playerScoreData: [], pin: randomInt});
        res.send(randomInt + '');
    });
});