
const express = require('express')
const app = express()
const port = 3000
const server = app.listen(port)
const io = require('socket.io')(server)
var __dirname = '/mnt/c/Users/petru/Documents/Code/eyesopen/client'


app.use(express.static('client'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
})


io.on('connection', (socket) => {
  console.log('a user connected');
  console.log(socket.id);
  socket.on("send", (string) => {
      console.log(string)
      // var message = "Sending to all players"
      // io.emit("recieve", message)
      var message2 = "Sending to everyoen except the sender"
      socket.broadcast.emit("recieve", message2)
  });
});
  
  var count = io.engine.clientsCount;
  // may or may not be similar to the count of Socket instances in the main namespace, depending on your usage
  var count2 = io.of("/").sockets.size;
  console.log(count)
  console.log(count2)
  
  
  // window.onload = function() {
  
  //   var display = document.querySelector('#time'),
  //       timer = new CountDownTimer(5);
  
  //   timer.onTick(format).onTick(restart).start();
  
  //   function restart() {
  //     if (this.expired()) {
  //       setTimeout(function() { timer.start(); }, 1000);
  //     }
  //   }
  
  //   function format(minutes, seconds) {
  //     minutes = minutes < 10 ? "0" + minutes : minutes;
  //     seconds = seconds < 10 ? "0" + seconds : seconds;
  //     display.textContent = minutes + ':' + seconds;
  //   }
  // };
  // function CountDownTimer(duration, granularity) {
  //   this.duration = duration;
  //   this.granularity = granularity || 1000;
  //   this.tickFtns = [];
  //   this.running = false;
  // }
  
  // CountDownTimer.prototype.start = function() {
  //   if (this.running) {
  //     return;
  //   }
  //   this.running = true;
  //   var start = Date.now(),
  //       that = this,
  //       diff, obj;
  
  //   (function timer() {
  //     diff = that.duration - (((Date.now() - start) / 1000) | 0);
  
  //     if (diff > 0) {
  //       setTimeout(timer, that.granularity);
  //     } else {
  //       diff = 0;
  //       that.running = false;
  //     }
  
  //     obj = CountDownTimer.parse(diff);
  //     that.tickFtns.forEach(function(ftn) {
  //       ftn.call(this, obj.minutes, obj.seconds);
  //     }, that);
  //   }());
  // };
  
  // CountDownTimer.prototype.onTick = function(ftn) {
  //   if (typeof ftn === 'function') {
  //     this.tickFtns.push(ftn);
  //   }
  //   return this;
  // };
  
  // CountDownTimer.prototype.expired = function() {
  //   return !this.running;
  // };
  
  // CountDownTimer.parse = function(seconds) {
  //   return {
  //     'minutes': (seconds / 60) | 0,
  //     'seconds': (seconds % 60) | 0
  //   };
  // };

