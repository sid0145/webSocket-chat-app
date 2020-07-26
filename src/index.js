const express= require('express')
const http=require('http')
const path= require('path')
const socketio=require('socket.io')
const Filter= require('bad-words')
const { generateMessage,generateLocationMessage }=require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom  }= require('./utils/users')


const port=process.env.PORT || 3000
const publicDir=path.join(__dirname, "../public")


const app=express()
//joining the static directory with exprss middleware
app.use(express.static(publicDir))


const server= http.createServer(app)
const io=socketio(server)


io.on('connection', (socket)=>{
    socket.on('join',(options, cb)=>{
      const {error, user} =addUser({id: socket.id, ...options})
      if(error){
          return cb(error)
      }
        socket.join(user.room)
        socket.emit('updated',generateMessage("me",'welcome'))
        //this message will show to everybody except this user.
        socket.broadcast.to(user.room).emit('updated',generateMessage( "me",`${user.username} has joined!`))
       
        io.to(user.room).emit('roomData', {
            room:user.room,
            users:getUsersInRoom(user.room)
        })

        cb()
    })

    socket.on('sendMessage',(message, cb)=>{

        const user=getUser(socket.id)
        const filter=new Filter()
        if(filter.isProfane(message)){
            return cb("sid says message is not allowed")
        }
        io.to(user.room).emit('updated', generateMessage(user.username,message))
        cb()
    })
    socket.on('sendLocation', (coords, cb)=>{
        const user=getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage( user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        cb()
    })
    socket.on('disconnect', ()=>{
       const user= removeUser(socket.id)
        if(user){
        io.to(user.room).emit('updated', generateMessage(user.username,`${user.username} has left!`))
        io.to(user.room).emit('roomData', {
            room:user.room,
            users:getUsersInRoom(user.room)
        })
        } 
    })
})
server.listen(port, ()=>{
    console.log(`server started at ${port}`)
})