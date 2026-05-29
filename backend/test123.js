const mqtt= require('mqtt')


const options={

    clientId:'007JamesBond',
    clean:false,
    qos: 2,
}


const client=mqtt.connect('mqtt://10.24.55.175:1883', options )

client.on('connect',()=>{
    console.log('Connected to broker at mqtt://localhost:1883')

    client.subscribe('vitt/mca/updates',{qos:2},(err)=>{
        if(!err){
            console.log('Subscribed to vitt/mca/updates');
        }else{
            console.log("error")
        }
    })
})

client.on('message',(topic,message)=>{
    console.log(`Topic:${topic} | Message:${message.toString()}`)
    message=JSON.parse(message)
    if(message["flag"])
    {
        console.log('Functionality of Message to be sent here')
        
    }
})