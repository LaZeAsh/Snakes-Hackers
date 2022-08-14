const app=require('express');
const socket=require('socket.io');
const randomstring=require('randomstring');

const express=app();
const cohere = require('cohere-ai');
cohere.init('np9oN2aeMfu3AOpGwG8nT7tJe4gjWeDHhACAxpHf');
const server=express.listen(4000,()=>{
    console.log("server started at http://localhost:4000");
})

express.use(app.static('public'));

const io=socket(server);

//ALL player info
let players={};
users = [];
//GAME VARIABLES
let choice1="",choice2="";


io.on("connection",(socket)=>{
    console.log("connection established");

    //Create Game Listener
    socket.on("createGame",(data)=>{
        const roomID=randomstring.generate({length: 4});       
        socket.join(roomID);        
        players[roomID]=data.name;
        socket.emit("newGame",{roomID:roomID});
    })

    socket.on('setUsername', function(data){
        
           users.push(data);
           socket.emit('userSet', {username: data});
        
     })

    //Join Game Listener
    socket.on("joinGame",(data)=>{        
        socket.join(data.roomID);
        socket.to(data.roomID).emit("player2Joined",{p2name: data.name,p1name:players[data.roomID]});
        socket.emit("player1Joined",{p2name:players[data.roomID],p1name:data.name});
    })
    socket.on('msg', function(data){
        //Send message to everyone
        io.sockets.emit('newmsg', data);
     })

    //Listener to Player 1's Choice
    socket.on("choice1", (data)=> {
        choice1 = data.choice;
        console.log(choice1, choice2);
        if (choice2 != "") {
            result(data.roomID);
        }
    });
    //Listener to Player 2's Choice
    socket.on("choice2", (data)=> {
        choice2 = data.choice;
        console.log(choice1, choice2);
        if (choice1 != "") {
            result(data.roomID);
        }
    });
})

io.on('connection', socket => {
    socket.on('new-user', name => {
      users[socket.id] = name
      socket.broadcast.emit('user-connected', name)
    })
    socket.on('send-chat-message', async(message) => {
        const response = await cohere.classify({ 
            model: 'medium', 
            taskDescription: '', 
            outputIndicator: '', 
            inputs: [message], 
            examples: [{"text": "The order came 5 days early", "label": "positive"}, {"text": "The item exceeded my expectations", "label": "positive"}, {"text": "I ordered more for my friends", "label": "positive"}, {"text": "I would buy this again", "label": "positive"}, {"text": "I would recommend this to others", "label": "positive"}, {"text": "The package was damaged", "label": "negative"}, {"text": "The order is 5 days late", "label": "negative"}, {"text": "The order was incorrect", "label": "negative"}, {"text": "I want to return my item", "label": "negative"}, {"text": "The item\'s material feels low quality", "label": "negative"}, {"text": "Fuck you", "label": "negative"}, {"text": "You are an idiot", "label": "negative"}, {"text": "You are very dumb you don\'t know how to play", "label": "negative"}] 
        }); 
        let output = JSON.stringify(response.body.classifications[0].prediction);
        console.log(output);
       socket.broadcast.emit('chat-message', { message: message, name: users[socket.id] })
    })
    socket.on('disconnect', () => {
      socket.broadcast.emit('user-disconnected', users[socket.id])
      delete users[socket.id]
    })})

//Function to calculate winner
const getWinner=(p, c)=>  {
    if (p === c) {
        return "draw";
    } else if (p === "Rock") {
        if (c === "Paper") {
            return false;
        } else {
            return true;
        }
    } else if (p === "Paper") {
        if (c === "Scissor") {
            return false;
        } else {
            return true;
        }
    } else if (p === "Scissor") {
        if (c === "Rock") {
            return false;
        } else {
            return true;
        }
    }
}
//Function to do executed after gettin both choices
const result=(roomID)=> {
    var winner = getWinner(choice1, choice2);
    io.sockets.to(roomID).emit("result", {
        winner: winner
    });
    choice1 = "";
    choice2 = "";
}